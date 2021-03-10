const { site } = require("./config.js");

module.exports = async function GetAvailableAppointments(browser) {
    const siteName = site.name;
    console.log(`${siteName} starting.`);
    const availability = await ScrapeWebsiteData(browser, site);
    console.log(`${siteName} done.`);
    return {
        ...site,
        ...availability,
    };
};

async function ScrapeWebsiteData(browser, site) {
    const page = await browser.newPage();

    await page.goto(site.website);
    try {
        // Wait until Javascript has loaded availabity data
        const classToWaitFor = ".scheduleday";
        await waitForLoadComplete(page, classToWaitFor);
    } catch (error) {
        console.log(`error waiting for `);
        return { hasAvailability: false };
    }

    // Initialize results to no availability
    const results = {
        availability: {},
        hasAvailability: false,
    };

    const monthCount = await getMonthCountFromDropDown(page);

    for (const key of new Array(monthCount).keys()) {
        // for the current month, we scrape the initial page
        if (key > 0) {
            // advance page to next month
            await advanceMonth(page);
        }
        const dailySlotsForMonth = await getDailyAvailabilityCountsForMonth(
            page
        );

        accumulateAvailabilityForMonth(results, dailySlotsForMonth);
    }

    return results;
}

/**
 *
 * @param {*} page
 * @returns number of months in month chooser (drop-down)
 */
async function getMonthCountFromDropDown(page) {
    const selectElement = await page.$("#chooseMonthSched");
    const options = await selectElement.$$("option");
    return options.length;
}

/**
 * The working hypothesis is that a day with availability will be marked
 * in the calendar table cell with the class "activeday", as in
 * <td class="scheduleday activeday"...>. Playing with this in the web browser
 * inspector yields a clickable day, which when clicked, shows a popup which would
 * presumably show the number of slots. Currently, it just says "No times available."
 *
 * This method evaluates the calendar for the presense of the "activeday" class. If found,
 * each day marked with it is assessed for the number of slots via an XHR query. The actual
 * response, how it presents the amount of availability, is not presently known, since
 * no availability has ever been posted.
 *
 * @param {*} page
 * @returns
 */
async function getDailyAvailabilityCountsForMonth(page) {
    let days = [];
    let monthlyAvailability = {};

    const activeDays = await getActiveDays(page);

    if (activeDays.length > 0) {
        /*
        <div class="choose-time-container" style="top: 457px; left: 249.1875px; width: 140px; display: block;">
            <h1>24</h1>
        */
        try {
            for (let day of activeDays) {
                /* Working hypothesis: the "activeday" CSS class will mark days with available slots.
                <td class="scheduleday activeday ..." day="2021-04-24"
                    data-qa="monthly-calendar-24-day-select"><span data-qa=""
                        class="scheduledate">24</span>
                </td>
                */
                const date = await page.evaluate(
                    (el) => el.getAttribute("day"),
                    day
                );

                const slotCount = await getSlotsForDate(page, date);

                monthlyAvailability[date] = {
                    hasAvailability: !!slotCount,
                    numberAvailableAppointments: slotCount,
                };
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
 * If not found, there are active days, and the page should be
 * parsed for which days have availability.
 *
 * @returns Array of active day elements. Empty array is returned if there's no availability.
 */
async function getActiveDays(page) {
    // Sanity check that we are reading the calendar...
    const dayCount = await (await page.$$(".scheduleday")).length;

    const noDatesAvailable = await page.$(".no-dates-available");
    // No appointments available if defined
    if (noDatesAvailable != undefined) {
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
async function getSlotsForDate(page, dateStr) {
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

    return await page.evaluate(async (url) => {
        const response = await fetch(url);
        const text = await response.text();
        return parseHTMLforSlotCount(text);
    }, url);
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
            // If the timeout option is not set, the timeout (30000 ms) will expire, and
            // no results will be returned. Setting it to something shorter yields results.
            // 5000 seems to be too much because the pages return nearly instantaneously.
            // But will leave it at that just in case of ... what?
            await page.waitForSelector(nextMonthLinkClass, {
                timeout: 5000,
            }),
        ]);
    } catch (error) {
        console.log(`${site.name} :: trouble advancing button: ${error}`);
    }
}

/**
 * Accumulates a month's worth of availability into the results object.
 *
 * @param {availability Object} dailySlotsForMonth -- a month's collection of availability by date
 */
function accumulateAvailabilityForMonth(results, dailySlotsForMonth) {
    if (
        dailySlotsForMonth == null ||
        Object.keys(dailySlotsForMonth).length == 0
    ) {
        return;
    }

    try {
        let accumulatedAvailability = results.availability;
        Object.assign(
            results.availability,
            accumulatedAvailability,
            dailySlotsForMonth
        );
        results.hasAvailability = true;
    } catch (error) {
        console.log(`${site.name} :: error trying to merge results: ${error}`);
    }
}

/**
 * TODO: this is just a guess as to how the popup will present the number of appointments.
 *
 * @param {String} responseText
 */
function parseHTMLforSlotCount(responseText) {
    const text = responseText;
    const pattern = /\d+/;
    const number = text.match(pattern);

    return number == null ? 0 : number[0];
}

async function waitForLoadComplete(page, loaderSelector) {
    await page.waitForSelector(loaderSelector, {
        visible: true,
        timeout: 15000,
    });
}
