const sites = require("../data/sites.json");
const moment = require("moment");
const fetch = require("node-fetch");

// Set to true for verbose debug messages.
const DEBUG = false;

function Debug(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

module.exports = async function GetAvailableAppointments() {
    console.log("SouthLawrence starting.");

    const {
        name,
        website,
        ...restLawrence
    } = sites.SouthLawrenceEastElementarySchool;

    const websiteData = await ScrapeWebsiteData(website);

    console.log("SouthLawrence done.");
    return {
        ...restLawrence,
        ...websiteData,
        timestamp: moment().format(),
    };
};

async function ScrapeWebsiteData(website) {
    // GET the website to scrape the calendar and type codes.
    // We could hard-code them but I don't know if they could change.
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
    const regex = /typeToCalendars\[(?<type>\d+)\] = \[\[(?<calendar>\d+), '1st Dose - COVID Vaccine'/;
    const match = body.match(regex);
    Debug("match", match && match.groups);

    return match ? match.groups : {};
}

function ShowCalendar(website, type, calendar) {
    console.log("website", website);
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
