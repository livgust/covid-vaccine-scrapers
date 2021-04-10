const scraper = require("../no-browser-site-scrapers/GreaterLawrenceFHC/index");
const config = require("../no-browser-site-scrapers/GreaterLawrenceFHC/config");

const { expect } = require("chai");
const moment = require("moment");
const file = require("../lib/file");

/** Generator to feed filenames sequentially to the "with availability" test. */
function* filenames() {
    yield "noAvailability.html";
    yield "noAvailability.html";
    yield "sampleAvailability.html";
    yield "noAvailability.html";
}

describe("GLFHC availability test using scraper and saved HTML", function () {
    const filenameGenerator = filenames();

    const testFetchService = {
        async fetchAvailability(/*site*/) {
            return loadTestHtmlFromFile(
                "GreaterLawrenceFHC",
                filenameGenerator.next().value
            );
        },
    };
    const beforeTime = moment();

    it("should provide availability for each site, and the results objects structure should conform", async function () {
        const results = await scraper(false, testFetchService);

        const expected = [false, false, true, false];
        const hasAvailability = Object.values(results).map(
            (result) => result.hasAvailability
        );
        const afterTime = moment();

        expect(hasAvailability).is.deep.equal(expected);

        const expectedSlotCounts = [0, 0, 53, 0];
        const slotCounts = Object.values(results).map((result) =>
            result.availability.hasAvailability
                ? result.availability.numberAvailableAppointments
                : 0
        );

        expect(slotCounts).is.deep.equal(expectedSlotCounts);
        /*
        Structure conformance expectations:

        - All the timestamps are expected to be between before
            and after when the scraper was executed
        - Each site's results object must have a property named "hasAvailability"
         */
        results.forEach((result) => {
            expect(moment(result.timestamp).isBetween(beforeTime, afterTime));
            expect(result.hasAvailability).is.not.undefined;
        });

        // console.log(`${JSON.stringify(results)}`);

        if (process.env.DEVELOPMENT) {
            file.write(
                `${process.cwd()}/out_no_browser.json`,
                `${JSON.stringify(results, null, "   ")}`
            );
        }
    });
});

/* utilities */

/**
 * Loads the saved HTML of the website. The file is expected to be in the test/TrinityEMS/ folder.
 *
 * @param {String} filename The filename only, include its extension
 */
function loadTestHtmlFromFile(testFolderName, filename) {
    const fs = require("fs");
    const path = `${process.cwd()}/test/${testFolderName}/${filename}`;
    return fs.readFileSync(path, "utf8");
}
