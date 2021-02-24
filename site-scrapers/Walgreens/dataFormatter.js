const moment = require("moment");

module.exports = function (data, website) {
    return data.map((entry) => {
        const availability = {};
        entry.appointmentAvailability.forEach((daySlot) => {
            const date = moment(daySlot.date).local().startOf("day");
            const midnightToday = moment().local().startOf("day");
            if (date.isSame(midnightToday)) {
                const todaySlots = daySlot.slots.filter((slot) =>
                    moment(slot, "HH:mm a").isAfter(moment().local())
                );
                availability[date.format("M/D/YYYY")] = {
                    hasAvailability: !!todaySlots.length,
                    numberAvailableAppointments: todaySlots.length,
                };
            } else if (date.isAfter(midnightToday)) {
                availability[date.format("M/D/YYYY")] = {
                    hasAvailability: !!daySlot.slots.length,
                    numberAvailableAppointments: daySlot.slots.length,
                };
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
            hasAvailability: true,
            availability: availability,
        };
    });
};

function toTitleCase(string) {
    return string.replace(/\w+/g, function (text) {
        return text.charAt(0).toUpperCase() + text.substr(1).toLowerCase();
    });
}
