const s3 = require("../../lib/s3");
const { site, monthCount } = require("./config.js");
const { sendSlackMsg } = require("../../lib/slack");

module.exports = async function GetAvailableAppointments(
    browser,
    pageService = defaultPageService(),
    customNotificationService
) {
    console.log(`${site.name} starting.`);
    if (customNotificationService) {
        notificationService = customNotificationService;
    }
    const availability = await ScrapeWebsiteData(browser, pageService);
    console.log(`${site.name} done.`);
    const results = {
        ...site,
        ...availability,
    };
    return results;
};

/**

 Unused at the moment. If notificationService is activated, use this flag to
 limit saving to s3 to only once.


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
        async handleAvailabilityContentUpdate(page) {
            return notifyAvailabilityContentUpdate(page);
        },
    };
};

async function ScrapeWebsiteData(browser, pageService) {
    const page = await pageService.getHomePage(browser);

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
            await pageService.getNextMonthCalendar(page);
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

    return results;
}

/**
 * Each slot is respresented by the following HTML:
 *
    &lt;input type="radio"
    class="time-selection"
    name="time[]"
    data-qa="select-day-29-slot-0"
    data-readable-date="2021-03-29"
    value="2021-03-29 11:45"
    id="appt1617032700"
    aria-labelledby="lbl_appt1617032700"&gt;
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

    let dailySlotCountsMap; // keyed by date, value accumulates slot counts per date.

    try {
        const dates = await page.$$eval(".time-selection", (slots) =>
            slots.map((slot) => slot.getAttribute("data-readable-date"))
        );

        dailySlotCountsMap = dates
            .map((date) => reformatDate(date))
            .reduce((acc, date) => {
                acc.set(date, (acc.get(date) || 0) + 1);
                return acc;
            }, new Map());
    } catch (error) {
        console.log(`error trying to get day numbers: ${error}`);
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
async function advanceMonth(page) {
    const nextMonthLinkClass = ".calendar-next";

    try {
        await Promise.all([
            await page.click(nextMonthLinkClass),

            await page.waitForSelector("#chooseMonthSched", {
                timeout: 15000,
            }),
        ]);
    } catch (error) {
        console.log(`${site.name} :: trouble advancing button: ${error}`);
    }
}

/**
 * The pageService provides functions which retrieve pages.
 *
 * Replace with mocks in unit testing.
 */
function defaultPageService() {
    return {
        async getHomePage(browser) {
            const classToWaitFor = "#step-pick-appointment";
            const page = await browser.newPage();
            await Promise.all([
                page.goto(site.website),
                waitForLoadComplete(page, classToWaitFor),
            ]);
            return page;
        },

        async getNextMonthCalendar(page) {
            return advanceMonth(page);
        },
    };
}

async function notifyAvailabilityContentUpdate(page, responseText) {
    const msg = `${site.name} - possible appointments:\n${responseText}`;
    console.log(msg);
    await sendSlackMsg("bot", msg);
    await s3.savePageContent(site.name, page);
}

async function waitForLoadComplete(page, loaderSelector) {
    await page.waitForSelector(loaderSelector, {
        visible: true,
        timeout: 15000,
    });
}
