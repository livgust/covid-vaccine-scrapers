const { site } = require("./config");
const moment = require("moment");
const s3 = require("../../lib/s3");
const { sendSlackMsg } = require("../../lib/slack");

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${site.name} done.`);
    return {
        ...site,
        ...webData,
        timestamp: moment().format(),
    };
};

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(site.signUpLink, { waitUntil: "networkidle0" });
    await page.waitForSelector("div");

    let hasAvailability = false;
    let availability = {};

    return {
        hasAvailability,
        availability,
    };
}
