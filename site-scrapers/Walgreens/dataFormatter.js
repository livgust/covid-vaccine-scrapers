const moment = require("moment");
const fetch = require("node-fetch");

async function formatAndMergeData(data, website) {
    const availabilityData = formatData(data, website);
    return availabilityData;
    /* THIS IS TODO/NOT WORKING.
     * 1) the walgreens API doesn't respect "r" or "s"
     * 2) we'd need to figure out how to call this to get all stores in the state
    const availabilityStoreIDObject = {};
    data.forEach((store) => {
        availabilityStoreIDObject[store.partnerLocationId] = true;
    });
    const allNearbyStores = await fetch(
        "https://services.walgreens.com/api/stores/search/v2",
        {
            method: "post",
            body: JSON.stringify({
                apiKey: process.env.WALGREENS_API_KEY,
                lat: 0, // TODO
                lng: 0, // TODO
                r: 100, // radius
                s: 100, // number of results
            }),
            headers: { "Content-Type": "application/json" },
        }
    ).then(
        //if this fails, return 0 stores
        (res) => res.json(),
        (err) => {
            console.error(err);
            return { results: [] };
        }
    );
    const unavailablityData = getFormattedUnavailableStores(
        availabilityStoreIDObject,
        allNearbyStores
    );
    return [...availabilityData, ...unavailabilityData];
    */
}

function getFormattedUnavailableStores(retrievedIDs, allNearbyStores) {
    return allNearbyStores
        .filter((store) => !retrievedIDs[store.storeNumber])
        .map((store) => ({
            name: store.store.name,
            street: toTitleCase(store.store.address.street),
            city: toTitleCase(store.store.address.city),
            zip: store.store.address.zip,
            hasAvailability: false,
            availability: {},
        }));
}

function toTitleCase(string) {
    return string.replace(/\w+/g, function (text) {
        return text.charAt(0).toUpperCase() + text.substr(1).toLowerCase();
    });
}

function formatData(data, website) {
    return data.map((entry) => {
        let hasAvailability = false;
        const availability = {};
        entry.appointmentAvailability.forEach((daySlot) => {
            const date = moment(daySlot.date).local().startOf("day");
            const midnightToday = moment().local().startOf("day");
            if (date.isSame(midnightToday)) {
                const todaySlots = daySlot.slots.filter((slot) =>
                    moment(slot, "HH:mm a").isAfter(moment().local())
                );
                const numSlots = todaySlots.length;
                availability[date.format("M/D/YYYY")] = {
                    hasAvailability: !!numSlots,
                    numberAvailableAppointments: numSlots,
                };
                hasAvailability = hasAvailability || !!numSlots;
            } else if (date.isAfter(midnightToday)) {
                const numSlots = daySlot.slots.length;
                availability[date.format("M/D/YYYY")] = {
                    hasAvailability: !!numSlots,
                    numberAvailableAppointments: numSlots,
                };
                hasAvailability = hasAvailability || !!numSlots;
            }
        });
        return {
            name: entry.name,
            street: toTitleCase(
                entry.address.line1 + " " + entry.address.line2
            ).trim(),
            city: toTitleCase(entry.address.city),
            zip: entry.address.zip,
            signUpLink: website,
            hasAvailability,
            availability: availability,
        };
    });
}

module.exports = {
    formatAndMergeData,
    formatData,
    getFormattedUnavailableStores,
};
