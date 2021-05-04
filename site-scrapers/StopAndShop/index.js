const { site } = require("./config");
const rxTouch = require("../../lib/RxTouch.js");
const moment = require("moment");

function TitleCase(str) {
    if (!str) return str;

    return str
        .trim()
        .toLowerCase()
        .split(" ")
        .map(function (word) {
            return !word ? word : word.replace(word[0], word[0].toUpperCase());
        })
        .join(" ");
}

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const webData = await rxTouch.ScrapeRxTouch(
        browser,
        site,
        "StopAndShop",
        5957
    );

    const individualLocationData = Object.values(webData).map((loc) => {
        return {
            name: `Stop & Shop`,
            street: TitleCase(loc.street),
            city: TitleCase(loc.city),
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
