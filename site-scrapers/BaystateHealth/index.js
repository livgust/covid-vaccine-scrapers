const { site } = require("./config");
const { sendSlackMsg } = require("../../lib/slack");
const s3 = require("../../lib/s3");
const moment = require("moment");

/*
 * This function calls ScrapeWebsiteData to gather availability data from the
 * site
 *
 * @param browser created when Puppeteer connects to a Chromium instance
 * @return JSON blob with { hasAppointments: Bool, totalAvailability: Int }
 */
module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${site.name} done.`);
    return {
        parentLocationName: "Baystate Health",
        timestamp: moment().format(),
        individualLocationData: [
            {
                ...site,
                ...webData,
            },
        ],
    };
};

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(site.signUpLink);
    const alertElement = await Promise.race([
        page.waitForTimeout(3000).then(null),
        page.waitForSelector(
            "app-guest-covid-vaccine-register.ion-page > div.sky-bg > div.content-body > div.content-card > h3.text-align-center"
        ),
    ]);
    // Is the clinic open?
    const alert = await (alertElement
        ? alertElement.evaluate((node) => node.innerText)
        : false);
    let hasAvailability = !alert;

    return {
        hasAvailability,
    };
}
