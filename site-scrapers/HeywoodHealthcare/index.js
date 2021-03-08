const { site } = require("./config");

const noAppointmentMatchString =
    "All appointment types are private, none are available for scheduling.";

/*
 * This function calls ScrapeWebsiteData to gather availability data from the
 * site
 *
 * @param browser created when Puppeteer connects to a Chromium instance
 * @return JSON blob with { hasAppointments: Bool, totalAvailability: Int }
 */
module.exports = async function GetAvailableAppointments(browser) {
    if (browser.browserContexts().length > 1) {
        await console.log(`${site.name} testsuite started...`);
        const webData = await ScrapeWebsiteData(browser);
        await console.log(`${site.name} testsuite finished...`);
        return webData;
    } else {
        await console.log(`${site.name} starting.`);
        const page = await browser.newPage();
        await page.goto(site.signUpLink);
        const webData = await ScrapeWebsiteData(browser);
        await console.log(`${site.name} done.`);
        return webData;
    }
};

/*
 * This function uses Puppeteer to scrape availability data from the
 * site
 *
 * @param browser created when Puppeteer connects to a Chromium instance
 * @return JSON blob with { hasAppointments: Bool, totalAvailability: Int }
 */
async function ScrapeWebsiteData(browser) {
    let pageArray = await browser.pages();
    const page = pageArray[1];
    // Is the clinic open?
    const alertElement = await page.$("div.alert[data-qa=error-notice]");
    let alert = alertElement
        ? await alertElement.evaluate((node) => node.innerText)
        : false;
    let hasAppointments = false;
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
            hasAppointments = true;
        }
    }

    return {
        hasAppointments: hasAppointments,
        totalAvailability: totalAvailability,
    };
}
