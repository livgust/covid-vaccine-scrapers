const { site } = require("./config");
const moment = require("moment");

const noAppointmentMatchString =
    "All appointment types are private, none are available for scheduling.";

/*
 * This function calls ScrapeWebsiteData to gather availability data from the
 * site
 *
 * @param browser created when Puppeteer connects to a Chromium instance
 * @return JSON blob with { hasAvailability: Bool, totalAvailability: Int }
 */
module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${site.name} done.`);
    return {
        parentLocationName: "Heywood Healthcare",
        timestamp: moment().format(),
        individualLocationData: [
            {
                ...site,
                ...webData,
            },
        ],
    };
};

/*
 * This function uses Puppeteer to scrape availability data from the
 * site
 *
 * @param browser created when Puppeteer connects to a Chromium instance
 * @return JSON blob with { hasAvailability: Bool, totalAvailability: Int }
 */
async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(site.signUpLink);
    const alertElement = await page.waitForSelector(
        "div.alert[data-qa=error-notice]"
    );
    const alert = await (alertElement
        ? alertElement.evaluate((node) => node.innerText)
        : false);
    let hasAvailability = false;
    let totalAvailability = 0;
    let date = false;
    if (!alert) {
        // Pull table with appointments
        const dateElement = await page.$(
            "div#step-pick-appointment table.class-list > tbody > tr.class-date-row > td > span.babel-ignore"
        );
        if (dateElement) {
            date = await dateElement.evaluate((node) => node.innerText);
        }
        const spotsArray = await page.$$eval(
            "div#step-pick-appointment table.class-list > tbody > tr.class-class-row > td.class-signup-container > div.class-spots",
            (spots) => {
                return spots.map((spot) => spot.innerText.split(" ")[0]);
            }
        );
        spotsArray.forEach((element) => {
            let spotNum = parseInt(element);
            if (Number.isInteger(spotNum)) {
                totalAvailability += spotNum;
            }
        });

        if (totalAvailability > 0) {
            hasAvailability = true;
        }
    }

    return {
        hasAvailability,
        totalAvailability,
    };
}
