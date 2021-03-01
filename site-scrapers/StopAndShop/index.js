const { site } = require("./config");
const rxTouch = require("../../lib/RxTouch.js");

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const webData = await rxTouch.ScrapeRxTouch(browser, site, site.name);
    console.log(`${site.name} done.`);
    return site.locations.map((loc) => {
        const response = webData[loc.zip];
        return {
            name: `${site.name} (${loc.city})`,
            hasAvailability: false, // with current impl of rxTouch, we can't determine for sure if there's availability yet
            extraData:
                response && response.length
                    ? response.substring(1, response.length - 1) //take out extra quotes
                    : response,
            signUpLink: site.website,
            ...loc,
            timestamp: new Date(),
        };
    });
};
