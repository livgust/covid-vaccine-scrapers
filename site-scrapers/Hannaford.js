const s3 = require("../lib/s3");
const sites = require("../data/sites.json");

const siteName = "Hannaford";
const site = sites[siteName];
const noAppointmentMatchString = "no locations with available appointments";

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${siteName} starting.`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${siteName} done.`);
    return site.locations.map((loc) => {
        const newLoc = { ...loc };
        const response = webData[loc.zip];
        return {
            name: `${siteName} (${loc.city})`,
            hasAvailability: response.indexOf(noAppointmentMatchString) == -1,
            extraData: response.length
                ? response.substring(1, response.length - 1)
                : response, //take out extra quotes
            signUpLink: site.website,
            ...loc,
            timestamp: new Date(),
        };
    });
};

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(site.website);
    await page.solveRecaptchas().then(({ solved }) => {
        if (solved.length) {
            return page.waitForNavigation();
        } else {
            return;
        }
    });

    const results = {};

    for (const loc of [...new Set(site.locations)]) {
        if (!results[loc.zip]) {
            await page.evaluate(
                () => (document.getElementById("zip-input").value = "")
            );
            await page.type("#zip-input", loc.zip);
            const [searchResponse, ...rest] = await Promise.all([
                Promise.race([
                    page.waitForResponse(
                        "https://hannafordsched.rxtouch.com/rbssched/program/covid19/Patient/CheckZipCode"
                    ),
                    page.waitForNavigation(),
                ]),
                page.click("#btnGo"),
            ]);
            const result = (await searchResponse.buffer()).toString();
            //if there's something available, log it with a unique name so we can check it out l8r g8r
            if (result.indexOf(noAppointmentMatchString) == -1) {
                // theoretically found appointments
                if (!process.env.DEVELOPMENT) {
                    await s3.savePageContent(`${siteName}-${loc.zip}`, page);
                }
            }
            results[loc.zip] = result;
        }
    }

    return results;
}
