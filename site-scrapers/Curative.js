const sites = require("../data/sites.json");
const https = require("https");

module.exports = async function GetAvailableAppointments(browser) {
    console.log("Curative starting.");
    const locationIDs = sites.Curative.locations.map((loc) => loc.id);

    const rawData = {};
    for (const id of locationIDs) {
        const p = new Promise((resolve) => {
            let response = "";
            https.get(sites.Curative.website + id, (res) => {
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
        rawData[id] = await p;
    }

    console.log("Curative (basically) done.");
    return sites.Curative.locations.map((loc) => {
        const data = rawData[loc.id];
        const mappedData = {
            id: loc.id,
            name: data.name,
            street: (
                data.street_address_1 +
                " " +
                data.street_address_2
            ).trim(),
            city: data.city,
            zip: data.postal_code,
            signUpLink: sites.Curative.linkWebsite + loc.id,
            hasAvailability: false,
            availability: {}, //date (MM/DD/YYYY) => hasAvailability, numberAvailableAppointments
            timestamp: new Date(),
        };
        data.appointment_windows.forEach((appointment) => {
            const dateRegexp = /(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})/;
            const { year, month, day } = appointment.start_time.match(
                dateRegexp
            ).groups;
            const date = `${month}/${day}/${year}`;
            let newNumberAvailable = 0;
            if (mappedData.availability[date]) {
                newNumberAvailable =
                    mappedData.availability[date].numberAvailableAppointments +
                    appointment.slots_available;
            }
            mappedData.availability[date] = {
                numberAvailableAppointments: newNumberAvailable,
                hasAvailability: !!newNumberAvailable,
            };

            if (!!newNumberAvailable) {
                mappedData.hasAvailability = true;
            }
        });

        return mappedData;
    });
};
