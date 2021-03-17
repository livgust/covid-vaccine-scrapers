const chromium = require("chrome-aws-lambda");
const { addExtra } = require("puppeteer-extra");
const Puppeteer = addExtra(chromium.puppeteer);
const chai = require("chai");

const trinityEms = require("../site-scrapers/TrinityEMS/index");
const site = require("../site-scrapers/TrinityEMS/config");

let browser;

function* filenames() {
    yield "TrinityEMS-2021-February-activedays.html";
    yield "TrinityEMS-2021-March-activedays.html";
    yield "TrinityEMS-2021-April-activedays.html";
}
function* generateSequence(start, end) {
    for (let i = start; i <= end; i++) yield i;
}

before(async function () {
    browser = await Puppeteer.launch({
        executablePath: process.env.CHROMEPATH,
        headless: true,
    });
});

after(async function () {
    await browser.close();
});

describe(`${site.name} :: test 3 months with availability`, function () {
    const filenameGenerator = filenames();
    const sequence = generateSequence(1, 20); // the mock files only have 13 active days
    let slotTotal = 0;

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
            console.log("getting home page");
            return page;
        },
        /**
         * Gets next page containing a mocked calendar with active days
         */
        async getNextMonthCalendar(page) {
            loadPage(page);
        },
        /**
         * mock test HTML response
         */
        async getActiveDayResponse(/*page*/) {
            const slotCount = sequence.next().value;
            slotTotal += slotCount;
            console.log(`slotCount: ${slotCount}; slotTotal: ${slotTotal}`);
            return slotCount;
        },
        parseSlotCountFromResponse(page, responseText) {
            return responseText;
        },
    };
    /** Notfication service which does not write to s3 or send Slack messages. */
    const testNotificationService = {
        async handlePageContentChange(/*page*/) {
            console.log("no-op notification of page content change");
        },
        async handleAvailabilityContentUpdate(/*page*/) {
            console.log("no-op notification of availability change");
        },
    };

    it("use 3 mock pages with 13 slots total", async () => {
        const results = await trinityEms(
            browser,
            activeDayPageService,
            testNotificationService
        );
        chai.expect(Object.keys(results.availability).length).equals(13);

        const total = Object.values(results.availability)
            .map((value) => value.numberAvailableAppointments)
            .reduce(function (total, number) {
                return total + number;
            }, 0);
        chai.expect(total).to.equal(slotTotal);
    });
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
            console.log("noDatesPageService :: getting home page");
            return page;
        },
        async getNextMonthCalendar(/*page*/) {
            console.log("noDatesPageService :: getting next month's calendar");
        },
        async getActiveDayResponse(/*page*/) {
            console.log("noDatesPageService :: test activeDay query response");
        },
    };

    it("should return no availability", async function () {
        const results = await trinityEms(browser, noDatesPageService);

        chai.expect(Object.keys(results.availability).length).to.equal(0);

        console.log(`results reported would be: \n ${JSON.stringify(results)}`);
    });
});

/* utilities */

/**
 * Loads the saved HTML of the website. The file is expected to be in the /TrinityEMS/ folder.
 *
 * @param {String} filename The filename only, include its extension. E.g., TrinityEMS.html`
 */
function loadTestHtmlFromFile(filename) {
    const fs = require("fs");
    const path = `${process.cwd()}/test/TrinityEMS/${filename}`;
    console.log(`path: ${JSON.stringify(path)}`);
    var contentHtml = fs.readFileSync(path, "utf8");
    return contentHtml;
}
