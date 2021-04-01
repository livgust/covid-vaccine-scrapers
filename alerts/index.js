/* we expect "data" to have the form:
    {
        scraperRunRef: 123,
        locationRef: 234,
        locationName: "Gillette Stadium",
        bookableAppointmentsFound: 456
    }
*/

const moment = require("moment");
const faunadb = require("faunadb"),
    fq = faunadb.query;
const { faunaQuery, generateId } = require("../lib/db-utils");

const alerts = {
    APPOINTMENT_NUMBER_THRESHOLD: () => 10,
    REPEAT_ALERT_TIME: () => 15,
    activeAlertExists,
    getActiveAlertRef,
    getLastAlertStartTime,
    handler,
    maybeContinueAlerting,
    setInactiveAlert,
    setUpNewAlert,
};

module.exports = alerts;
/* DB structure:

(for a location, when we first noticed appointments were there, and then when we noticed they were gone)
appointmentAlerts: {
    locationRef,
    startScraperRunRef,
    finishScraperRunRef
}

(for an alert, what zip codes we have texted and when)
appointmentAlertTextZips: {
    appointmentAlertRef,
    zipCode,
    timestamp
}

*/

/* open alert for a given location is seen by:

appointmentAlert: {
    locationRef: 123,
    firstScraperRunRef: 456,
    lastScraperRunRef: not set
}

*/

/* last alert for a given location is seen by:

appointmentAlert: {
    locationRef: 123,
    finishScraperRunRef: max()
}

*/

function activeAlertExists(locationRef) {
    /* search if there's an entry in appointmentAlerts for this location
     * with a null lastScraperRunRef
     */
    return false;
}

async function getActiveAlertRef(locationRef) {
    const data = await faunaQuery(
        fq.Filter(
            fq.Paginate(
                fq.Match(
                    fq.Index("appointmentAlertsByLocationRef"),
                    fq.Ref(fq.Collection("locations"), locationRef)
                )
            ),
            fq.Lambda((x) =>
                fq.IsNull(
                    fq.Select(["data", "lastScraperRunRef"], fq.Get(x), null)
                )
            )
        )
    ).then((res) => {
        console.log(res);
        return res.map((alert) => alert.data);
    });
    if (data.length > 1) {
        throw `Multiple inactive alerts found for location ${locationRef}.`;
    } else {
        return data[0];
    }
}

async function setInactiveAlert(locationRef, scraperRunRef) {
    /* find the entry in appointmentAlerts for this location with a null
     * lastScraperRunRef, and set lastScraperRunRef to scraperRunRef
     */
    const id = await getActiveAlertRef(locationRef);

    return;
}

function maybeContinueAlerting(locationRef, scraperRunRef) {
    /* if appointments are still available, maybe send out more
     * emails or texts?
     */
    return;
}

function getLastAlertStartTime(locationRef) {
    /* find the entry in appointmentAlerts for this location with
     * the lastScraperRunRef with the latest TS
     */
    return null;
}

async function setUpNewAlert(locationRef, scraperRunRef) {
    const id = await generateId();
    // create a new entry in appointmentAlerts with locationRef and firstScraperRunRef set to scraperRunRef.
    await faunaQuery(
        fq.Create(fq.Ref(fq.Collection("appointmentAlerts"), id), {
            data: {
                locationRef,
                firstScraperRunRef: scraperRunRef,
            },
        })
    );

    /*
     * Also, send out any immediate notifications (Twitter, Slack)
     * Prioritize emails in one go (50,000 daily, 14 per second or 840/min)
     * Start the first round of text alerts (don't know throughput really)
     */

    return id;
}

function handler(data) {
    if (alerts.activeAlertExists(data.locationRef)) {
        if (data?.bookableAppointmentsFound === 0) {
            alerts.setInactiveAlert(data.locationRef, data.scraperRunRef);
        } else {
            alerts.maybeContinueAlerting();
        }
    } else if (
        data?.bookableAppointmentsFound >=
            alerts.APPOINTMENT_NUMBER_THRESHOLD() &&
        alerts
            .getLastAlertStartTime(data.locationRef)
            .isBefore(moment().subtract(alerts.REPEAT_ALERT_TIME(), "minutes"))
    ) {
        alerts.setUpNewAlert(data.locationRef, data.scraperRunRef);
    }
    return;
}
