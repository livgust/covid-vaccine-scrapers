const sites = require("../data/sites.json");
const rxTouch = require("../lib/RxTouch.js");
const moment = require("moment");

const siteName = "Hannaford";
const site = sites[siteName];

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${siteName} starting.`);
    const webData = await rxTouch.ScrapeRxTouch(browser, site, siteName);
    console.log(`${siteName} done.`);
    return site.locations.map((loc) => {
        const response = webData[loc.zip];
        return {
            name: `${siteName} (${loc.city})`,
            hasAvailability: !!Object.keys(response.availability).length,
            extraData: response.message,
            availability: response.availability,
            signUpLink: site.website,
            ...loc,
            timestamp: moment().format(),
        };
    });
};
