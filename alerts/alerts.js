/* we expect "data" to have the form:
    {
        scraperRunId: 123,
        bookableAppointmentsFound: 456
    }
*/

/* DB structure:

(for a location, when we first noticed appointments were there, and then when we noticed they were gone)
appointmentAlerts: {
    locationId,
    startScraperRunId,
    finishScraperRunId
}

(for an alert, what zip codes we have texted and when)
appointmentAlertTextZips: {
    appointmentAlertId,
    zipCode,
    timestamp
}

*/
exports.handler = (data) => {
    /* step 1: see if we should send out a notification
        - are there more than X slots available?
        - did we notify about this location in the past Y minutes?
        - are there more slots than there were last time we noted availability? (is this a new drop?)
       step 2: notify people
        - always send out a Twitter notification
        - always send out a Slack notification
        - always send an email to those within radius
        - prioritize texting those within radius
    */
    return;
};
