const s3 = require("../../lib/s3");
const { site } = require("./config.js");
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

let activeDayPageContentSavedToS3 = false; // becomes true upon first save to s3
let parseSlotHtmlPageContentSavedToS3 = false; // becomes true upon first save to s3

let notificationService = function defaultNotificationService() {
    return {
        async handlePageContentChange(page) {
            return notifyPageContentChange(page);
        },
        async handleAvailabilityContentUpdate(page) {
            return notifyAvailabilityContentUpdate(page);
        },
    };
};

async function ScrapeWebsiteData(browser, pageService) {
    //    const page = await pageService.getHomePage(browser);

    // Initialize results to no availability
    const results = {
        availability: {},
        hasAvailability: false,
    };

    /*
        const monthCount = await getMonthCount(page);
    
        for (const key of new Array(monthCount).keys()) {
            // Don't advance the calendar if it's the first month
            if (key > 0) {
                await pageService.getNextMonthCalendar(page);
            }
            const dailySlotsForMonth = await getDailyAvailabilityCountsForMonth(
                page,
                pageService
            );
            // Add all day objects to results.availability
            dailySlotsForMonth.forEach(
                (value, key) => (results.availability[key] = value)
            );
        }
    
        results.hasAvailability = !!Object.keys(results.availability).length;
    */

    return results;
}

/**
 * The Trinity EMS scheduling page presents a drop-down month chooser.
 * This function gets the number of month options from the \<select\> element.
 *
 * @param {*} page
 * @returns number of months in month chooser
 */
async function getMonthCount(page) {
    const selectElement = await page.$("#chooseMonthSched");
    const optionValues = await selectElement.$$eval("option", (options) =>
        options.map((option) => option.getAttribute("value"))
    );

    return optionValues.length;
}

/**
 * The working hypothesis is that a day with availability will be marked
 * in a calendar table cell with the class "activeday", as in
 * <td class="scheduleday activeday"...>. Playing with this in the web browser
 * inspector yields a clickable day, which when clicked, shows a popup which would
 * presumably show the number of slots. Currently, it just says "No times available."
 *
 * This function evaluates the calendar for the presense of the "activeday" class. If found,
 * each day marked with it is assessed for the number of slots. The actual
 * response, how it presents the amount of availability, is not presently known, since
 * no availability has ever been posted.
 *
 * @param {*} page
 * @returns Map of availability keyed by date. Guaranteed not null, returning at least an empty map.
 */
async function getDailyAvailabilityCountsForMonth(page, pageService) {
    let monthlyAvailability = new Map();

    function reformatDate(date) {
        const dateObj = new Date(date + "T00:00:00");
        return new Intl.DateTimeFormat("en-US").format(dateObj);
    }

    const activeDays = await getActiveDays(page);

    if (activeDays.length > 0) {
        if (!activeDayPageContentSavedToS3) {
            await notificationService.handlePageContentChange(page);
            activeDayPageContentSavedToS3 = true;
        }

        try {
            for (let day of activeDays) {
                const date = await day.evaluate(
                    (el) => el.getAttribute("day"),
                    day
                );

                const slotCount = await getSlotsForDate(
                    page,
                    date,
                    pageService
                );

                monthlyAvailability.set(reformatDate(date), {
                    numberAvailableAppointments: slotCount,
                    hasAvailability: !!slotCount,
                });
            }
        } catch (error) {
            console.log(
                `${site.name} :: error trying to get day numbers: ${error}`
            );
        }
    }

    return monthlyAvailability;
}

/**
 * Looks for "no-dates-available" class, or ".activeday" elements.
 * If not found, there are active days, and the page is
 * parsed for which days have availability.
 *
 * @returns Array of active day elements. Empty array is returned if there's no availability.
 * Guaranteed not null or undefined.
 */
async function getActiveDays(page) {
    const noDatesAvailable = await page.$(".no-dates-available");
    // No appointments available if defined
    if (noDatesAvailable) {
        return [];
    } else {
        let days = [];
        try {
            days = await page.$$(".activeday");
        } catch (error) {
            console.log(`error trying to get day numbers: ${error}`);
        }
        return days;
    }
}

/**
 * Fetches the small snippet of HTML which would appear in a popup when an active day is clicked by a human.
 *
 * As yet, it's not know how the slot count will be presented. See parseHTMLforSlotCount().
 * @param {*} page
 * @param {String} dateStr -- yyyy-mm-dd, as in '2021-04-26'
 * @returns response text of available times XHR query
 */
async function getSlotsForDate(page, dateStr, pageService) {
    const slotCountResponse = await pageService.fetchSlotsResponse(
        page,
        dateStr
    );
    return parseHTMLforSlotCount(page, slotCountResponse);
}

async function fetchSlotsResponse(page, dateStr) {
    const url = [
        "https://app.acuityscheduling.com/schedule.php?action=availableTimes",
        "showSelect=0",
        "fulldate=1",
        "owner=21713854",
        "type=19620839",
        "calendar=5109380",
        `date=${dateStr}`,
        "ignoreAppointment=",
    ].join("&");

    const slotResponse = await page.evaluate(async (url) => {
        const response = await fetch(url);
        const text = await response.text();
    }, url);

    return slotResponse;
}

/**
 * Advances the page to the next month by clicking on the "next" button.
 *
 * @param {*} page
 */
async function advanceMonth(page) {
    const nextMonthLinkClass = ".calendar-next";

    try {
        await Promise.all([
            await page.click(nextMonthLinkClass),
            /*
            For some unexplainable reason, using the default timeout (30000 ms)
            results in a timeout! No results will be returned.

            Setting the timeout to something shorter yields results.

            5000 seems to be too much time because the page update
            returns nearly instantaneously.

            No clear way to determine what is the optimal value, so will leave
            it set to 5000 -- anything shorter might causes problems.
            */
            await page.waitForSelector("#chooseMonthSched", {
                timeout: 15000,
            }),
        ]);
    } catch (error) {
        console.log(`${site.name} :: trouble advancing button: ${error}`);
    }
}

function defaultPageService() {
    return {
        async getHomePage(browser) {
            const classToWaitFor = ".scheduleday";
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

        async fetchSlotsResponse(page, dateString) {
            return fetchSlotsResponse(page, dateString);
        },
    };
}
/**
 * TODO: We don't know how availability will be described on the page at this moment.
 *
 * @param {String} responseText
 */
function parseHTMLforSlotCount(page, responseText) {
    if (!parseSlotHtmlPageContentSavedToS3) {
        notificationService.handleAvailabilityContentUpdate(page, responseText);
        parseSlotHtmlPageContentSavedToS3 = true;
    }
    // TODO: insert parsing here

    return isNaN(responseText) ? 0 : responseText;
}

async function notifyAvailabilityContentUpdate(page, responseText) {
    const msg = `${site.name} - possible appointments:\n${responseText}`;
    console.log(msg);
    await sendSlackMsg("bot", msg);
    await s3.savePageContent(site.name, page);
}

async function notifyPageContentChange(page) {
    const msg = `${site.name} - possible appointments`;
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
