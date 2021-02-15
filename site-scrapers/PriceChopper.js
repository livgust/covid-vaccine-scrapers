const sites = require("../data/sites.json");
const https = require("https");
const crypto = require('crypto');

const siteName = 'Price Chopper';
const site = sites[siteName];

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${siteName} starting.`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${siteName} done.`);
    return site.locations.map((loc) => {
        const locHash = md5HashString(loc.street + loc.city);
        const responseLocation = webData[locHash];
        let hasAvailability = false;
        let availability = {};
        if(responseLocation && responseLocation.visibleTimeSlots) {
            hasAvailability = responseLocation.visibleTimeSlots.length ? true : false;
            for(let [i, timeSlot] of responseLocation.visibleTimeSlots.entries()) {
                let date = timeSlot.time.split('T')[0];
                if(!availability[date]){
                    availability[date] = {
                        hasAvailability: true,
                        numberAvailableAppointments: 0
                    };
                }
                availability[date].numberAvailableAppointments += 1;
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

function md5HashString(string){
    return crypto.createHash('md5').update(string).digest('hex');
}

async function ScrapeWebsiteData(browser) {
    const rawData = {};
    for (let [i , loc] of site.locations.entries()) {
        let url = [
            site.websiteRoot,
            loc.zip
        ].join('/') + '?state=' + loc.state;
        const locHash = md5HashString(loc.street + loc.city);
        if(!rawData[locHash]){
            const getUrl = new Promise((resolve) => {
                let response = "";
                https.get(url, (res) => {
                    let body = "";
                    res.on("data", (chunk) => body += chunk);
                    res.on("end", () => {
                        response = JSON.parse(body);
                        resolve(response);
                    });
                });
            });
            let responseJson = await getUrl;
            responseJson.map((responseLoc) => {
                const responseLocHash = md5HashString(responseLoc.address1 + responseLoc.city);
                if(responseLocHash == locHash){
                    rawData[locHash] = responseLoc;
                }
            });
        }
    };
    return rawData;
}
