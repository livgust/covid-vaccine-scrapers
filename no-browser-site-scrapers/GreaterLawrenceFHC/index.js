const { sites, provider } = require("./config");
const fetch = require("node-fetch");
const htmlParser = require("node-html-parser");
const moment = require("moment");

const { sendSlackMsg } = require("../../lib/slack");
const s3 = require("../../lib/s3");

module.exports = async function GetAvailableAppointments(
    _ignored,
    fetchService = liveFetchService()
) {
    console.log(`${provider} starting.`);

    const results = [];

    for (const site of sites) {
        const websiteData = await ScrapeWebsiteData(site, fetchService);
        console.log(
            `${site.public.name}: slots = ${websiteData.availability.numberAvailableAppointments}`
        );
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

/*
node-fetch (Chrome)
fetch("https://glfhccovid19iz.as.me/schedule.php?action=showCalendar&fulldate=1&owner=21956779&template=weekly&location=Central+Plaza%2C+2+Water+Street%2C+Haverhill+MA", {
  "headers": {
    "accept": "*\/*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    "sec-ch-ua": "\"Google Chrome\";v=\"89\", \"Chromium\";v=\"89\", \";Not A Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-requested-with": "XMLHttpRequest",
    "cookie": "PHPSESSID=s722u406dvg4rrcmu226r3hq1u"
  },
  "referrer": "https://glfhccovid19iz.as.me/schedule.php?location=Central+Plaza%2C+2+Water+Street%2C+Haverhill+MA",
  "referrerPolicy": "same-origin",
  "body": "type=20223228&calendar=5236989&skip=true&options%5Bqty%5D=1&options%5BnumDays%5D=3&ignoreAppointment=&appointmentType=&calendarID=",
  "method": "POST",
  "mode": "cors"
});

*/
