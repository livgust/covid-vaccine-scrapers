const sites = require("../data/sites.json");

const siteName = "CVS";
const site = sites[siteName];

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${siteName} starting.`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${siteName} done.`);
    return webData.responsePayloadData.data.MA.map((responseLocation) => {
        let hasAvailability = parseInt(responseLocation.totalAvailable)
            ? true
            : false;
        let totalAvailability = parseInt(responseLocation.totalAvailable);
        let availability = {};
        responseLocation.city = toTitleCase(responseLocation.city);
        return {
            name: `${siteName} (${responseLocation.city})`,
            hasAvailability,
            availability,
            totalAvailability,
            timestamp: webData.responsePayloadData.currentTime,
            signUpLink: site.website,
            ...responseLocation,
        };
    });
};

function toTitleCase(str) {
    return str
        .toLowerCase()
        .split(" ")
        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
        .join(" ");
}

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(site.website, { waitUntil: "domcontentloaded" });
    const massLinkSelector = "a[data-modal='vaccineinfo-MA']";
    await page.waitForSelector(massLinkSelector);
    const [searchResponse, ...rest] = await Promise.all([
        page.waitForResponse(site.massJson),
        page.click(massLinkSelector),
    ]);
    const response = (await searchResponse.buffer()).toString();
    return JSON.parse(response);
}
