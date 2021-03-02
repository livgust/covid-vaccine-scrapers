const { site } = require("./config");

const noAppointmentMatchString =
    "All appointment types are private, none are available for scheduling.";

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${site.name} done.`);
    return webData;
};

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(site.signUpLink);
    // Is the clinic open?
    const alertElement = await page.$("div.alert[data-qa=error-notice]");
    let alert = alertElement
        ? await alertElement.evaluate((node) => node.innerText)
        : null;

    return {
        hasAvailability: alert.indexOf(noAppointmentMatchString) === -1,
    };
}
