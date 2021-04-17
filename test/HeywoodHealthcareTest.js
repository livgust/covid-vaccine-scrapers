const scraper = require("../no-browser-site-scrapers/HeywoodHealthcare/index");

const { expect } = require("chai");
const moment = require("moment");
const file = require("../lib/file");

describe("HeywoodHealthcare availability test using scraper and saved HTML", function () {
    const beforeTime = moment();

    it("should show no availability, and the results objects structure should conform", async function () {
        const results = await scraper(false, noAvailabilityFetchService);

        const afterTime = moment();

        const expectedAvailability = false;
        expect(results.individualLocationData[0].hasAvailability).is.deep.equal(
            expectedAvailability
        );

        expect(results.individualLocationData[0].availability).is.deep.equal(
            {}
        );
        /*
        Structure conformance expectations:

        - All the timestamps are expected to be between before
            and after when the scraper was executed
        - Each site's results object must have a property named "hasAvailability"
         */
        expect(
            moment(results.individualLocationData[0].timestamp).isBetween(
                beforeTime,
                afterTime
            )
        );

        // console.log(`${JSON.stringify(results)}`);

        if (process.env.DEVELOPMENT) {
            file.write(
                `${process.cwd()}/out_no_browser.json`,
                `${JSON.stringify(results, null, "   ")}`
            );
        }
    });

    it("should show several slots", async function () {
        const results = await scraper(false, availabilityFetchService);

        const afterTime = moment();

        const expectedAvailability = true;
        expect(results.individualLocationData[0].hasAvailability).is.deep.equal(
            expectedAvailability
        );

        const date = Object.keys(
            results.individualLocationData[0].availability
        )[0];

        expect(
            results.individualLocationData[0].availability[date]
                .numberAvailableAppointments
        ).equals(116);
        /*
        Structure conformance expectations:

        - All the timestamps are expected to be between before
            and after when the scraper was executed
        - Each site's results object must have a property named "hasAvailability"
         */
        expect(
            moment(results.individualLocationData[0].timestamp).isBetween(
                beforeTime,
                afterTime
            )
        );

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

/** Generator to feed filenames sequentially to the "with availability" test. */
function* noAvailabilityFilenames() {
    yield "firstPage-noSlots-hasMoreTimes-scripts-removed.html";
    yield "secondPage-noSlots-scripts-removed.html";
}
const noAvailabilityFilenameGenerator = noAvailabilityFilenames();

const noAvailabilityFetchService = {
    async fetchAvailability(/*site*/) {
        return loadTestHtmlFromFile(
            "HeywoodHealthcare",
            noAvailabilityFilenameGenerator.next().value
        );
    },
};

/** Generator to feed filenames sequentially to the "with availability" test. */
function* availabilityFilenames() {
    yield "firstPage-noSlots-hasMoreTimes-scripts-removed.html";
    yield "secondPage-lots0fSlots-scripts-removed.html";
    yield "thirdPage-someSlots-noMoreTimes-scripts-removed.html";
}
const availabilityFilenameGenerator = availabilityFilenames();

const availabilityFetchService = {
    async fetchAvailability(/*site*/) {
        return loadTestHtmlFromFile(
            "HeywoodHealthcare",
            availabilityFilenameGenerator.next().value
        );
    },
};

/**
 * Loads the saved HTML of the website.
 *
 * @param {String} filename The filename only, include its extension
 */
function loadTestHtmlFromFile(testFolderName, filename) {
    const fs = require("fs");
    const path = `${process.cwd()}/test/${testFolderName}/${filename}`;
    return fs.readFileSync(path, "utf8");
}
