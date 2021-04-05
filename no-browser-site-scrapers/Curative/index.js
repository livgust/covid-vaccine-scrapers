const { site } = require("./config");
const https = require("https");

module.exports = async function GetAvailableAppointments() {
    console.log(`${site.name} starting.`);
    const locationIDs = site.locations.map((loc) => loc.id);

    const rawData = {};
    for (const id of locationIDs) {
        const p = new Promise((resolve) => {
            let response = "";
            https.get(site.website + id, (res) => {
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

    console.log(`${site.name} (basically) done.`);
    return site.locations.map((loc) => {
        const data = rawData[loc.id];
        const results = {
            id: loc.id,
            name: data.name,
            street: (
                data.street_address_1 +
                " " +
                data.street_address_2
            ).trim(),
            city: data.city,
            zip: data.postal_code,
            signUpLink: site.linkWebsite + loc.id,
            massVax: !!loc.massVax, // This is a MassVax site that only allows preregistration
            hasAvailability: false,
            availability: {}, //date (MM/DD/YYYY) => hasAvailability, numberAvailableAppointments
            timestamp: new Date(),
        };
        // If this is a massVax site that is invite-only, then we don't
        // need availability data.
        if (!results.massVax) {
            data.appointment_windows.forEach((appointment) => {
                const dateRegexp = /(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})/;
                const { year, month, day } = appointment.start_time.match(
                    dateRegexp
                ).groups;
                const date = `${month}/${day}/${year}`;
                let newNumberAvailable =
                    appointment.status !== "Disabled"
                        ? appointment.slots_available
                        : 0;

                if (newNumberAvailable) {
                    results.hasAvailability = true;
                }

                if (results.availability[date]) {
                    newNumberAvailable +=
                        results.availability[date].numberAvailableAppointments;
                }

                // Only add date keys if there are appointments
                if (newNumberAvailable) {
                    results.availability[date] = {
                        numberAvailableAppointments: newNumberAvailable,
                        hasAvailability: true,
                    };
                }
            });

            if (
                data.hasOwnProperty("visible_in_search") &&
                !data.visible_in_search
            ) {
                // Commented out the following line because there is currently a
                // waiting room for people to join for an event that starts at 8:30am.
                // We should revisit this later after the appointments are gone.
                //results.hasAvailability = false;
            }
        }
        return results;
    });
};
