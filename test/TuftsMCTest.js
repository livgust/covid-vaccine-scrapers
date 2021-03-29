const scraper = require("../site-scrapers/TuftsMC/index");
const { expect } = require("chai");

const {
    availabilityData,
    noAvailabilityData,
} = require("./TuftsMC/availability-data");

describe("Tufts Medical Center :: no appointments available", function () {
    let page;

    const noAvailabilityFetchService = {
        async fetchAvailability() {
            return noAvailabilityData;
        },
    };

    it("No upcoming appointments available", async function () {
        const results = await scraper(browser, noAvailabilityFetchService);

        expect(results.hasAvailability).equals(false);
    });
});

describe("Tufts Medical Center :: test with available days", function () {
    let page;

    const withAvailabilityFetchService = {
        async fetchAvailability() {
            return availabilityData;
        },
    };

    it("should return availability", async function () {
        const results = await scraper(browser, withAvailabilityFetchService);

        expect(Object.keys(results.availability).length).equals(3);
        expect(results.hasAvailability).equals(true);

        let sum = Object.values(results.availability).reduce(
            (total, value) => total + value.numberAvailableAppointments,
            0
        );

        expect(sum).equals(9);
    });
});

/* utilities */

/**
 * Loads the saved HTML of the website. The file is expected to be in the test/Harrington/ folder.
 *
 * @param {String} filename The filename only, include its extension: e.g., Harrington.html`
 */
function loadTestHtmlFromFile(filename) {
    const fs = require("fs");
    const path = `${process.cwd()}/test/TuftsMC/${filename}`;
    return fs.readFileSync(path, "utf8");
}
