const s3 = require("../../lib/s3");
const { sendSlackMsg } = require("../../lib/slack");
const moment = require("moment");

const {
    entity,
    townRestricted,
    unRestricted,
    monthCount,
} = require("./config.js");

module.exports = async function GetAvailableAppointments(
    browser,
    pageService = defaultPageService(),
    customNotificationService
) {
    console.log(`${entity} starting.`);
    if (customNotificationService) {
        notificationService = customNotificationService;
    }

    const allResults = [];

    try {
        const townRestrictedAvailability = await ScrapeWebsiteData(
            browser,
            pageService,
            townRestricted
        );

        allResults.push({
            ...townRestricted,
            ...townRestrictedAvailability,
        });

        const unRestrictedAvailability = await ScrapeWebsiteData(
            browser,
            pageService,
            unRestricted
        );

        allResults.push({
            ...unRestricted,
            ...unRestrictedAvailability,
        });
    } catch (error) {
        console.error(`Harrington :: GetAvailableAppointments(): ${error}`);
    }

    console.log(`${entity} done.`);

    return {
        parentLocationName: "Harrington",
        timestamp: moment().format(),
        individualLocationData: allResults,
    };
};

/**
 availabilityContentSavedToS3

 Unused at the moment. If notificationService is activated, use the
 `availabilityContentSavedToS3` flag to limit saving to s3 to only once.

 Suggested usage:

 When `dates` are found in `getDailyAvailabilityCountsForMonth()`
 ```
 ...
    const dates = await page.$$eval(".time-selection", (slots) =>
        slots.map((slot) => slot.getAttribute("data-readable-date"))
    );
    // notify s3 and Slack
    if (!availabilityContentSavedToS3) {
        await notificationService.handleAvailabilityContentUpdate(page);
        availabilityContentSavedToS3 = true;
    }
    ...
```
 */
/* eslint-disable no-unused-vars */
let availabilityContentSavedToS3 = false; // becomes true upon first save to s3
/* eslint-enable no-unused-vars */

/**
 * The notificationService provides functionality to
 * notify s3 and Slak of changes to availability.
 *
 * Replace with mocks in unit testing.
 *
 * Not used at the moment, but retained in case there's a future
 * need to capture HTML due to changes in the website.
 */
let notificationService = function defaultNotificationService() {
    return {
        async handleAvailabilityContentUpdate(page, site) {
            return notifyAvailabilityContentUpdate(page, site);
        },
    };
};

async function ScrapeWebsiteData(browser, pageService, site) {
    console.log(`${site.name} starting to scrape`);
    const page = await pageService.getHomePage(browser, site);

    // Uncomment if logging from page.evaluate(...) is needed for debugging.
    // page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

    // Initialize results to no availability
    const results = {
        availability: {},
        hasAvailability: false,
    };

    /*
     monthCount is set in config.js; limit it to only a few months because this style
     of Acuity Scheduling calendar is endless going forward in time. There is
     no month chooser drop-down to grab a list of months.
     */
    for (const key of new Array(monthCount).keys()) {
        // Don't advance the calendar if it's the first month
        if (key > 0) {
            await pageService.getNextMonthCalendar(page, site);
        }
        const dailySlotsForMonth = await getDailyAvailabilityCountsForMonth(
            page
        );
        // Add all day objects to results.availability
        dailySlotsForMonth.forEach((value, key) => {
            results.availability[key] = {
                numberAvailableAppointments: value,
                hasAvailability: !!value,
            };
        });
    }

    results.hasAvailability = !!Object.keys(results.availability).length;

    console.log(`${site.name} scrape ending`);

    return results;
}

/**
 * Each slot is respresented by the following HTML:
 *
 *    &lt;input type="radio"
 *        class="time-selection"
 *        name="time[]"
 *        data-qa="select-day-29-slot-0"
 *        data-readable-date="2021-03-29"
 *        value="2021-03-29 11:45"
 *        id="appt1617032700"
 *        aria-labelledby="lbl_appt1617032700"&gt;
 *
 * Select for ".time-selection" and evaluate the "data-readable-date" attribute
 * to get the date. Appointment time (in "value" attribute) isn't needed.
 *
 * Map date from 'yyyy-mm-dd' to 'm/d/yyyy'.
 *
 * Group by date, accumulating date count, into a Map: key = date, value = slot count for date.
 *
 * @param {*} page
 * @returns Map of availability keyed by date. Guaranteed not null, returning at least an empty map.
 */
async function getDailyAvailabilityCountsForMonth(page) {
    function reformatDate(date) {
        const dateObj = new Date(date + "T00:00:00");
        return new Intl.DateTimeFormat("en-US").format(dateObj);
    }

    /*
        The website seems to have changed to "alert-danger" for its "no
        times available" message. Keeping the old way ("#no-times-availabile-message")
        in case they switch back.
     */
    const noTimesAvailable = await page.$("#no-times-available-message");
    const alertDanger = await page.$("#alert-danger");
    if (noTimesAvailable || alertDanger) {
        return new Map();
    }
    let dailySlotCountsMap; // keyed by date, value accumulates slot counts per date.

    try {
        await page.waitForTimeout(300);
        const dates = await page.$$eval(".time-selection", (slots) => {
            // eslint-disable-next-line no-debugger
            // debugger;
            const d = slots.map((slot) =>
                slot.getAttribute("data-readable-date")
            );
            return d;
        });

        dailySlotCountsMap = dates
            .map((date) => reformatDate(date))
            .reduce((acc, date) => {
                acc.set(date, (acc.get(date) || 0) + 1);
                return acc;
            }, new Map());
    } catch (error) {
        console.error(`error trying to get date: ${error}`);
    }

    return dailySlotCountsMap ? dailySlotCountsMap : new Map();
}

/**
 * Advances the page to the next month by clicking on the "next" button.
 *
 * The monthCount variable in config.js limits how many times this is executed.
 *
 * @param {*} page
 */
async function advanceMonth(page, site) {
    try {
        await Promise.all([
            /*
                The ability to click on the next month button seems to
                be quite flaky. This one seems to work for the moment,
                without having to waitForSelector().
            */
            // await page.waitForTimeout(300),
            await page.waitForSelector(".calendar-next"),
            await page.evaluate(() =>
                document.querySelector(".calendar-next").click()
            ),
        ]);
    } catch (error) {
        console.error(`${site.name} :: trouble advancing button: ${error}`);
    }
}

/**
 * The pageService provides functions which retrieve pages.
 *
 * Replace with mocks in unit testing.
 */
function defaultPageService() {
    return {
        async getHomePage(browser, site) {
            const classToWaitFor = "#step-pick-appointment";
            const page = await browser.newPage();
            await Promise.all([
                page.goto(site.signUpLink),
                waitForLoadComplete(page, classToWaitFor),
            ]);
            return page;
        },

        async getNextMonthCalendar(page, site) {
            return advanceMonth(page, site);
        },
    };
}

async function notifyAvailabilityContentUpdate(page, responseText, site) {
    const msg = `${site.name} - possible appointments:\n${responseText}`;
    await sendSlackMsg("bot", msg);
    await s3.savePageContent(site.name, page);
}

async function waitForLoadComplete(page, loaderSelector) {
    await page.waitForSelector(loaderSelector, {
        visible: true,
        timeout: 15000,
    });
}
