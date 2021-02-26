const sites = require("../data/sites.json");

const noAppointmentMatchString =
    "All appointment types are private, none are available for scheduling.";

module.exports = async function GetAvailableAppointments(browser) {
    console.log(sites.HeywoodHealthcare.name + " starting.");
    const webData = await ScrapeWebsiteData(browser);
    console.log(sites.HeywoodHealthcare.name + " finished.");
    return {
        ...sites.HeywoodHealthcare,
        ...webData,
        timestamp: new Date(),
    };
};

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(sites.HeywoodHealthcare.signUpLink);
    // Is the clinic open?
    const alert = await (
        await page.$("div.alert[data-qa=error-notice]")
    ).evaluate((node) => node.innerText);

    return {
        hasAvailability: alert.indexOf(noAppointmentMatchString) === -1,
    };
}
