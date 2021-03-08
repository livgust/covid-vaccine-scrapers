const { site } = require("./config");

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const info = await ScrapeWebsiteData(browser);
    console.log(`${site.name} starting.`);
    return {
        ...site,
        signUpLink: site.website,
        ...info,
        timestamp: new Date(),
    };
};

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(site.website);
    // evidently the loading spinner doesn't always show up? so we'll let these silently fail if they time out.
    await page
        .waitForSelector(".loadingSpinner", { visible: true })
        .catch(() => {});
    await page
        .waitForSelector(".loadingSpinner", { hidden: true })
        .catch(() => {});

    const content = await page.content();

    const result = {
        hasAvailability:
            content.indexOf(
                "There are currently no time slots available for vaccinations."
            ) == -1,
    };

    return result;
}
