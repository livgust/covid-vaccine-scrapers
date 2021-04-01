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
const { faunaQuery, generateId } = require("../lib/db-utils");
const { sendSlackMsg } = require("../lib/slack");
const dbUtils = require("../lib/db-utils");
const dotenv = require("dotenv");
const faunadb = require("faunadb"),
    fq = faunadb.query;
const moment = require("moment");

dotenv.config();

const alerts = {
    // How many appointments we must find to consider alerting
    APPOINTMENT_NUMBER_THRESHOLD: () => 10,
    // How many minutes must pass between new alerts for the same location
    REPEAT_ALERT_TIME: () => 15,
    // exported functions:
    activeAlertExists,
    getActiveAlertRefId,
    getLastAlertStartTime,
    handler,
    maybeContinueAlerting,
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
    const data = await faunaQuery(
        fq.Filter(
            fq.Paginate(
                fq.Match(
                    fq.Index("appointmentAlertsByLocationRef"),
                    fq.Ref(fq.Collection("locations"), locationRefId)
                )
            ),
            fq.Lambda((x) =>
                fq.IsNull(
                    fq.Select(["data", "lastScraperRunRef"], fq.Get(x), null)
                )
            )
        )
    ).then((res) => {
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

    await faunaQuery(
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
    const nsTimestamp = await faunaQuery(
        fq.Select(
            "ts",
            fq.Get(
                fq.Match(
                    "appointmentAlertsByLocationRefSortByStartTime",
                    fq.Ref(fq.Collection("locations"), locationRefId)
                )
            )
        )
    );
    return moment(nsTimestamp / 1000);
}

async function setUpNewAlert(
    locationRefId,
    scraperRunRefId,
    bookableAppointmentsFound
) {
    // create a new entry in appointmentAlerts with locationRef and firstScraperRunRef set to scraperRunRef.
    const record = await faunaQuery(
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

async function handler(data) {
    if (await alerts.activeAlertExists(data.locationRefId)) {
        if (data?.bookableAppointmentsFound === 0) {
            await alerts.setInactiveAlert(
                data.locationRefId,
                data.scraperRunRefId
            );
        } else {
            await alerts.maybeContinueAlerting();
        }
    } else if (
        data.bookableAppointmentsFound &&
        data.bookableAppointmentsFound >= alerts.APPOINTMENT_NUMBER_THRESHOLD()
    ) {
        const alertStartTime = await alerts.getLastAlertStartTime(
            data.locationRefId
        );
        if (
            !alertStartTime ||
            alertStartTime.isBefore(
                moment().subtract(alerts.REPEAT_ALERT_TIME(), "minutes")
            )
        ) {
            await alerts.setUpNewAlert(
                data.locationRefId,
                data.scraperRunRefId,
                data.bookableAppointmentsFound
            );
        }
    }
    return;
}
