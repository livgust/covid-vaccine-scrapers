const { site } = require("./config");
const https = require("https");
const moment = require("moment");

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const {
        name,
        website,
        signUpDotComLink,
        signUpLink,
        restrictedWebsite,
        restrictedSignUpDotComLink,
        restrictedSignUpLink,
        ...restHarrington
    } = site;
    const webData = await ScrapeWebsiteData(website, signUpDotComLink, browser);
    const restrictedWebData = await ScrapeWebsiteData(
        restrictedWebsite,
        restrictedSignUpDotComLink,
        browser
    );
    console.log(`${site.name} done.`);

    return [
        {
            ...restHarrington,
            ...webData,
            name: `${name} (All MA residents)`,
            signUpLink: signUpLink,
            timestamp: moment().format(),
        },
        {
            ...restHarrington,
            ...restrictedWebData,
            name: `${name} (Local residents)`,
            signUpLink: restrictedSignUpLink,
            timestamp: moment().format(),
            restrictions:
                "Residents of the following towns, no exceptions: Auburn, Leicester, Southbridge, Sturbridge, Charlton, Spencer, Brookfield (North, East, West), Brimfield, Wales, Holland, Warren, Dudley, Webster, Oxford, and Sutton",
        },
    ];
};

async function ScrapeWebsiteData(website, signUpDotComLink, browser) {
    const p = new Promise((resolve) => {
        let response = "";
        //todayDate looks like "2020%2F12%2F16"
        let todayDate = moment().local().format();
        todayDate = todayDate
            .substring(0, todayDate.indexOf("T"))
            .replace(/-/g, "%2F");
        https.get(`${website}&startdate=${todayDate}`, (res) => {
            let body = "";
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                response = JSON.parse(body);
                resolve(response.data);
            });
        });
    });
    const data = await p;
    const results = { availability: {}, hasAvailability: false };
    for (const dateEntry of data) {
        //force midnight local time zone to avoid UTC dateline issues
        const date = moment(dateEntry.edate).local();
        const slotsAvailable =
            dateEntry.jobstotal - dateEntry.jobstotalassignments;
        results.availability[
            `${date.month() + 1}/${date.date()}/${date.year()}`
        ] = {
            numberAvailableAppointments: slotsAvailable,
            hasAvailability: !!slotsAvailable,
        };
        if (slotsAvailable) {
            results.hasAvailability = true;
        }
    }
    // check if the event is locked via the UI
    if (results.hasAvailability && signUpDotComLink) {
        const page = await browser.newPage();
        await page.goto(signUpDotComLink);
        await page
            .waitForSelector("#error_page", {
                timeout: 20000, //20s
            })
            .then(() => {
                //if we hit the error page, the event is locked.
                results.availability = {};
                results.hasAvailability = false;
            })
            .catch(() => {}); //if this times out, then we're good!
    }
    return results;
}
