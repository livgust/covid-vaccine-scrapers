const { expect } = require("chai");
const {
    parseJson,
} = require("../site-scrapers/SouthcoastHealth/responseParser");

const file = require("../lib/file");

describe.skip("SouthcoastHealth :: test availability sample JSON", () => {
    const fallRiverJson = require("./SouthcoastHealth/sampleFallRiver.json");

    it("the number of dates and total slots should match expectations", () => {
        const fallRiverResults = parseJson(fallRiverJson);

        expect(Object.keys(fallRiverResults).length).equals(3);

        const totalSlots = Object.values(fallRiverResults).reduce(
            (acc, value) => {
                acc += value.numberAvailableAppointments;
                return acc;
            },
            0
        );

        const timeStrMatchCount = JSON.stringify(fallRiverJson).match(/time/g);
        expect(totalSlots).equals(timeStrMatchCount.length);

        if (process.env.DEVELOPMENT) {
            file.write(
                `${process.cwd()}/out_FallRiver-SouthcoastHealth.json`,
                `${JSON.stringify(fallRiverResults, null, "   ")}`
            );
        }
    });
});

describe("SouthcoastHealth :: test no availability sample JSON", () => {
    const noAvailabilityJson = require("./SouthcoastHealth/sampleNoAvailability.json");

    it("the number of dates and total slots should match expectations", () => {
        const results = parseJson(noAvailabilityJson);

        expect(Object.keys(results).length).equals(0);

        if (process.env.DEVELOPMENT) {
            file.write(
                `${process.cwd()}/out_SouthcoastHealth-no-availibility.json`,
                `${JSON.stringify(results, null, "   ")}`
            );
        }
    });
});
