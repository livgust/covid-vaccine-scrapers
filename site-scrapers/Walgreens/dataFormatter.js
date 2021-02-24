const moment = require("moment");

module.exports = function (data, website) {
    let hasAvailability = false;
    return data.map((entry) => {
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
                hasAvailability = hasAvailability || numSlots;
            }
        });
        return {
            name: "Walgreens",
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
};

function toTitleCase(string) {
    return string.replace(/\w+/g, function (text) {
        return text.charAt(0).toUpperCase() + text.substr(1).toLowerCase();
    });
}
