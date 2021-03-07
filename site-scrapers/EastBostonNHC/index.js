const { site } = require("./config");
const moment = require("moment");
const lodash = require("lodash");
const fetch = require("node-fetch");

module.exports = async function GetAvailableAppointments(
    _browser, // gets passed from main.js but we dont use it here
    availabilityService = getAvailabilityService()
) {
    console.log(`${site.name} starting.`);
    const webData = await GetAllAvailability(availabilityService);
    console.log(`${site.name} done.`);
    return site.locations.map((loc) => {
        const response = webData[loc.zip] || null;
        return {
            name: `${site.name} (${loc.city} - ${loc.zip})`,
            hasAvailability: !!response,
            availability: response?.availability || {},
            signUpLink: site.website,
            extraData: `Open to residents of the following neighborhoods: Chelsea (02150), East Boston (02128), Everett (02149), Revere (02151), South End (02118), Winthrop (02152)`,
            ...loc,
            timestamp: moment().format(),
        };
    });
};

async function GetAllAvailability(availabilityService) {
    const accessToken = (await availabilityService.getLoginResponse()).token;
    const rawAvailability = await availabilityService.getAvailabilityResponse(
        accessToken
    );
    return rawAvailability.response.reduce((acc, appointment) => {
        const zip = appointment.facility.postcode;
        const date = appointment.date.split("T")[0]; // get 2021-03-08 from 2021-03-08T22:40:00.000Z
        if (!acc[zip]) {
            // in case it's our first time seeing this zip...
            return {
                [zip]: {
                    availability: {
                        [date]: {
                            hasAvailability: true,
                            numberAvailableAppointments: 1,
                        },
                    },
                },
                ...acc,
            };
        }
        if (!acc[zip].availability[date]) {
            // in case we've seen this zip before, but not this date...
            return lodash.set(acc, `${zip}.availability.${date}`, {
                hasAvailability: true,
                numberAvailableAppointments: 1,
            });
        }
        // otherwise, we increment b/c we've seen this zip and date before
        return lodash.set(
            acc,
            `${zip}.availability.${date}.numberAvailableAppointments`,
            acc[zip].availability[date].numberAvailableAppointments + 1
        );
    }, {});
}

async function fetchResponse({ url, method, headers, body }) {
    return await fetch(url, {
        method,
        body,
        headers,
    }).then(
        (res) => res.json(),
        (err) => {
            console.error(err);
            return null;
        }
    );
}

function getAvailabilityService() {
    return {
        async getLoginResponse() {
            const data = JSON.stringify({ id: "600f45213901d90012deb171" });
            return await fetchResponse({
                url: "https://api.lumahealth.io/api/widgets/login",
                method: "POST",
                headers: {
                    "Content-Type": "application/json;charset=UTF-8",
                    "Content-Length": data.length,
                },
                body: data,
            });
        },

        async getAvailabilityResponse(accessToken) {
            // Getting availability over the next 20 days (this is what EastBostonNHC's website looks for)
            const startDate = moment().format("YYYY-MM-DD");
            const endDate = moment().add(20, "days").format("YYYY-MM-DD");

            return await fetchResponse({
                url: [
                    "https://api.lumahealth.io/api/scheduler/availabilities?appointmentType=6011f3c4fa2b92009a1c0f43",
                    `date=%3E${startDate}T00%3A00%3A00-05%3A00`,
                    `date=%3C${endDate}T23%3A59%3A59-04%3A00`,
                    "facility=6011f3c1fa2b92009a1c0e28%2C6011f3c1fa2b92009a1c0e24%2C601a236ff7f880001333e993%2C601a236ff7f880001333e993%2C6011f3c1fa2b92009a1c0e2a",
                    "includeNullApptTypes=true",
                    "limit=100",
                    "page=1",
                    "patientForm=603fd7026345ba0013a476ef",
                    "populate=true",
                    "provider=601a24ac98d5e900120d2582%2C6011f3c2fa2b92009a1c0e59%2C6011f3c2fa2b92009a1c0e69%2C6011f3c2fa2b92009a1c0e6d",
                    "sort=date",
                    "sortBy=asc",
                    "status=available",
                ].join("&"),
                method: "GET",
                headers: {
                    "x-access-token": accessToken,
                },
            });
        },
    };
}
