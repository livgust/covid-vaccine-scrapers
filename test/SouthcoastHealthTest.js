const {
    parseJson,
} = require("../site-scrapers/SouthcoastHealth/responseParser");
const { expect } = require("chai");

describe("Southcoast Health :: test availability JSON", () => {
    it("should show availability", () => {
        const json = require("./SouthcoastHealth/sampleFallRiver.json");

        const results = parseJson(json);

        expect(Object.keys(results).length).equals(3);

        // Count the number times the key "time" occurs in the JSON file.
        // That should equal the number of appointments (slots).
        const timesStrCount = JSON.stringify(json).match(/time/g).length;
        const totalSlots = Object.values(results).reduce((acc, value) => {
            acc += value.numberAvailableAppointments;
            return acc;
        }, 0);

        expect(totalSlots).equals(timesStrCount);
    });

    it("should show no availability", () => {
        const json = require("./SouthcoastHealth/sampleNoAvailability.json");

        const results = parseJson(json);
        expect(results).deep.equals({});
    });
});
