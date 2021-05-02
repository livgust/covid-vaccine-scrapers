const { site } = require("./config");
const rxTouch = require("../../lib/RxTouch.js");
const moment = require("moment");

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const webData = await rxTouch.ScrapeRxTouch(browser, site, site.name, 5954);
    const individualLocationData = Object.values(webData).map((loc) => {
        return {
            name: `${site.name}`,
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
        parentLocationName: "Hannaford",
        isChain: true,
        timestamp: moment().format(),
        individualLocationData,
    };
};
