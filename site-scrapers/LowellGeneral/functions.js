const moment = require("moment");
const https = require("https");
const html_parser = require("node-html-parser");
/**
 * buildTimeSlotsUrl takes a long id attr and turns it into the proper
 * url for accessing timeslots.
 *
 * doctorId = 23425
 * locationId = 14110
 * stationNumber = 10
 *
 * @param {string} stationIdAttr - healthpost_appointments10_time_slots_for_doctor_23425_14110
 * @returns {string} - a url that will get appointments for the next 45 days for a given vaccination station
 */

function buildTimeSlotsUrl(stationIdAttr) {
    const stationNumber = stationIdAttr
        .split("_")[1]
        .replace("appointments", "");
    const doctorId = stationIdAttr.split("_")[6];
    const locationId = stationIdAttr.split("_")[7];

    // start yesterday since they are looking for midnight of a given day
    const midnight = "+00%3A00%3A00";
    const yesterday = moment().local().subtract(1, "days");
    const startDate = moment(yesterday).format("YYYY-MM-DD") + midnight;
    const yesterdayPlus45Days = moment(yesterday).local().add(45, "days");
    const endDate = moment(yesterdayPlus45Days).format("YYYY-MM-DD") + midnight;
    const diff = yesterdayPlus45Days.diff(yesterday, "days");
    if (diff !== 45) {
        console.log(`diff ${diff}`);
        return false;
    }

    return [
        "https://lowell-general-hospital---covid---19-vaccination.healthpost.com/doctors/",
        doctorId,
        "-covid-19-vaccination-station-",
        stationNumber,
        "/time_slots?appointment_action=new&embed=1&end_at=",
        endDate,
        "&hp_medium=widget_provider&hp_source=lowell-general-hospital---covid---19-vaccination&html_container_id=healthpost_appointments18&practice_location_id=",
        locationId,
        "&start_at=",
        startDate,
        "&num_of_days=45",
    ].join("");
}

/**
 * parseAvailability handles the XHR response fron a timeslots url
 * of a given vaccination station
 * it returns an object with the following example structure
 * {
 *   hasAvailability = true,
 *       availability = {
 *       '2/20/2021': 3,
 *       '2/21/2021': 4
 *   }
 * }
 * or
 * {
 *  hasAvailability = false,
 *  availability = {}
 * }
 * @param {string} body
 * @returns {object} -  { hasAvailability, availability }
 */

function parseAvailability(body) {
    // Currently,
    // The dates are in the <TH>s in the first <TR>.
    // The timeslots are <LI> elements within each <TD> of the second <TR>.
    // Before we can parse the HTML we have to remove all the response text
    // around the html. JSON parse didn't work so we have to split our
    // way down.
    body = body.substring(38, body.length - 2);
    let justHTML = body.split('time_slots_div":"')[1];
    justHTML = justHTML.substring(0, justHTML.length - 2);
    // When parsing real responses it is necessary to convert the unicode to ASCII
    justHTML = justHTML.replace(/\\u[\dA-F]{4}/gi, function (match) {
        return String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16));
    });
    const parsedHTML = html_parser.parse(justHTML);
    const rows = parsedHTML.querySelectorAll(
        ".time-slot-table-container table tr"
    );
    const headers = rows[0];
    const appointments = rows[1];
    let tdIndex = 0;
    let hasAvailability = false;
    let availability = {};

    if (appointments) {
        appointments.childNodes.map((td) => {
            if (td.tagName === "TD") {
                // For some reason the html parser we are using
                // doesn't calculate the cellIndex so we have to.
                tdIndex += 1;
                if (!td.childNodes[1]) {
                    return;
                }
                // const numLIs = td.childNodes[1].childNodes.length;
                const ulHTML = td.childNodes[1].innerHTML;
                const ul = html_parser.parse(ulHTML);

                const LIs = ul.querySelectorAll("li");
                let countNotHiddenLIs = 0;

                // There are other LIs that do not represent actual slots
                // so we don't count those.
                LIs.map((li) => {
                    if (
                        li.rawAttrs.indexOf("hidden") === -1 &&
                        li.rawAttrs.indexOf("slot") > -1 &&
                        (li.rawText.includes("am") || li.rawText.includes("pm"))
                    ) {
                        countNotHiddenLIs += 1;
                    }
                });

                if (countNotHiddenLIs) {
                    // Ex headerText: Sat  Mar 20
                    // There's an extra space between the Day of the week
                    // so we remove double spaces
                    const headerText = headers.childNodes[
                        tdIndex
                    ].innerText.replace(/ {2,}/g, " ");
                    const thMonth = headerText.split(" ")[1];
                    const thDay = headerText.split(" ")[2];
                    let [month, year] = getYearForMonth(thMonth);
                    const formattedDate = moment([year, month, thDay])
                        .local()
                        .format("MM/DD/YYYY");
                    // length of LIs found is number of appointments
                    availability[formattedDate] = countNotHiddenLIs;
                    hasAvailability = true;
                }
            }
        });
    }
    return { hasAvailability, availability };
}

// returns "foobar" in passed node <div id="foobar">
async function getNodeId(node) {
    return await node.evaluate((node) => node.id);
}

// Running fetch() inside the browser page allows use of all the
// available cookies in an XHR request without needing to build
// an https request in the node env.
// returns the XHR response body
async function getStationTimeslots(page, url) {
    return await page.evaluate(async (url) => {
        const response = await fetch(url);
        return await response.text();
    }, url);
}

// This is for testing locally when there are no appointments
async function getStationTimeslotsWithHttps(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
                resolve(body);
            });
        });
    });
}

// Since the year is not available to us we need to calculate the year.
// Using the current year is straight forward but the problem is
// what happens when the month goes from Dec of the current year to Jan of
// the next year. We add 1 to the current year if the passed month (ex. 'Jan')
// is less than the current month. Ex. Jan 2022 < December 2021
function getYearForMonth(passedMonthName) {
    let passedMonthInt = moment().month(passedMonthName).month();
    let currentMonthInt = moment().month();
    let year = moment().year();
    if (passedMonthInt < currentMonthInt) {
        year += 1;
    }
    return [passedMonthInt, year];
}

// Sum appt count across all stations for each date found.
function groupAppointmentsByDate(availability, stationAvailability) {
    for (const dateKey in stationAvailability) {
        if (!availability[dateKey]) {
            availability[dateKey] = {
                hasAvailability: true,
                numberAvailableAppointments: 0,
            };
        }
        availability[dateKey].numberAvailableAppointments +=
            stationAvailability[dateKey];
    }

    return availability;
}

module.exports = {
    buildTimeSlotsUrl,
    getNodeId,
    parseAvailability,
    getStationTimeslots,
    getStationTimeslotsWithHttps,
    groupAppointmentsByDate,
};
