const { site } = require("./config");
const fetch = require("node-fetch");
const htmlParser = require("node-html-parser");
const moment = require("moment");

/**
 * enum used for determining whether to continue advancing through the calendar
 */
const STATUS = {
    FINISHED: 0,
    CONTINUE: 1,
};

module.exports = async function GetAvailableAppointments(
    _ignored,
    fetchService = liveFetchService()
) {
    console.log(`${site.public.name} starting.`);

    const results = {
        parentLocationName: site.public.name,
        timestamp: moment().format(),
        individualLocationData: [await ScrapeWebsiteData(site, fetchService)],
    };

    console.log(`${site.public.name} done.`);
    return results;
};

/**
 * Dependency injection: in live scraping, the fetchAvailability() in this module is used.
 * In testing, a mock fetchAvailability() is injected.
 */
function liveFetchService() {
    return {
        async fetchAvailability(site, calendarAdvanceOffset) {
            return await fetchAvailability(site, calendarAdvanceOffset);
        },
    };
}

async function ScrapeWebsiteData(site, fetchService) {
    const results = {
        availability: {},
        hasAvailability: false,
    };

    let monthAvailabilityMap = new Map();
    let calendarAdvanceOffset = 0;

    // Advance the calendar of each site until no availability is found.
    do {
        const calendarHtml = await fetchService.fetchAvailability(
            site,
            calendarAdvanceOffset
        );

        const root = htmlParser.parse(calendarHtml);

        if (hasNoAvailabilityMessage(root)) {
            status = STATUS.FINISHED;
        } else {
            monthAvailabilityMap = getDailyAvailabilityCountsInCalendar(root);

            // Add all day objects to results.availability
            monthAvailabilityMap.forEach((value, key) => {
                let availabilityEntry = results.availability[key];

                const currentValue = availabilityEntry
                    ? results.availability[key].numberAvailableAppointments
                    : 0;

                results.availability[key] = {
                    numberAvailableAppointments: currentValue + value,
                    hasAvailability: !!value,
                };
            });

            if (hasMoreTimes(root)) {
                status = STATUS.CONTINUE;
                calendarAdvanceOffset = getOffset(root);
            } else {
                status = STATUS.FINISHED;
            }
        }
    } while (status == STATUS.CONTINUE);

    return {
        ...site.public,
        ...results,
        hasAvailability: Object.keys(results.availability).length > 0,
        timestamp: moment().format(),
    };
}

/**
 * Fetches HTML
 *
 * @param {Object} site
 * @param {String} calendarAdvanceOffset as a string
 * @returns HTML
 */
async function fetchAvailability(site, calendarAdvanceOffset) {
    const bodyString = bodyParamString(calendarAdvanceOffset);

    const response = await fetch(site.private.fetchRequestUrl, {
        headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: bodyString,
        method: "POST",
    })
        .then((res) => res.text())
        .then((html) => {
            return html;
        })
        .catch((error) => console.log(`error fetching availability: ${error}`));

    return response;
}

/**
 * Gets the body parameter string for the fetch. Initially, there is no offset parameter.
 * To advance to the next segment of the calendar, add the offset parameter and assign
 * it the value found in the javascript snippet in the href of the button.
 *
 * @param {Int} calendarAdvanceOffset
 * @returns
 */
function bodyParamString(calendarAdvanceOffset) {
    /*
    Body when first hitting site (i.e., calendarAdvanceOffset == 0, no offset parameter):
    "type=&calendar=&skip=true&options%5Bqty%5D=1&options%5BnumDays%5D=3&ignoreAppointment=&appointmentType=&calendarID="

    Body when pressing "More Times" button (i.e., calendarAdvanceOffset > 0, offset parameter is updated):
    "type=&calendar=&month=&skip=true&options%5Boffset%5D=15&options%5BnumDays%5D=5&ignoreAppointment=&appointmentType=&calendarID="
    */

    const paramsList =
        calendarAdvanceOffset == 0
            ? [
                  "type=",
                  "calendar=",
                  "skip=true",
                  "options%5Bqty%5D=1",
                  "options%5BnumDays%5D=3",
                  "ignoreAppointment=",
                  "appointmentType=",
                  "calendarID=",
              ]
            : [
                  "type=",
                  "calendar=",
                  "month=",
                  "skip=true",
                  `options%5Boffset%5D=${calendarAdvanceOffset}`,
                  "options%5BnumDays%5D=5",
                  "ignoreAppointment=",
                  "appointmentType=",
                  "calendarID=",
              ];

    return paramsList.join("&");
}

/**
 * Gets the availability in a calendar segment (page).
 *
 * @param {HTMLElement} root
 * @returns a map keyed by date (M/D/YYYY) with the number of slots as the value.
 */
function getDailyAvailabilityCountsInCalendar(root) {
    function reformatDate(dateStr) {
        return moment(`${dateStr}`).format("M/D/YYYY");
    }

    let dailySlotCountsMap; // keyed by date, value accumulates slot counts per date.

    try {
        const containers = root
            .querySelectorAll("td.class-signup-container")
            .filter(
                (container) =>
                    !container.getAttribute("class").includes("hidden-xs")
            );

        const filteredContainers = containers.filter((container) =>
            container.querySelector(".btn-class-signup")
        );

        dailySlotCountsMap = filteredContainers
            .map((container) => {
                const date = container
                    .querySelector(".btn-class-signup")
                    .getAttribute("data-time");

                // If parseInt fails, the default is 0.
                const count =
                    parseInt(
                        container.querySelector(
                            "div.class-spots span.babel-ignore"
                        ).innerText
                    ) || 0;
                return [reformatDate(date), count];
            })
            .reduce((acc, [date, count]) => {
                acc.set(date, (acc.get(date) || 0) + count);
                return acc;
            }, new Map());
    } catch (error) {
        console.error(`error trying to get day numbers: ${error}`);
    }

    return dailySlotCountsMap ? dailySlotCountsMap : new Map();
}

/**
 * Check for indicators that there are no slots available. Acuity
 * seems to use several ways, and they seem to change over time.
 * The two most common ways are tested here.
 *
 * @param {HTMLElement} root
 * @returns true if one of the Acuity no availability indicators is found
 */
function hasNoAvailabilityMessage(root) {
    const noTimesAvailable = root.querySelector("#no-times-available-message");
    const alertDanger = root.querySelector(
        ".alert.alert-danger:not([.hidden])"
    );

    return noTimesAvailable || alertDanger;
}

/**
 * Tests to see if the "More Times" button is present.
 *
 * @param {HTMLElement} root
 * @returns not null if "More Times" link is present, false if not found (null, undefined)
 */
function hasMoreTimes(root) {
    const isMoreTimesButtonPresent = root.querySelector(".calendar-next");
    return isMoreTimesButtonPresent;
}

/**
 * The "More Times" button's javascript contains the offset for advancing the calendar:
 *
 * <a href="javascript:self.showCalendar('', {offset:15})"
 *      class="calendar-next"><span id="class-list-next">More Times</span>
 *      <i class="fa fa-chevron-right"></i>
 * </a>
 * @param {HTMLElement} root
 * @returns the text represent the numeric offset. Guard that this is called when it is
 * known that the "More Times" button exists.
 */
function getOffset(root) {
    const offset = root
        .querySelector(".calendar-next")
        .getAttribute("href")
        .match(/\offset:\d{0,2}/)[0]
        .split(":")[1];
    return offset;
}
