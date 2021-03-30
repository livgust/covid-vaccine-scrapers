const https = require("https");
const sites = require("./config");

const token = "bcd282a6fe22e6fc47e14be11a35b33fe1bc";
async function GetAvailableAppointments() {
    console.log("Color locations starting");
    const originalSites = sites;
    const finalSites = [];
    for (const site of originalSites) {
        const { siteUrl, ...rest } = site;
        const webData = await ScrapeWebsiteData(
            rest.name,
            siteUrl,
            rest.massVax
        );
        finalSites.push({
            ...rest,
            ...webData,
            timestamp: new Date(),
        });
    }
    console.log("Color locations complete");
    return finalSites;
}

async function ScrapeWebsiteData(siteName, siteUrl, massVax) {
    const availabilityUrl = `https://home.color.com/api/v1/vaccination_appointments/availability?claim_token=${token}&collection_site=${siteUrl}`;
    const availabilityPromise = new Promise((resolve) => {
        https
            .get(availabilityUrl, (res) => {
                let body = "";
                res.on("data", (chunk) => {
                    body += chunk;
                });
                res.on("end", () => {
                    resolve(body);
                });
            })
            .on("error", (e) => {
                console.error(
                    `Error making token request for ${siteName}: + ${e}`
                );
            })
            .end();
    });

    const availabilityResponse = await availabilityPromise;
    return formatResponse(availabilityResponse, massVax);
}

function formatResponse(availabilityResponse, massVax) {
    const availability = JSON.parse(availabilityResponse).results;
    const results = {
        hasAvailability: false,
        availability: {},
    };

    // If this is a massVax site that is invite-only, then we don't
    // need availability data.
    if (!massVax) {
        // Collect availability count by date
        availability.reduce((memo, currentValue) => {
            /* The availability returns an array of appointments like this:
                {
                    "start": "2021-02-22T14:00:00+00:00",
                    "end": "2021-02-22T14:04:00+00:00",
                    "capacity": 1,
                    "remaining_spaces": -1
    
                }
            */
            let remainingSpaces = currentValue["remaining_spaces"];
            if (remainingSpaces > 0) {
                const appointmentDateGMT = new Date(currentValue["start"]);
                let appointmentDateET = appointmentDateGMT.toLocaleString(
                    "en-US",
                    {
                        timeZone: "America/New_York",
                    }
                );
                appointmentDateET = appointmentDateET.substring(
                    0,
                    appointmentDateET.indexOf(",")
                );
                let dateAvailability = memo["availability"][appointmentDateET];
                if (!dateAvailability) {
                    dateAvailability = {
                        numberAvailableAppointments: 0,
                        hasAvailability: false,
                    };
                    memo["availability"][appointmentDateET] = dateAvailability;
                }
                dateAvailability[
                    "numberAvailableAppointments"
                ] += remainingSpaces;
                dateAvailability["hasAvailability"] = true;
                memo["hasAvailability"] = true;
            }
            return memo;
        }, results);
    }
    return results;
}

//ES5 way of doing named & default exports
const Color = (module.exports = GetAvailableAppointments);
Color.formatResponse = formatResponse;
