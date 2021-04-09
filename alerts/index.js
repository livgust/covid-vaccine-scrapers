/* we expect "data" to have the form:
    {
        scraperRunRefId: 123,
        locationRefId: 234,
        bookableAppointmentsFound: 456
    }

DB structure:

(for a location, when we first noticed appointments were there, and then when we noticed they were gone)
appointmentAlerts: {
    locationRef,
    firstScraperRunRef,
    lastScraperRunRef
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

dotenv.config();

const alerts = {
    // How many appointments we must find to consider mass-alerting
    APPOINTMENT_NUMBER_THRESHOLD: () => 10,
    // How many minutes must pass between new alerts for the same location
    REPEAT_ALERT_TIME: () => 15,
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
    maybeContinueAlerting,
    mergeData,
    publishGroupAlert,
    runImmediateAlerts,
    setInactiveAlert,
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

// TODO
function maybeContinueAlerting() {
    /* if appointments are still available, maybe send out more
     * emails or texts?
     */
    return;
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

async function setUpNewAlert(locationRefId, scraperRunRefId) {
    // create a new entry in appointmentAlerts with locationRef and firstScraperRunRef set to scraperRunRef.
    const record = await dbUtils.faunaQuery(
        fq.Create(fq.Collection("appointmentAlerts"), {
            data: {
                locationRef: fq.Ref(fq.Collection("locations"), locationRefId),
                firstScraperRunRef: fq.Ref(
                    fq.Collection("scraperRuns"),
                    scraperRunRefId
                ),
                startTime: fq.Time("now"),
            },
        })
    );

    return record.ref.id;
}

async function runImmediateAlerts(
    locationRefId,
    bookableAppointmentsFound,
    availabilityWithNoNumbers,
    parentIsChain
) {
    const location = await dbUtils
        .retrieveItemByRefId("locations", locationRefId)
        .then((res) => res.data);

    let message;
    if (bookableAppointmentsFound) {
        message = `${bookableAppointmentsFound} appointments available at ${location.name} in ${location.address.city}. Visit macovidvaccines.com to book.`;
    } else if (availabilityWithNoNumbers) {
        message = `Appointments available at ${location.name} in ${location.address.city}. Visit https://macovidvaccines.com to book.`;
    } else {
        console.error(
            `runImmediateAlerts was called for location ref ${locationRefId} but no appointments were passed in`
        );
    }

    const promises = [];
    if (message && !parentIsChain) {
        if (
            bookableAppointmentsFound >= alerts.APPOINTMENT_NUMBER_THRESHOLD()
        ) {
            promises.push(sendTweet(message));
        }
        promises.push(sendSlackMsg("bot", message));
    }
    // log any errors without failing.
    return Promise.all(promises).catch(console.error);
}

async function publishGroupAlert(
    locationName,
    locationCities,
    bookableAppointmentsFound,
    availabilityWithNoNumbers
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

    const locationMessage = `${locationName} locations ${joinedLocations}`;

    // we assume the "else" case is when availabilityWithNoNumbers is true; we pass it through to this function to be explicit.
    const appointmentsMessage = bookableAppointmentsFound
        ? `${bookableAppointmentsFound} appointments available`
        : `Appointments available`;

    const message = `${appointmentsMessage} at ${locationMessage}. Visit https://macovidvaccines.com for more details and to sign up.`;

    const promises = [];
    if (bookableAppointmentsFound >= alerts.APPOINTMENT_NUMBER_THRESHOLD()) {
        promises.push(sendTweet(message));
    }
    promises.push(sendSlackMsg("bot", message));
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
                    bookableAppointmentsFound,
                    availabilityWithNoNumbers
                );
                await alerts.publishGroupAlert(
                    parentLocation.data.name,
                    locationCities,
                    bookableAppointmentsFound,
                    availabilityWithNoNumbers
                );
                return;
            } else {
                console.log(`doing nothing for ${parentLocation.ref.id}`);
                return;
            }
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

        // 5. if alert exists and there is availability, bail.
        // 6. if alert doesn't exist and there is no avaialbility, bail.
        else {
            console.log(`doing nothing for ${parentLocation.ref.id}`);
            return;
        }
    } else {
        console.log(`doing nothing for ${parentLocation.ref.id}`);
        return;
    }
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
                `Both bookableAppointmentFound and availabilityWithNoNumbers set for (first appt entry: ${JSON.stringify(
                    appointments[0]
                )})!`
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
        } else {
            console.log(`continuing alert for ${locationRefId}.`);
            await alerts.maybeContinueAlerting();
        }
    } else if (
        (bookableAppointmentsFound && bookableAppointmentsFound > 0) ||
        availabilityWithNoNumbers
    ) {
        console.log(`appointments found for ${locationRefId}.`);
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
                bookableAppointmentsFound,
                availabilityWithNoNumbers
            );

            /*
             * Also, send out any immediate notifications (Twitter, Slack)
             * Prioritize emails in one go (50,000 daily, 14 per second or 840/min)
             * Start the first round of text alerts (don't know throughput really)
             */
            await alerts.runImmediateAlerts(
                locationRefId,
                bookableAppointmentsFound,
                availabilityWithNoNumbers,
                parentIsChain
            );
        }
    } else {
        console.log(`Not doing anything for ${locationRefId}.`);
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
