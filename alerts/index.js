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
const dbUtils = require("../lib/db/utils");
const dotenv = require("dotenv");
const faunadb = require("faunadb"),
    fq = faunadb.query;
const moment = require("moment");
const scraperUtils = require("../lib/db/scraper_data");

dotenv.config();

const alerts = {
    // How many appointments we must find to consider alerting
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
    const data = await dbUtils
        .faunaQuery(
            fq.Filter(
                fq.Paginate(
                    fq.Match(
                        fq.Index("appointmentAlertsByLocationRef"),
                        fq.Ref(fq.Collection("locations"), locationRefId)
                    )
                ),
                fq.Lambda((x) =>
                    fq.IsNull(
                        fq.Select(
                            ["data", "lastScraperRunRef"],
                            fq.Get(x),
                            null
                        )
                    )
                )
            )
        )
        .then((res) => {
            return res.data;
        });
    if (data.length > 1) {
        throw Error(
            `Multiple active alerts found for location ${locationRefId}.`
        );
    } else if (data.length === 0) {
        return null;
    } else {
        return data[0].id;
    }
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
            "ts",
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
                {}
            ),
            ""
        )
    );
    if (!nsTimestamp) {
        throw new Error(`No alert found for location ${locationRefId}!`);
    } else {
        return moment(nsTimestamp / 1000);
    }
}

async function setUpNewAlert(
    locationRefId,
    scraperRunRefId,
    bookableAppointmentsFound
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
                startTime: fq.Time("now"),
            },
        })
    );

    /*
     * Also, send out any immediate notifications (Twitter, Slack)
     * Prioritize emails in one go (50,000 daily, 14 per second or 840/min)
     * Start the first round of text alerts (don't know throughput really)
     */
    await alerts.runImmediateAlerts(locationRefId, bookableAppointmentsFound);

    return record.ref.id;
}

async function runImmediateAlerts(locationRefId, bookableAppointmentsFound) {
    const location = await dbUtils
        .retrieveItemByRefId("locations", locationRefId)
        .then((res) => res.data);

    const message = `${bookableAppointmentsFound} appointments available at ${location.name} in ${location.address.city}. Visit macovidvaccines.com to book.`;

    sendSlackMsg("bot", message);

    return;
}

async function handleGroupAlerts({
    parentLocationRefId,
    parentScraperRunRefId,
}) {
    // TODO: If parentLocation isChain, have global alert as well
    return;
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
    } else if (appointments.length === 1) {
        return {
            availabilityWithNoNumbers: true,
            bookableAppointmentsFound: null,
        };
    } else {
        return {
            bookableAppointmentsFound: appointments.reduce(
                (acc, cur) => acc + (cur?.data?.numberAvailable || 0),
                0
            ),
            availabilityWithNoNumbers: false,
        };
    }
}

async function handleIndividualAlerts(locations, parentScraperRunRefId) {
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
            });
        })
    );
}

async function handleIndividualAlert({
    locationRefId,
    scraperRunRefId,
    bookableAppointmentsFound,
    availabilityWithNoNumbers, // TODO - currently we do nothing with this.
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
        if (bookableAppointmentsFound === 0) {
            console.log("setting alert inactive.");
            await alerts.setInactiveAlert(locationRefId, scraperRunRefId);
        } else {
            console.log("continuing alert.");
            await alerts.maybeContinueAlerting();
        }
    } else if (
        bookableAppointmentsFound &&
        bookableAppointmentsFound >= alerts.APPOINTMENT_NUMBER_THRESHOLD()
    ) {
        console.log("appointments pass threshold.");
        const alertStartTime = await alerts.getLastAlertStartTime(
            locationRefId
        );
        if (
            !alertStartTime ||
            alertStartTime.isBefore(
                moment().subtract(alerts.REPEAT_ALERT_TIME(), "minutes")
            )
        ) {
            console.log("starting new alert.");
            await alerts.setUpNewAlert(
                locationRefId,
                scraperRunRefId,
                bookableAppointmentsFound
            );
        }
    } else {
        console.log("Not doing anything.");
    }
    return;
}

async function handler({ parentLocationRefId, parentScraperRunRefId }) {
    console.dir(
        { parentLocationRefId, parentScraperRunRefId },
        { depth: null }
    );
    await alerts.handleGroupAlerts({
        parentLocationRefId,
        parentScraperRunRefId,
    });
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
    await alerts.handleIndividualAlerts(mergedLocations, parentScraperRunRefId);
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
