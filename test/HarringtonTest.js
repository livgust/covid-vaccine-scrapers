const { expect } = require("chai");
const harringtonScraper = require("../site-scrapers/Harrington/index");

/** Generator to feed filenames sequentially to the "with availability" test. */
function* filenames() {
    yield "Harrington-with-availability-March-April.html";
    yield "Harrington-with-availability-April-May.html";
    yield "Harrington-with-fieldset.html";
}

describe("Harrington Health Care :: test with availability", function () {
    const filenameGenerator = filenames();

    async function loadPage(page) {
        const filename = filenameGenerator.next().value;
        const html = loadTestHtmlFromFile(filename);
        await page.setContent(html);
    }

    /**
     * Provides mocks for points where the scraper navigates to a page, or fetches HTML
     */
    const hasAvailabilityPageService = {
        async getHomePage(browser) {
            const page = await browser.newPage();
            loadPage(page);
            return page;
        },
        /**
         * Gets next page containing a mocked calendar with active days
         */
        async getNextMonthCalendar(page) {
            loadPage(page);
        },
    };
    /** Notfication service which does not write to s3 or send Slack messages. */
    let notifyAvailabilityContentChangeCount = 0;
    let notifyPageContentChangeCount = 0;
    const testNotificationService = {
        async handlePageContentChange(/*page*/) {
            console.log("\tno-op notification of page content change");
            notifyPageContentChangeCount += 1;
        },
        async handleAvailabilityContentUpdate(/*page*/) {
            console.log("\tno-op notification of availability change");
            notifyAvailabilityContentChangeCount += 1;
        },
    };

    it("Should return 7 days with 19 total available slots across 3 months. ", async () => {
        const results = await harringtonScraper(
            browser,
            hasAvailabilityPageService,
            testNotificationService
        );

        const expectedDayCount = 7;
        const expectedSlotTotal = 19;

        /*
            These "have.property" tests may be unnecessary because subsequent
            count tests would fail if these properties were not found.
        */
        expect(results).to.have.property("availability");
        expect(results).to.have.property("hasAvailability");

        const firstAvailability = Object.values(results.availability)[0];
        expect(firstAvailability).to.have.property(
            "numberAvailableAppointments"
        );
        expect(firstAvailability).to.have.property("hasAvailability");

        expect(Object.keys(results.availability).length).equals(
            expectedDayCount,
            `expected ${expectedDayCount} date keys in results`
        );

        const totalSlots = Object.values(results.availability)
            .map((value) => value.numberAvailableAppointments)
            .reduce(function (total, number) {
                return total + number;
            }, 0);
        expect(totalSlots).to.equal(expectedSlotTotal);

        const asAvailabilityTrueTotal = Object.values(results.availability)
            .map((value) => value.hasAvailability)
            .reduce(function (total, number) {
                return total + number;
            }, 0);
        expect(asAvailabilityTrueTotal).to.equal(expectedDayCount);
    });
});

describe("Harrington Health Care :: test with 'no-dates-available' class present", function () {
    let page;

    async function loadPageNoAvailabilityPage(page) {
        const html = loadTestHtmlFromFile(
            "Harrington Health Care-no-availability.html"
        );
        await page.setContent(html);
    }
    const noAvailabilityPageService = {
        async getHomePage(browser) {
            page = await browser.newPage();
            loadPageNoAvailabilityPage(page);
            return page;
        },
        async getNextMonthCalendar(/*page*/) {
            console.log("noDatesPageService :: getting next month's calendar");
        },
    };

    it("should return no availability", async function () {
        const results = await harringtonScraper(
            browser,
            noAvailabilityPageService
        );

        expect(results).to.have.property("availability");
        expect(results).to.have.property("hasAvailability");

        expect(Object.keys(results.availability).length).to.equal(0);
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
    const path = `${process.cwd()}/test/Harrington/${filename}`;
    return fs.readFileSync(path, "utf8");
}
