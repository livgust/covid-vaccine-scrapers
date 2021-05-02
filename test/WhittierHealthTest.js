const scraper = require("../no-browser-site-scrapers/WhittierHealth/index");
const { site } = require("../no-browser-site-scrapers/WhittierHealth/config");

const { expect } = require("chai");
const moment = require("moment");
const file = require("../lib/file");

describe("WhittierHealth availability test using scraper and saved HTML", function () {
    /** Generator to feed filenames sequentially to the "with availability" test. */
    function* filenames() {
        yield "slotsAvailable-4292021-49slots-scripts-removed.html"; // 49 slots available
        yield "slotsAvailable-4302021-53slots-scripts-removed.html"; // 53 slots available
    }

    const filenameGenerator = filenames();

    const testFetchService = {
        /**
         * For mocking purposes, just feed a couple of HTML snippets containing hrefs.
         * They aren't used when testing, but need to be present so that the scraper
         * can proceed.
         *
         * @returns an array of meaningless <a href> snippets.
         */
        async fetchFrontPage(/*frontPageUrl*/) {
            return [
                `<a href="https://www.signupgenius.com/go/409054CA9AB2CA2FA7-413">
            Tuesday April 13 at Whittier Rehabilitation Hospital Bradford, 145 Ward Hill Ave, Haverhill 01835&nbsp;
            </a>`,
                `
            <a href="https://www.signupgenius.com/go/409054CA9AB2CA2FA7-413">
            Tuesday April 13 at Whittier Rehabilitation Hospital Bradford, 145 Ward Hill Ave, Haverhill 01835&nbsp;
            </a>`,
            ];
        },
        async fetchCalendarPage(/*calendarUrl*/) {
            return loadTestHtmlFromFile(
                "WhittierHealth",
                filenameGenerator.next().value
            );
        },
    };
    const beforeTime = moment();

    it("should provide availability for one site, and the results objects structure should conform", async function () {
        const results = await scraper(false, testFetchService);

        if (process.env.DEVELOPMENT) {
            file.write(
                `${process.cwd()}/out_${site.name}.json`,
                `${JSON.stringify(results, null, "   ")}`
            );
        }

        const expected = [true];

        const hasAvailability = results.individualLocationData.map((result) => {
            const avail = result.hasAvailability;
            return avail;
        }, []);

        const afterTime = moment();

        expect(hasAvailability).is.deep.equal(expected);

        // The total of available slots in the two sample HTML files is 49 and 53
        const expectedSlotCounts = [49 + 53];

        const slotCounts = results.individualLocationData.map((result) => {
            const count = Object.values(result.availability).map(
                (value) => value.numberAvailableAppointments
            );
            return count.reduce((acc, c) => (acc += c));
        }, []);

        expect(expectedSlotCounts).is.deep.equal(slotCounts);

        /*
          The timestamp is expected to be between before
            and after execution of the scraper in this test.
         */
        expect(moment(results.timestamp).isBetween(beforeTime, afterTime));
    });
});

describe("WhittierHealth no availability test using scraper and saved HTML", function () {
    /** Generator to feed filenames sequentially to the "with NO availability" test. */
    function* filenames() {
        yield "noSlotsAvailable4132021-scripts-removed.html"; // No slots available. Sign up is full.
        yield "noSlotsAvailable4152021-scripts-removed.html"; // No slots available. Sign up is full.
    }
    const filenameGenerator = filenames();

    const testFetchService = {
        /**
         * For mocking purposes, just feed a couple of HTML snippets containing hrefs.
         *
         * @returns an array of meaningless <a href> snippets.
         */
        async fetchFrontPage(/*frontPageUrl*/) {
            return [
                `<a href="https://www.signupgenius.com/go/409054CA9AB2CA2FA7-413">
            Tuesday April 13 at Whittier Rehabilitation Hospital Bradford, 145 Ward Hill Ave, Haverhill 01835&nbsp;
            </a>`,
                `<a href="https://www.signupgenius.com/go/409054CA9AB2CA2FA7-413">
            Tuesday April 13 at Whittier Rehabilitation Hospital Bradford, 145 Ward Hill Ave, Haverhill 01835&nbsp;
            </a>`,
            ];
        },
        async fetchCalendarPage(/*calendarUrl*/) {
            return loadTestHtmlFromFile(
                "WhittierHealth",
                filenameGenerator.next().value
            );
        },
    };
    const beforeTime = moment();

    it("should provide availability for one site, and the results objects structure should conform", async function () {
        const results = await scraper(false, testFetchService);

        if (process.env.DEVELOPMENT) {
            file.write(
                `${process.cwd()}/out_${site.name}.json`,
                `${JSON.stringify(results, null, "   ")}`
            );
        }

        const expectedHasAvailability = [false];

        const hasAvailability = results.individualLocationData.map((result) => {
            const avail = result.hasAvailability;
            return avail;
        }, []);

        const afterTime = moment();

        expect(hasAvailability).is.deep.equal(expectedHasAvailability);

        // There is no availability.
        const expectedSlotCounts = [0];

        const slotCounts = results.individualLocationData.map((result) => {
            const count = Object.values(result.availability).map(
                (value) => value.numberAvailableAppointments
            );
            if (count.length == 0) {
                return 0;
            } else {
                return count.reduce((acc, c) => (acc += c));
            }
        });

        expect(expectedSlotCounts).is.deep.equal(slotCounts);

        /*
          The timestamp is expected to be between before
            and after execution of the scraper in this test.
         */
        expect(moment(results.timestamp).isBetween(beforeTime, afterTime));
    });
});

/* utilities */

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
