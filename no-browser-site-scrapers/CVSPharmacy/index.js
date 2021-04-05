const { site } = require("./config");
const { toTitleCase } = require("../../lib/stringUtil");
const https = require("https");

module.exports = async function GetAvailableAppointments() {
    console.log(`${site.name} starting.`);
    const webData = await ScrapeWebsiteData();
    console.log(`${site.name} done.`);
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
        // Prior to Feb 22 or so, CVS's JSON returned:
        //  {
        //    "totalAvailable": "0",
        //    "city": "CAMBRIDGE",
        //    "state": "MA",
        //    "pctAvailable": "0.00%",
        //    "status": "Fully Booked"
        //  },
        //
        // But as of Feb. 25 it returns:
        //  {
        //    "city": "CAMBRIDGE",
        //    "state": "MA",
        //    "status": "Fully Booked"
        //  },
        // It's not clear whether we can expect the other fields to return when there is
        // availability.
        // Also, we had previously seen cases where numeric availability was "0" but status
        // was "Available" and it's not apparent what that really meant (skew? bugs?).
        const totalAvailability =
            responseLocation.totalAvailable &&
            parseInt(responseLocation.totalAvailable);
        const city = toTitleCase(responseLocation.city);
        const retval = {
            city: city,
            name: `${site.name} (${city})`,
            hasAvailability: responseLocation.status !== "Fully Booked",
            availability: {},
            timestamp: new Date(),
            siteTimestamp: timestamp,
            signUpLink: site.website,
        };
        if (totalAvailability) {
            retval.totalAvailability = totalAvailability;
        }
        return retval;
    });
};

function urlContent(url, options) {
    return new Promise((resolve) => {
        let response = "";
        https.get(url, options, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
                response = body;
                resolve(response);
            });
        });
    });
}

async function ScrapeWebsiteData() {
    // Simply retrieving
    //   https://www.cvs.com/immunizations/covid-19-vaccine.vaccine-status.ma.json?vaccineinfo
    // returns potentially stale data that varies based on the Akamai Edgekey server that you access.
    // Append a cachebusting
    //   &nonce=&nonce=1613934207668
    // to bypass Akamai caching.
    const url = `${site.massJson}&nonce=${new Date().valueOf()}`;
    const options = { headers: { Referer: site.website } };
    return JSON.parse(await urlContent(url, options));
}
