const sites = require("../data/sites.json");
const https = require("https");

module.exports = async function GetAvailableAppointments(browser) {
    console.log("PriceChopper starting.");
    const webData = await ScrapeWebsiteData(browser);
    console.log("PriceChopper done.");
    return sites.PriceChopper.locations.map((loc) => {
        const newLoc = { ...loc };
        const response = webData[loc.id];
        let hasAvailability = response[0].visibleTimeSlots.length ? 1 : 0;
        return {
            name: `PriceChopper (${loc.city})`,
            hasAvailability,
            signUpLink: sites.PriceChopper.signUpLink,
            ...loc,
        };
    });
};

async function ScrapeWebsiteData(browser) {
    
    const rawData = {};

    for (const loc of [...new Set(sites.PriceChopper.locations)]) {

        let url = [
            sites.PriceChopper.websiteRoot,
            loc.zip
        ].join('/') + '?state=' + loc.state;
        
        const p = new Promise((resolve) => {
            let response = "";
            https.get(url, (res) => {
                let body = "";
                res.on("data", (chunk) => {
                    body += chunk;
                });
                res.on("end", () => {
                    response = JSON.parse(body);
                    resolve(response);
                });
            });
        });

        rawData[loc.id] = await p;
    };

    return rawData;
}
