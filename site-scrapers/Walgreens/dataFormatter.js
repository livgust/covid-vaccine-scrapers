const { generateKey } = require("../../data/dataDefaulter");
const { toTitleCase } = require("../../lib/stringUtil");
const moment = require("moment");
const fetch = require("node-fetch");

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
            name: `Walgreens (${toTitleCase(entry.address.city)})`, // NOTE: change to "entry.name" if we use the commented-out code above
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
    formatData,
};
