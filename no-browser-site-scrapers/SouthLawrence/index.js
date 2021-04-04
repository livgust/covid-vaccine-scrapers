const { site } = require("./config");
const moment = require("moment");
const fetch = require("node-fetch");
const { sendSlackMsg } = require("../../lib/slack");
const s3 = require("../../lib/s3");

// Set to true for verbose debug messages.
const DEBUG = false;

function Debug(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

module.exports = async function GetAvailableAppointments() {
    console.log("SouthLawrence starting.");

    const { name, website, ...restLawrence } = site;

    const websiteData = await ScrapeWebsiteData(website);
    Debug("websiteData", websiteData);

    console.log("SouthLawrence done.");
    return {
        ...restLawrence,
        ...websiteData,
        timestamp: moment().format(),
    };
};

async function ScrapeWebsiteData(website) {
    Debug("website", website);
    // GET the website to scrape the calendar and type codes.
    const calendarHtml = await fetch(website)
        .then((res) => res.text())
        .then((body) => {
            Debug(body);
            const { type, calendar } = ParseCovidVaccineCalendar(body);
            // POST to the ShowCalendar action (at the same URL) to
            // retrieve the calendar HTML
            return type && calendar
                ? ShowCalendar(website, type, calendar)
                : "";
        });

    // Look for a certain element ID to determine if no times are available.
    Debug("calendarHtml", calendarHtml);
    let hasAvailability = null;
    if (calendarHtml.includes("no-times-available-message")) {
        hasAvailability = false;
    } else {
        if (process.env.NODE_ENV === "production") {
            await s3.saveHTMLContent(site.name, calendarHtml);
            await sendSlackMsg(
                "bot",
                "Appointments maybe found at South Lawrence"
            );
        }
    }
    // TODO: there are no examples of available slots at this time, so
    // we can only confirm there is no availability
    return {
        hasAvailability: hasAvailability,
        availability: {},
    };
}

function ParseCovidVaccineCalendar(body) {
    // Scrape the type and calendar query parameters from the javascript array,
    // looking for the type and calendar of the COVID vaccine, first dose.
    // javascript looks like:
    // typeToCalendars[19267408] = [[4896962, '1st Dose - COVID Vaccine', '', '', '']  ];
    // The calendar name displayed on the website changes over time.
    // Pick the best one.
    const regexes = [
        /typeToCalendars\[(?<type>\d+)\] = \[\[(?<calendar>\d+), '1st Dose - COVID Vaccine/,
        /typeToCalendars\[(?<type>\d+)\] = \[\[(?<calendar>\d+), 'STAND-BY LIST\s+-\sS[.] Lawrence East School/,
    ];
    for (let i = 0; i < regexes.length; i++) {
        const match = body.match(regexes[i]);
        if (match) {
            Debug("match", match && match.groups);
            return match.groups;
        }
    }
    Debug("no match");
    return {};
}

function ShowCalendar(website, type, calendar) {
    Debug("website", website, "type", type, "calendar", calendar);
    return new Promise((resolve) => {
        fetch(
            website +
                "?action=showCalendar&fulldate=1&owner=21579739&template=weekly",
            {
                headers: {
                    "content-type":
                        "application/x-www-form-urlencoded; charset=UTF-8",
                },
                body: `type={type}&calendar={calendar}&skip=true&options%5Bqty%5D=1&options%5BnumDays%5D=5&ignoreAppointment=&appointmentType=&calendarID=`,
                method: "POST",
            }
        )
            .then((res) => res.text())
            .then((body) => {
                resolve(body);
            });
    });
}
