/* we expect "data" to have the form:
    {
        scraperRunRefId: 123,
        locationRefId: 234,
    }

DB structure:

(for a location, when we first noticed appointments were there, and then when we noticed they were gone)
appointmentAlerts: {
    locationRef,
    firstScraperRunRef,
    lastScraperRunRef,
    startTime,
}

(for an alert, what zip codes we have texted and when)
appointmentAlertBatchZips: {
    appointmentAlertRef,
    zipCode,
    count,
}
*/

const { sendSlackMsg } = require("../lib/slack");
const { sendTweet } = require("../lib/twitter");
const dbUtils = require("../lib/db/utils");
const dotenv = require("dotenv");
const faunadb = require("faunadb"),
    fq = faunadb.query;
const moment = require("moment");
const scraperUtils = require("../lib/db/scraper_data");

const AWS = require("aws-sdk");
const { Lambda } = require("faunadb");
const lambda = new AWS.Lambda();

dotenv.config();

const alerts = {
    // How many appointments we must find to consider mass-alerting
    APPOINTMENT_NUMBER_THRESHOLD: () => 25,
    // How many appointments we must find to consider alerting at all
    SMALL_APPOINTMENT_NUMBER_THRESHOLD: () => 3,
    // How many minutes must pass between new alerts for the same location
    REPEAT_ALERT_TIME: () => 20,
    // exported functions:
    activeAlertExists,
    aggregateAvailability,
    getActiveAlertRefId,
    getChildData,
    getLastAlertStartTime,
    handleGroupAlerts,
    handleIndividualAlert,
    handleIndividualAlerts,
    handler,
    massAlertAlreadySent,
    mergeData,
    publishGroupAlert,
    runAlerts,
    setInactiveAlert,
    setMassAlert,
    setUpNewAlert,
};

module.exports = alerts;

async function activeAlertExists(locationRefId) {
    /* search if there's an entry in appointmentAlerts for this location
     * with a null lastScraperRunRef
     */
    return !!(await alerts.getActiveAlertRefId(locationRefId));
}

async function getActiveAlertRefId(locationRefId) {
    return dbUtils.faunaQuery(
        fq.If(
            // If there is a recent alert,
            fq.Exists(
                fq.Match(
                    "appointmentAlertsByLocationRefSortByStartTime",
                    fq.Ref(fq.Collection("locations"), locationRefId)
                )
            ),
            fq.Let(
                {
                    alert: fq.Get(
                        fq.Match(
                            "appointmentAlertsByLocationRefSortByStartTime",
                            fq.Ref(fq.Collection("locations"), locationRefId)
                        )
                    ),
                },
                fq.If(
                    // And if the lastScraperRunRef is null,
                    fq.IsNull(
                        fq.Select(
                            ["data", "lastScraperRunRef"],
                            fq.Var("alert"),
                            null
                        )
                    ),
                    // Return the alert's ID.
                    fq.Select(["ref", "id"], fq.Var("alert")),
                    // Otherwise return null.
                    null
                )
            ),
            null
        )
    );
}

async function massAlertAlreadySent(locationRefId) {
    return dbUtils
        .faunaQuery(
            fq.Get(
                fq.Match(
                    "appointmentAlertsByLocationRefSortByStartTime",
                    fq.Ref(fq.Collection("locations"), locationRefId)
                )
            )
        )
        .then((alert) => !!alert.data.massAlertScraperRunRef);
}

async function setInactiveAlert(locationRefId, scraperRunRefId) {
    /* find the entry in appointmentAlerts for this location with a null
     * lastScraperRunRef, and set lastScraperRunRef to scraperRunRef
     */
    const id = await alerts.getActiveAlertRefId(locationRefId);
    if (!id) {
        throw Error(`No active alert found for location ${locationRefId}!`);
    }

    await dbUtils.faunaQuery(
        fq.Update(fq.Ref(fq.Collection("appointmentAlerts"), id), {
            data: {
                lastScraperRunRef: fq.Ref(
                    fq.Collection("scraperRuns"),
                    scraperRunRefId
                ),
            },
        })
    );
    return id;
}

async function getLastAlertStartTime(locationRefId) {
    /* find the entry in appointmentAlerts for this location with
     * the lastScraperRunRef with the latest TS
     */
    const nsTimestamp = await dbUtils.faunaQuery(
        fq.Select(
            ["data", "startTime"],
            fq.If(
                fq.Exists(
                    fq.Match(
                        "appointmentAlertsByLocationRefSortByStartTime",
                        fq.Ref(fq.Collection("locations"), locationRefId)
                    )
                ),
                fq.Get(
                    fq.Match(
                        "appointmentAlertsByLocationRefSortByStartTime",
                        fq.Ref(fq.Collection("locations"), locationRefId)
                    )
                ),
                {
                    // If we don't find a match, there has never been an alert for this location.
                    // For ease of use, pretend there was one on Jan 1 2021.
                    data: { startTime: fq.Time(moment("2021-01-01").format()) },
                }
            )
        )
    );
    return moment(nsTimestamp.value);
}

async function setUpNewAlert(
    locationRefId,
    scraperRunRefId,
    setMassAlertScraperRunRef
) {
    // create a new entry in appointmentAlerts with locationRef and firstScraperRunRef set to scraperRunRef.
    const record = await dbUtils.faunaQuery(
        fq.Create(fq.Collection("appointmentAlerts"), {
            data: {
                locationRef: fq.Ref(fq.Collection("locations"), locationRefId),
                firstScraperRunRef: fq.Ref(
                    fq.Collection("scraperRuns"),
                    scraperRunRefId
                ),
                massAlertScraperRunRef: setMassAlertScraperRunRef
                    ? fq.Ref(fq.Collection("scraperRuns"), scraperRunRefId)
                    : null,
                startTime: fq.Now(),
            },
        })
    );

    return record.ref.id;
}

async function runAlerts(
    locationRefId,
    bookableAppointmentsFound,
    availabilityWithNoNumbers,
    parentIsChain,
    sendMassAlert,
    sendRegularAlert
) {
    const location = await dbUtils
        .retrieveItemByRefId("locations", locationRefId)
        .then((res) => res.data);

    let message;
    if (bookableAppointmentsFound) {
        message = `${bookableAppointmentsFound} appointments available at ${location.name} in ${location.address.city}. Visit https://macovidvaccines.com for more information and to book.`;
    } else if (availabilityWithNoNumbers) {
        message = `Appointments available at ${location.name} in ${location.address.city}. Visit https://macovidvaccines.com for more information and to book.`;
    } else {
        console.error(
            `runAlerts was called for location ref ${locationRefId} but no appointments were passed in`
        );
    }

    const promises = [];
    if (message) {
        if (sendMassAlert && !parentIsChain) {
            promises.push(sendTweet(message));
        }
        if (sendRegularAlert) {
            // always send slack - this is just for monitoring/debugging temporarily
            // if (!parentIsChain) {
            promises.push(sendSlackMsg("bot", message));
            // }
            // always send texts/emails on a per-location basis.
            promises.push(
                sendTextsAndEmails(
                    [
                        {
                            latitude: location.latitude,
                            longitude: location.longitude,
                        },
                    ],
                    bookableAppointmentsFound || 1,
                    message
                )
            );
        }
    }
    // log any errors without failing.
    return Promise.all(promises).catch(console.error);
}

async function sendTextsAndEmails(locs, numberAppointments, message) {
    if (process.env.NODE_ENV === "production") {
        return new Promise((resolve, reject) =>
            lambda.invoke(
                {
                    FunctionName: process.env.PINPOINTFUNCTIONNAME,
                    InvocationType: "Event",
                    Payload: JSON.stringify({
                        locations: locs,
                        numberAppointmentsFound: numberAppointments,
                        message,
                    }),
                },
                (err, data) => {
                    if (err) {
                        console.error(`Pinpoint error: ${err}`);
                        reject(err);
                    } else {
                        console.log(
                            `Pinpoint request successful. response: ${JSON.stringify(
                                data
                            )}`
                        );
                        resolve(data);
                    }
                }
            )
        );
    } else {
        console.log(
            `would send text alerts with arguments: ${JSON.stringify({
                locations: locs,
                numberAppointmentsFound: numberAppointments,
                message,
            })}`
        );
    }
}

async function publishGroupAlert(
    locationName,
    locationCities,
    locationLatLongs,
    bookableAppointmentsFound,
    availabilityWithNoNumbers,
    sendMassAlert,
    sendRegularAlert
) {
    if (!bookableAppointmentsFound && !availabilityWithNoNumbers) {
        throw new Error(
            "group alert requested publishing without any appointments available!"
        );
    }
    const sortedLocationCities = locationCities.sort();
    let joinedLocations = "";
    if (sortedLocationCities.length === 1) {
        joinedLocations = sortedLocationCities[0];
    } else if (sortedLocationCities.length === 2) {
        joinedLocations = sortedLocationCities.join(" and ");
    } else {
        const last = sortedLocationCities.pop();
        joinedLocations = `${sortedLocationCities.join(", ")}, and ${last}`;
    }

    // keep it short for Twitter's sake.
    if (joinedLocations.length > 230) {
        joinedLocations = "across Massachusetts";
    } else {
        joinedLocations = "in " + joinedLocations;
    }

    const locationClause = `${locationName}${
        sortedLocationCities.length > 1 ? " locations" : ""
    }`;

    const locationMessage = `${locationClause} ${joinedLocations}`;

    // we assume the "else" case is when availabilityWithNoNumbers is true; we pass it through to this function to be explicit.
    const appointmentsMessage = bookableAppointmentsFound
        ? `${bookableAppointmentsFound} appointments available`
        : `Appointments available`;

    const message = `${appointmentsMessage} at ${locationMessage}. Visit https://macovidvaccines.com for more details and to sign up.`;

    const promises = [];
    if (sendMassAlert) {
        promises.push(sendTweet(message));
    }
    if (sendRegularAlert) {
        promises.push(sendSlackMsg("bot", message));
        // don't send out texts/emails for bundled-up locations. We always send these out individually.
        // leaving this commented out for posterity/JIC.
        /* promises.push(
            sendTextsAndEmails(
                locationLatLongs,
                Math.max(bookableAppointmentsFound || 0, locationCities.length)
            ),
            message
        ); */
    }
    return Promise.all(promises).catch(console.err);
}

async function handleGroupAlerts({
    parentLocation,
    parentScraperRunRefId,
    locations,
}) {
    /* ONLY ALERT FOR CHAIN LOCATIONS */
    if (parentLocation.data.isChain) {
        // 1. get total availability
        let bookableAppointmentsFound = 0;
        let availabilityWithNoNumbers = false;
        let locationCities = [];
        let locationLatLongs = [];
        for (const location of locations) {
            let locationBookableAppointmentsFound = 0;
            let locationAvailabilityWithNoNumbers = false;
            for (const appointment of location.appointments || []) {
                locationBookableAppointmentsFound +=
                    appointment.data?.numberAvailable || 0;
                locationAvailabilityWithNoNumbers =
                    locationAvailabilityWithNoNumbers ||
                    !!appointment.data?.availabilityWithNoNumbers;
            }
            if (
                locationBookableAppointmentsFound ||
                locationAvailabilityWithNoNumbers
            ) {
                if (
                    !locationCities.includes(
                        location.location.data?.address?.city
                    )
                ) {
                    locationCities.push(location.location.data?.address?.city);
                    locationLatLongs.push({
                        latitude: location.location.data?.latitude,
                        longitude: location.location.data?.longitude,
                    });
                }
            }
            bookableAppointmentsFound += locationBookableAppointmentsFound;
            availabilityWithNoNumbers =
                availabilityWithNoNumbers || locationAvailabilityWithNoNumbers;
        }

        // 2. check if an alert exists
        const alertExists = await alerts.activeAlertExists(
            parentLocation.ref.id
        );
        console.log(`group alert does ${!alertExists ? "not " : ""}exist`);

        // 3. if alert doesn't exist and there is availability, start an alert & notify.
        if (
            !alertExists &&
            (bookableAppointmentsFound || availabilityWithNoNumbers)
        ) {
            const alertStartTime = await alerts.getLastAlertStartTime(
                parentLocation.ref.id
            );
            if (
                alertStartTime.isBefore(
                    moment().subtract(alerts.REPEAT_ALERT_TIME(), "minutes")
                )
            ) {
                console.log(
                    `starting new group alert for ${parentLocation.ref.id}`
                );
                await alerts.setUpNewAlert(
                    parentLocation.ref.id,
                    parentScraperRunRefId,
                    // this counts as a "mass alert" if we have more than APPOINTMENT_NUMBER_THRESHOLD
                    // appointments OR locations (locations b/c some places we only know if they have
                    // availability but not how much - we assume at least 1 which is safe.)
                    bookableAppointmentsFound >=
                        alerts.APPOINTMENT_NUMBER_THRESHOLD() ||
                        locationCities.length >
                            alerts.APPOINTMENT_NUMBER_THRESHOLD()
                );
                await alerts.publishGroupAlert(
                    parentLocation.data.name,
                    locationCities,
                    locationLatLongs,
                    bookableAppointmentsFound,
                    availabilityWithNoNumbers,
                    // this counts as a "mass alert" if we have more than APPOINTMENT_NUMBER_THRESHOLD
                    // appointments OR locations (locations b/c some places we only know if they have
                    // availability but not how much - we assume at least 1 which is safe.)
                    bookableAppointmentsFound >=
                        alerts.APPOINTMENT_NUMBER_THRESHOLD() ||
                        locationCities.length >=
                            alerts.APPOINTMENT_NUMBER_THRESHOLD(),
                    // similar logic but for regular alerts
                    bookableAppointmentsFound >=
                        alerts.SMALL_APPOINTMENT_NUMBER_THRESHOLD() ||
                        locationCities.length >=
                            alerts.SMALL_APPOINTMENT_NUMBER_THRESHOLD()
                );
                return;
            } else {
                console.log(`(1) doing nothing for ${parentLocation.ref.id}`);
                return;
            }
        }
        // 3.5. if alert exists but a mass alert hasn't been sent,
        // send one IF we meet the threshold.
        else if (
            alertExists &&
            bookableAppointmentsFound > alerts.APPOINTMENT_NUMBER_THRESHOLD() &&
            !(await alerts.massAlertAlreadySent(parentLocation.ref.id))
        ) {
            console.log(`sending mass alert for ${parentLocation.ref.id}`);
            await alerts.setMassAlert(
                parentLocation.ref.id,
                parentScraperRunRefId
            );
            await alerts.publishGroupAlert(
                parentLocation.data.name,
                locationCities,
                bookableAppointmentsFound,
                availabilityWithNoNumbers,
                true,
                false
            );
            return;
        }

        // 4. if alert exists and no availability, end it.
        else if (
            alertExists &&
            !(bookableAppointmentsFound || availabilityWithNoNumbers)
        ) {
            console.log(`stopping group alert for ${parentLocation.ref.id}`);
            await alerts.setInactiveAlert(
                parentLocation.ref.id,
                parentScraperRunRefId
            );
            return;
        }

        // 5. if alert exists and there is availability and mass alert was sent, bail.
        // 6. if alert doesn't exist and there is no avaialbility, bail.
        else {
            console.log(`(2) doing nothing for ${parentLocation.ref.id}`);
            return;
        }
    } else {
        console.log(`(3) doing nothing for ${parentLocation.ref.id}`);
        return;
    }
}

async function setMassAlert(locationRefId, scraperRunRefId) {
    const id = await alerts.getActiveAlertRefId(locationRefId);
    if (!id) {
        throw Error(`No active alert found for location ${locationRefId}!`);
    }

    return dbUtils.faunaQuery(
        fq.Update(fq.Ref(fq.Collection("appointmentAlerts"), id), {
            data: {
                massAlertScraperRunRef: fq.Ref(
                    fq.Collection("scraperRuns"),
                    scraperRunRefId
                ),
            },
        })
    );
}

async function getChildData({ parentLocationRefId, parentScraperRunRefId }) {
    return {
        locations: await scraperUtils.getLocationsByParentLocation(
            parentLocationRefId
        ),
        scraperRunsAndAppointments: await scraperUtils.getScraperRunsAndAppointmentsByParentScraperRun(
            parentScraperRunRefId
        ),
    };
}

function mergeData({ locations, scraperRunsAndAppointments }) {
    // for each location, find the scraperRun (w/ associated appointments) that links to it
    return locations.map((location) => {
        const match = scraperRunsAndAppointments.find(
            (run) => run.scraperRun.data.locationRef.id === location.ref.id
        );
        return {
            location: location,
            scraperRun: match?.scraperRun,
            appointments: match?.appointments,
        };
    });
}

function aggregateAvailability(appointments = []) {
    if (!appointments.length) {
        return {
            bookableAppointmentsFound: 0,
            availabilityWithNoNumbers: false,
        };
    } else {
        const preReturn = {
            bookableAppointmentsFound: appointments.reduce(
                (acc, cur) => acc + (cur?.data?.numberAvailable || 0),
                0
            ),
            availabilityWithNoNumbers: appointments.reduce(
                (acc, cur) =>
                    acc || cur?.data?.availabilityWithNoNumbers || false,
                false
            ),
        };
        if (
            preReturn.bookableAppointmentsFound &&
            preReturn.availabilityWithNoNumbers
        ) {
            console.err(
                `Both bookableAppointmentsFound and availabilityWithNoNumbers set 
                for (first appt entry: ${JSON.stringify(appointments[0])})!`
            );
            preReturn.availabilityWithNoNumbers = false;
        }
        return preReturn;
    }
}

async function handleIndividualAlerts(
    locations,
    parentScraperRunRefId,
    parentIsChain
) {
    return Promise.all(
        locations.map((locationEntry) => {
            const locationRefId = locationEntry.location.ref.id;
            const scraperRunRefId = locationEntry.scraperRun
                ? locationEntry.scraperRun.ref.id
                : parentScraperRunRefId;
            const {
                bookableAppointmentsFound,
                availabilityWithNoNumbers,
            } = locationEntry.scraperRun
                ? alerts.aggregateAvailability(locationEntry.appointments)
                : {
                      // if we have no scraper run, we assume nothing was found
                      // for this location.
                      bookableAppointmentsFound: 0,
                      availabilityWithNoNumbers: false,
                  };
            return handleIndividualAlert({
                locationRefId,
                scraperRunRefId,
                bookableAppointmentsFound,
                availabilityWithNoNumbers,
                parentIsChain,
            });
        })
    );
}

async function handleIndividualAlert({
    locationRefId,
    scraperRunRefId,
    bookableAppointmentsFound,
    availabilityWithNoNumbers,
    parentIsChain, // only send Twitter/Slack messages if we don't group this location by its parent
}) {
    console.log(
        `Handling individual alert for ${JSON.stringify({
            locationRefId,
            scraperRunRefId,
            bookableAppointmentsFound,
            availabilityWithNoNumbers,
        })}`
    );
    if (await alerts.activeAlertExists(locationRefId)) {
        if (!bookableAppointmentsFound && !availabilityWithNoNumbers) {
            console.log(`setting alert inactive for ${locationRefId}.`);
            await alerts.setInactiveAlert(locationRefId, scraperRunRefId);
        } else if (
            bookableAppointmentsFound >=
                alerts.APPOINTMENT_NUMBER_THRESHOLD() &&
            !(await alerts.massAlertAlreadySent(locationRefId))
        ) {
            console.log(`sending mass alert for ${locationRefId}.`);
            await alerts.setMassAlert(locationRefId, scraperRunRefId);
            await alerts.runAlerts(
                locationRefId,
                bookableAppointmentsFound,
                availabilityWithNoNumbers,
                parentIsChain,
                true,
                false
            );
        } else {
            console.log(`(1) Not doing anything for ${locationRefId}.`);
        }
    } else if (
        (bookableAppointmentsFound &&
            bookableAppointmentsFound >
                alerts.SMALL_APPOINTMENT_NUMBER_THRESHOLD()) ||
        availabilityWithNoNumbers
    ) {
        console.log(`enough appointments found for ${locationRefId}.`);
        const alertStartTime = await alerts.getLastAlertStartTime(
            locationRefId
        );
        if (
            !alertStartTime ||
            alertStartTime.isBefore(
                moment().subtract(alerts.REPEAT_ALERT_TIME(), "minutes")
            )
        ) {
            console.log(`starting new alert for ${locationRefId}.`);
            await alerts.setUpNewAlert(
                locationRefId,
                scraperRunRefId,
                bookableAppointmentsFound >=
                    alerts.APPOINTMENT_NUMBER_THRESHOLD()
            );

            /*
             * Also, send out any immediate notifications (Twitter, Slack)
             * Prioritize emails in one go (50,000 daily, 14 per second or 840/min)
             * Start the first round of text alerts (don't know throughput really)
             */
            await alerts.runAlerts(
                locationRefId,
                bookableAppointmentsFound,
                availabilityWithNoNumbers,
                parentIsChain,
                bookableAppointmentsFound >=
                    alerts.APPOINTMENT_NUMBER_THRESHOLD(),
                bookableAppointmentsFound >=
                    alerts.SMALL_APPOINTMENT_NUMBER_THRESHOLD() ||
                    availabilityWithNoNumbers
            );
        }
    } else {
        console.log(`(2) Not doing anything for ${locationRefId}.`);
    }
    return;
}

async function handler({ parentLocationRefId, parentScraperRunRefId }) {
    console.log(JSON.stringify({ parentLocationRefId, parentScraperRunRefId }));
    const { locations, scraperRunsAndAppointments } = await alerts.getChildData(
        {
            parentLocationRefId,
            parentScraperRunRefId,
        }
    );
    const mergedLocations = await alerts.mergeData({
        locations,
        scraperRunsAndAppointments,
    });
    console.log(JSON.stringify(mergedLocations));
    const parentLocation = await dbUtils.retrieveItemByRefId(
        "parentLocations",
        parentLocationRefId
    );
    await alerts.handleGroupAlerts({
        parentLocation,
        parentScraperRunRefId,
        locations: mergedLocations,
    });
    await alerts.handleIndividualAlerts(
        mergedLocations,
        parentScraperRunRefId,
        parentLocation.data.isChain
    );
    return;
}

if (require.main === module) {
    (async () => {
        const args = process.argv.slice(2);
        console.log("DEV MODE");
        alerts.handler({
            parentLocationRefId: args[0],
            parentScraperRunRefId: args[1],
        });
    })();
}
