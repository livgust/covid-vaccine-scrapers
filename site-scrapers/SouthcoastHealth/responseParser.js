/*
    Functionality here is unit testable.
*/
/**
 * Sample data format:
    {...
        "dateToSlots": {
            "2021-05-08": {},
            "2021-05-09": {},
            "2021-05-10": {
                "e01e1f56-0029-4256-be54-a8f2a33d6011": {
                    "slots": [...]
                }
            }, ...
 *
 * @param {JSON} json
 * @returns if no slots -> {}; otherwise { MM-DD-YYYY: { numberAvailableAppointments: x, hasAvailability: y}, ... }
 */
function parseJson(json) {
    const dateToSlots = json.dateToSlots;

    if (!dateToSlots) {
        return {};
    }
    const availabilityContainer = {};
    // Otherwise, get dates with slots: keys are dates
    for (const [date, slotsObj] of Object.entries(dateToSlots)) {
        const slots = Object.values(slotsObj);

        if (slots.length > 0) {
            availabilityContainer[date] = {
                numberAvailableAppointments: slots[0].slots.length,
                hasAvailability: true,
            };
        }
    }

    return availabilityContainer;
}

module.exports = {
    parseJson,
};
