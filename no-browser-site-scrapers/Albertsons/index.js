const { site } = require("./config");
const { toTitleCase } = require("../../lib/stringUtil");
const https = require("https");
const { sendSlackMsg } = require("../../lib/slack");

module.exports = async function GetAvailableAppointments() {
    console.log(`${site.name} starting.`);
    const webData = await ScrapeWebsiteData();
    console.log(`${site.name} done.`);

    const massLocations = webData.filter(
        (location) => location.region == "Massachusetts"
    );
    return massLocations.map((location) => {
        const retval = {
            name: `${site.name} (${location.address})`,
            hasAvailability: location.availability == "true",
            signUpLink: location.coach_url,
            latitude: location.lat,
            longitude: location.long,
        };
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
    const url = `${site.nationalStoresJson}?v=${new Date().valueOf()}`;
    const options = { headers: { Referer: site.website } };
    return JSON.parse(await urlContent(url, options));
}
