const { site } = require("./config");
const https = require("https");
const moment = require("moment");

module.exports = async function GetAvailableAppointments() {
    console.log(`${site.name} starting.`);
    const {
        name,
        website,
        signUpLink,
        restrictedWebsite,
        restrictedSignUpLink,
        ...restHarrington
    } = site;
    const webData = await ScrapeWebsiteData(website);
    const restrictedWebData = await ScrapeWebsiteData(restrictedWebsite);
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

async function ScrapeWebsiteData(website) {
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
    return results;
}
