const { expect } = require("chai");
const {
    parseJson,
} = require("../site-scrapers/SouthcoastHealth/dataFormatter");

const file = require("../lib/file");

describe("SouthCoastHealth :: test Fall River sample JSON", () => {
    const fallRiverJson = require("./SouthcoastHealth/sampleFallRiver.json");

    it("should show availability", () => {
        //
        const fallRiverResults = parseJson(fallRiverJson);

        if (process.env.DEVELOPMENT) {
            file.write(
                `${process.cwd()}/out_FallRiver-SouthCoastHealth.json`,
                `${JSON.stringify(fallRiverResults, null, "   ")}`
            );
        }
    });
});
