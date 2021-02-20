const sites = require("../data/sites.json");
const https = require("https");

module.exports = async function GetAvailableAppointments() {
    console.log("Harrington starting.");
    const webData = await ScrapeWebsiteData();
    console.log("Harrington done.");
    return {
        ...sites.Harrington,
        ...webData,
        timestamp: new Date(),
    };
};

async function ScrapeWebsiteData() {
    const p = new Promise((resolve) => {
        let response = "";
        https.get(sites.Harrington.website, (res) => {
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
        const date = new Date(`${dateEntry.edate}T00:00`);
        let midnightToday = new Date();
        midnightToday.setHours(0, 0, 0, 0);
        if (date >= midnightToday) {
            const slotsAvailable =
                dateEntry.jobstotal - dateEntry.jobstotalassignments;
            results.availability[
                `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
            ] = {
                numberAvailableAppointments: slotsAvailable,
                hasAvailability: !!slotsAvailable,
            };
            if (slotsAvailable) {
                results.hasAvailability = true;
            }
        }
    }
    return results;
}
