const https = require("https");
const sites = require("../data/sites.json");

const siteName = "CVS";
const site = sites[siteName];

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${siteName} starting.`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${siteName} done.`);
    // Javascript is not good at timezones. CVS's timestamp arrives in
    // Mountain time ("America/Denver"), and we need to convert it to
    // UTC. Since the offset changes twice a year, we need to
    // calculate the current offset, and then parse CVS's currentTime
    // using it.
    // The best we can do is render the time in two timezones, parse those as dates
    // and subtract them, and convert them from milliseconds to hours.
    const now = new Date(); // 2021-02-20T04:52:15.444Z
    const offsetMountain =
        ["America/Denver", "UTC"]
            .map((z) =>
                Date.parse(now.toLocaleString("en-US", { timeZone: z }))
            )
            .reduce((a, b) => b - a) /
        (3600 * 1000);
    // This would fail if offsetMountain were 2 digits, but it will only ever be 6 or 7.
    const timestamp = new Date(
        `${webData.responsePayloadData.currentTime}-0${offsetMountain}:00`
    );
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
            timestamp: timestamp,
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
    const url = site.massJson;
    const getUrl = new Promise((resolve) => {
        let response = "";
        https.get(
            url,
            {
                headers: {
                    Referer:
                        "https://www.cvs.com/immunizations/covid-19-vaccine",
                },
            },
            (res) => {
                let body = "";
                res.on("data", (chunk) => (body += chunk));
                res.on("end", () => {
                    response = JSON.parse(body);
                    resolve(response);
                });
            }
        );
    });
    const responseJson = await getUrl;
    return responseJson;
}
