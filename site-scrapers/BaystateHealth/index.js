const { site } = require("./config");

const noAppointmentMatchString = "Registration Temporarily Unavailable";

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
        return {
            ...site,
            ...webData,
            timestamp: new Date(),
        };
    } else {
        await console.log(`${site.name} starting.`);
        const page = await browser.newPage();
        await page.goto(site.signUpLink);
        const webData = await ScrapeWebsiteData(browser);
        await console.log(`${site.name} done.`);
        return {
            ...site,
            ...webData,
            timestamp: new Date(),
        };
    }
};

async function ScrapeWebsiteData(browser) {
    let pageArray = await browser.pages();
    const page = pageArray[1];
    const signUpPageSelector = "div > div > section > div > div > p > a";
    await page.waitForSelector(signUpPageSelector, { visible: true });

    let signUpPageElement = await page.$(signUpPageSelector);
    await page.evaluateHandle((el) => {
        el.target = "_self";
    }, signUpPageElement);
    await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0" }),
        page.click(signUpPageSelector),
    ]);

    // Is the clinic open?
    const alertElement = await page.$(
        "app-guest-covid-vaccine-register > div > div > div > h3"
    );
    let alert = alertElement
        ? await alertElement.evaluate((node) => node.innerText)
        : false;
    let hasAppointments = false;
    let totalAvailability = 0;
    let date = false;
    if (!alert) {
        // TBD: Are there appointments?
    }

    return {
        hasAppointments: hasAppointments,
        totalAvailability: totalAvailability,
    };
}
