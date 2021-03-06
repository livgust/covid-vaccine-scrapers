const { site } = require("./config");
const https = require("https");
const crypto = require("crypto");
const moment = require("moment");
const { toTitleCase } = require("../../lib/stringUtil");

module.exports = async function GetAvailableAppointments() {
    console.log(`${site.name} starting.`);
    const webData = await ScrapeWebsiteData();
    const individualLocationData = Object.values(webData).map(
        (responseLocation) => {
            let hasAvailability = false;
            const availability = {};
            if (responseLocation && responseLocation.visibleTimeSlots) {
                hasAvailability = !!responseLocation.visibleTimeSlots.length;
                for (const timeSlot of responseLocation.visibleTimeSlots) {
                    //strip time so we group by date, but then force midnight local time zone to avoid UTC dateline issues
                    const date = new Date(
                        `${timeSlot.time.split("T")[0]}T00:00`
                    );
                    const formattedDate = `${
                        date.getMonth() + 1
                    }/${date.getDate()}/${date.getFullYear()}`;
                    if (!availability[formattedDate]) {
                        availability[formattedDate] = {
                            hasAvailability: true,
                            numberAvailableAppointments: 0,
                        };
                    }
                    availability[
                        formattedDate
                    ].numberAvailableAppointments += 1;
                }
            }
            return {
                name: `Price Chopper (${toTitleCase(responseLocation.city)})`,
                street: toTitleCase(responseLocation.address1),
                city: toTitleCase(responseLocation.city),
                state: responseLocation.state,
                zip: responseLocation.zipCode,
                hasAvailability,
                availability,
                signUpLink: site.signUpLink,
            };
        }
    );
    console.log(`${site.name} done.`);
    return {
        parentLocationName: "Price Chopper",
        isChain: true,
        individualLocationData,
        timestamp: moment().format(),
    };
};

function md5HashString(string) {
    return crypto.createHash("md5").update(string).digest("hex");
}

async function ScrapeWebsiteData() {
    const rawData = {};
    for (const zip of site.zips) {
        const url = [site.websiteRoot, zip].join("/") + "?state=MA&userAge=21";
        const getUrl = new Promise((resolve) => {
            let response = "";
            https.get(url, { rejectUnauthorized: false }, (res) => {
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
            rawData[responseLocHash] = responseLoc;
        });
    }
    return rawData;
}
