const sites = require("../data/sites.json");
const https = require("https");
const crypto = require("crypto");

const siteName = "Price Chopper";
const site = sites[siteName];

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${siteName} starting.`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${siteName} done.`);
    return site.locations.map((loc) => {
        const locHash = md5HashString(loc.street + loc.city);
        const responseLocation = webData[locHash];
        let hasAvailability = false;
        const availability = {};
        if (responseLocation && responseLocation.visibleTimeSlots) {
            hasAvailability = !!responseLocation.visibleTimeSlots.length;
            for (const [
                i,
                timeSlot,
            ] of responseLocation.visibleTimeSlots.entries()) {
                const date = new Date(timeSlot.time.split("T")[0]);
                const formattedDate = `${date.getMonth() + 1}/${
                    date.getDate() + 1
                }/${date.getFullYear()}`;
                if (!availability[formattedDate]) {
                    availability[formattedDate] = {
                        hasAvailability: true,
                        numberAvailableAppointments: 0,
                    };
                }
                availability[formattedDate].numberAvailableAppointments += 1;
            }
        }
        return {
            name: `${siteName} (${loc.city})`,
            hasAvailability,
            availability,
            signUpLink: site.signUpLink,
            ...loc,
        };
    });
};

function md5HashString(string) {
    return crypto.createHash("md5").update(string).digest("hex");
}

async function ScrapeWebsiteData(browser) {
    const rawData = {};
    for (const [i, loc] of site.locations.entries()) {
        const url =
            [site.websiteRoot, loc.zip].join("/") + "?state=" + loc.state;
        const locHash = md5HashString(loc.street + loc.city);
        if (!rawData[locHash]) {
            const getUrl = new Promise((resolve) => {
                let response = "";
                https.get(url, (res) => {
                    let body = "";
                    res.on("data", (chunk) => (body += chunk));
                    res.on("end", () => {
                        response = JSON.parse(body);
                        resolve(response);
                    });
                });
            });
            const responseJson = await getUrl;
            responseJson.map((responseLoc) => {
                const responseLocHash = md5HashString(
                    responseLoc.address1 + responseLoc.city
                );
                if (responseLocHash === locHash) {
                    rawData[locHash] = responseLoc;
                }
            });
        }
    }
    return rawData;
}
