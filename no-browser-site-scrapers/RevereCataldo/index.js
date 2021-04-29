// This clinic runs every Sunday, the URL to hit would need to be updated weekly
const https = require("https");
const moment = require("moment");

async function GetAvailableAppointments() {
    console.log("Revere Cataldo starting");
    const recurrentCataldoClinic = await ScrapeWebsiteData();
    console.log("Revere Cataldo completed");
    return {
        parentLocationName: "Revere Cataldo Clinic",
        timestamp: moment().format(),
        individualLocationData: [recurrentCataldoClinic],
    };
}

async function ScrapeWebsiteData() {
    // This would need to be updated regularly, there are emails you can sign up
    // to receive from the city @Revere.org that would have the relevant url every week
    const url =
        "https://home.color.com/api/v1/vaccination_appointments/availability?calendar=7f6e2ddb-08b1-4471-8e15-8ef27897e1ed&collection_site=Revere&dob=1997-04-02";
    const availabilityPromise = new Promise((resolve) => {
        https
            .get(url, (res) => {
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
                    `Error making request for Revere Cataldo popup: + ${e}`
                );
            })
            .end();
    });

    const availabilityResponse = await availabilityPromise;
    const availability = JSON.parse(availabilityResponse).results;
    const results = {
        hasAvailability: false,
        availability: {},
        name: "Rumney Marsh Academy - Cataldo Clinic",
        street: "140 American Legion Hwy",
        city: "Revere",
        zip: "02151",
        extraData:
            "Pfizer. Pre-registration tent will be on City Hall Lawn this week, Wed- Fri 11-3pm",
        // This might need to change weekly as well
        signUpLink: "https://www.cic-health.com/revere/rumneymarsh",
    };
    // logic borrowed from the Color scraper
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
            let appointmentDateET = appointmentDateGMT.toLocaleString("en-US", {
                timeZone: "America/New_York",
            });
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
            dateAvailability["numberAvailableAppointments"] += remainingSpaces;
            dateAvailability["hasAvailability"] = true;
            memo["hasAvailability"] = true;
        }
        return memo;
    }, results);

    return results;
}

module.exports = GetAvailableAppointments;
