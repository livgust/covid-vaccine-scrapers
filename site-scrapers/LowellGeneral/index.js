const { site } = require("./config");
const {
    buildTimeSlotsUrl,
    getStationTimeslots,
    parseAvailability,
    groupAppointmentsByDate,
    getNodeId,
} = require("./functions");
const moment = require("moment");

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${site.name} done.`);
    return {
        parentLocationName: "Lowell General",
        timestamp: moment().format(),
        individualLocationData: [webData],
    };
};

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(site.startUrl, { waitUntil: "networkidle0" });
    const { noAppointments, startUrl, ...restSite } = site;
    const noAppointmentsMatch = (await page.content()).match(noAppointments);
    let hasAvailability = false;
    let availability = {};
    if (noAppointmentsMatch) {
        // This is so we avoid timing out when there aren't any appointments
        return {
            hasAvailability,
            availability,
            ...restSite,
        };
    }
    const stationSelector = "[id*='time_slots_for_doctor_']";
    await page.waitForSelector(stationSelector);
    let stations = await page.$$(stationSelector);
    for (const station of stations) {
        const stationId = await getNodeId(station);
        const url = buildTimeSlotsUrl(stationId);
        const xhrRes = await getStationTimeslots(page, url);
        const parsedData = parseAvailability(xhrRes);
        // Only set availability if still false.
        // If one station has availability,
        // then hasAvailability should stay true.
        if (!hasAvailability) {
            hasAvailability = parsedData.hasAvailability;
        }
        availability = groupAppointmentsByDate(
            availability,
            parsedData.availability
        );
    }
    // Sort the keys since we get dates out of order.
    availability = Object.keys(availability)
        .sort()
        .reduce((obj, key) => {
            obj[key] = availability[key];
            return obj;
        }, {});

    return {
        hasAvailability,
        availability,
        ...site,
        timestamp: new Date(),
    };
}
