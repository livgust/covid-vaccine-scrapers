const trinityEms = require("../site-scrapers/TrinityEMS/index");

/** Generator to feed filenames sequentially to the "with availability" test. */
function* filenames() {
    yield "TrinityEMS-2021-February-activedays.html";
    yield "TrinityEMS-2021-March-activedays.html";
    yield "TrinityEMS-2021-April-activedays.html";
}
/** Generator for creating an ascending sequence of slot counts. */
function* generateSequence(start, end) {
    for (let i = start; i <= end; i++) yield i;
}

describe("TrinityEMS :: test 3 months with availability", function () {
    const filenameGenerator = filenames();
    const sequence = generateSequence(1, 13); // the mock files only have 13 active days

    /** expected value for various events */
    let slotTotal = 0;
    let notifyPageContentChangeCount = 0;
    let notifyAvailabilityContentChangeCount = 0;

    async function loadPage(page) {
        const html = loadTestHtmlFromFile(filenameGenerator.next().value);
        await page.setContent(html);
    }

    /**
     * Provides mocks for points where the scraper navigates to a page, or fetches HTML
     */
    const activeDayPageService = {
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
        /**
         * mock slot count response
         */
        async fetchSlotsResponse(/*page, dateString*/) {
            const slotCount = sequence.next().value;
            slotTotal += slotCount;
            return slotCount;
        },
    };
    /** Notfication service which does not write to s3 or send Slack messages. */
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

    it.skip(
        "Should return 13 slots with an ascending number of available slots, total = 91. " +
            "Should also send s3 and slackMsg notifications once.",
        async () => {
            const results = await trinityEms(
                browser,
                activeDayPageService,
                testNotificationService
            );
            expect(Object.keys(results.availability).length).equals(13);

            const total = Object.values(results.availability)
                .map((value) => value.numberAvailableAppointments)
                .reduce(function (total, number) {
                    return total + number;
                }, 0);
            expect(total).to.equal(slotTotal);

            // s3 and slackMsg notifications should be sent once
            expect(notifyAvailabilityContentChangeCount).to.equal(1);
            expect(notifyPageContentChangeCount).to.equal(1);
        }
    );
});

describe("TrinityEMS :: test with 'no-dates-available' class present", function () {
    let page;

    async function loadPageNoAvailabilityPage(page) {
        const html = loadTestHtmlFromFile("TrinityEMS-no-availability.html");
        await page.setContent(html);
    }
    const noDatesPageService = {
        async getHomePage(browser) {
            page = await browser.newPage();
            loadPageNoAvailabilityPage(page);
            return page;
        },
        async getNextMonthCalendar(/*page*/) {
            console.log("noDatesPageService :: getting next month's calendar");
        },
        async getActiveDayResponse(/*page*/) {
            console.log("noDatesPageService :: test activeDay query response");
        },
    };

    it.skip("should return no availability", async function () {
        const results = await trinityEms(browser, noDatesPageService);

        expect(Object.keys(results.availability).length).to.equal(0);
    });
});

/* utilities */

/**
 * Loads the saved HTML of the website. The file is expected to be in the test/TrinityEMS/ folder.
 *
 * @param {String} filename The filename only, include its extension: e.g., TrinityEMS.html`
 */
function loadTestHtmlFromFile(filename) {
    const fs = require("fs");
    const path = `${process.cwd()}/test/TrinityEMS/${filename}`;
    return fs.readFileSync(path, "utf8");
}
