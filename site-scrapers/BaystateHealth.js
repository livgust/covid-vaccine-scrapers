const sites = require("../data/sites.json");

const noAppointmentMatchString =
    "Registration Temporarily Unavailable";

module.exports = async function GetAvailableAppointments(browser) {
    console.log(sites.BaystateHealth.name + " starting.");
    const webData = await ScrapeWebsiteData(browser);
    console.log(sites.BaystateHealth.name + " finished.");
    return {
        ...sites.BaystateHealth,
        ...webData,
        timestamp: new Date(),
    };
};

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    const signUpPageSelector = "div > div > section > div > div > p > a";
    await page.goto(sites.BaystateHealth.website);
    await page.waitForSelector(signUpPageSelector,
        { visible: true });

    // Replace _blank with _self to ease interaction through Puppeteer
    // Thanks StackOverflow!
    let signUpPageElement = await page.$(signUpPageSelector);
    await page.evaluateHandle((el) => {
        el.target = '_self';
    }, signUpPageElement)
    await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0" }),
        page.click(signUpPageSelector),
    ]);

    // Is the clinic open?
    const alert = await (
        await page.$("app-guest-covid-vaccine-register > div > div > div > h3")
    ).evaluate((node) => node.innerText);

    return {
        hasAvailability: alert.indexOf(noAppointmentMatchString) === -1,
    };
}
