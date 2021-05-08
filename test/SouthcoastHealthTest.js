const { expect } = require("chai");
const {
    parseJson,
} = require("../site-scrapers/SouthcoastHealth/responseParser");

const file = require("../lib/file");

describe("SouthCoastHealth :: test Fall River sample JSON", () => {
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
