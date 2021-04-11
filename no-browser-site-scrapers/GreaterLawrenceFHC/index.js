const { sites, provider } = require("./config");
const fetch = require("node-fetch");
const htmlParser = require("node-html-parser");
const moment = require("moment");

module.exports = async function GetAvailableAppointments(
    _ignored,
    fetchService = liveFetchService()
) {
    console.log(`${provider} starting.`);

    const results = [];

    for (const site of sites) {
        const websiteData = await ScrapeWebsiteData(site, fetchService);

        results.push(websiteData);
    }

    console.log(`${provider} done.`);
    return results;
};

function liveFetchService() {
    return {
        async fetchAvailability(site) {
            return await fetchAvailability(site);
        },
    };
}

async function ScrapeWebsiteData(site, fetchService) {
    const response = await fetchService.fetchAvailability(site);
    const results = extractAvailability(response);
    return {
        ...site.public,
        ...results,
        hasAvailability: Object.keys(results.availability).length > 0,
        timestamp: moment().format(),
    };
}

async function fetchAvailability(site) {
    const bodyString = bodyParamString(site.private.calendar);

    const response = await fetch(site.private.scrapeUrl, {
        headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: bodyString,
        method: "POST",
    })
        .then((res) => res.text())
        .then((html) => {
            return html;
        })
        .catch((error) => console.log(`error fetching availability: ${error}`));

    return response;
}

function extractAvailability(calendarHtml) {
    const results = {
        availability: {},
    };
    if (calendarHtml.includes("no-times-available-message")) {
        return results;
    } else {
        // parse calendarHtml
        const root = htmlParser.parse(calendarHtml);
        const slots = root.querySelectorAll(".time-selection");
        results.availability = {
            numberAvailableAppointments: slots.length,
            hasAvailability: true,
        };
        return results;
    }
}

function bodyParamString(calendar) {
    return [
        "type=20223228",
        `calendar=${calendar}`,
        "options%5Bqty%5D=1",
        "options%5BnumDays%5D=27",
        "ignoreAppointment=",
        "appointmentType=",
        "calendarID=",
    ].join("&");
}
