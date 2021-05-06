const { site } = require("./config");
const moment = require("moment");

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const info = await ScrapeWebsiteData(browser);
    console.log(`${site.name} done.`);
    return {
        parentLocationName: "UMass Amherst",
        timestamp: moment().format(),
        individualLocationData: [
            {
                ...site,
                ...info,
            },
        ],
    };
};

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(site.signUpLink);
    // evidently the loading spinner doesn't always show up? so we'll let these silently fail if they time out.
    await page
        .waitForSelector(".loadingSpinner", { visible: true })
        .catch(() => {});
    await page
        .waitForSelector(".loadingSpinner", { hidden: true })
        .catch(() => {});
    // Wait for the buttons to show up
    await page.waitForSelector(".slds-button").catch(() => {});

    const content = await page.content();

    const result = {
        hasAvailability:
            content.indexOf(
                "Sorry there are no time slots available at the moment to book first and second dose appointments, please check back later."
            ) == -1,
    };

    page.close();
    return result;
}
