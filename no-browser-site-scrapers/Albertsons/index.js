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
        // Raw address is like: (Star Market 4587 - 45 William T Morrissey Blvd, Dorchester, MA, 02125)
        // The format seems to be very consistent nationally, not to mention locally in MA. So we
        // pull the specific parts out of the string.
        const rawAddress = location.address;
        const trimmedAddress = rawAddress.replace(/^\(|\)$/, ""); // Trim parens
        const [name, longAddress] = trimmedAddress.split(" - ");
        const [address, city, state, zip] = longAddress.split(", ");
        const retval = {
            name: name,
            city: city,
            address: address,
            state: state,
            zip: zip,
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
