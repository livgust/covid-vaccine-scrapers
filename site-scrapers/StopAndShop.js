const sites = require("../data/sites.json");
const rxTouch = require("../lib/RxTouch.js");

const siteName = "StopAndShop";
const site = sites[siteName];

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${siteName} starting.`);
    const webData = await rxTouch.ScrapeRxTouch(browser, site, siteName);
    console.log(`${siteName} done.`);
    return site.locations.map((loc) => {
        const response = webData[loc.zip];
        return {
            name: `Stop & Shop (${loc.city})`,
            hasAvailability: response.indexOf(rxTouch.noAppointmentMatchString) == -1,
            extraData: response.length
                ? response.substring(1, response.length - 1)
                : response, //take out extra quotes
            signUpLink: site.website,
            ...loc,
            timestamp: new Date(),
        };
    });
};

