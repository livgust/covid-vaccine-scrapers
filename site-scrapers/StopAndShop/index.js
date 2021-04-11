const { site } = require("./config");
const rxTouch = require("../../lib/RxTouch.js");
const moment = require("moment");

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const webData = await rxTouch.ScrapeRxTouch(browser, site, "StopAndShop");
    const individualLocationData = Object.values(webData).map((loc) => {
        return {
            name: `Stop & Shop (${loc.city})`,
            street: loc.street,
            city: loc.city,
            zip: loc.zip,
            hasAvailability: !!Object.keys(loc.availability).length,
            extraData: loc.message,
            debug: loc.debug,
            availability: loc.availability,
            signUpLink: site.website,
        };
    });
    console.log(`${site.name} done.`);
    return {
        parentLocationName: "Stop & Shop",
        timestamp: moment().format(),
        isChain: true,
        individualLocationData,
    };
};
