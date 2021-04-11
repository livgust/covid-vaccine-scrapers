const { sites, provider } = require("./config");
const fetch = require("node-fetch");
const htmlParser = require("node-html-parser");
const moment = require("moment");

module.exports = async function GetAvailableAppointments(
    _ignored,
    fetchService = liveFetchService()
) {
    console.log(`${provider} starting.`);

    const individualLocationData = [];

    for (const site of sites) {
        const websiteData = await ScrapeWebsiteData(site, fetchService);

        individualLocationData.push(websiteData);
    }

    const results = {
        parentLocationName: "Greater Lawrence FHC",
        timestamp: moment().format(),
        individualLocationData: individualLocationData,
    };

    console.log(`${provider} done.`);
    return results;
};

/**
 * Dependency injection: in live scraping, the fetchAvailability() in this module is used.
 * In testing, a mock fetchAvailability() is injected.
 */
function liveFetchService() {
    return {
        async fetchAvailability(site, startDate, nextPrev) {
            return await fetchAvailability(site, startDate, nextPrev);
        },
    };
}

async function ScrapeWebsiteData(site, fetchService) {
    const results = {
        availability: {},
        hasAvailability: false,
    };

    let monthAvailabilityMap = new Map();
    let startDate = null;
    let nextPrev = null;

    // Advance the calendar of each site until no availability is found.
    do {
        const calendarHtml = await fetchService.fetchAvailability(
            site,
            startDate,
            nextPrev
        );

        const root = htmlParser.parse(calendarHtml);

        monthAvailabilityMap = getDailyAvailabilityCountsInCalendar(root);

        // Add all day objects to results.availability
        monthAvailabilityMap.forEach((value, key) => {
            results.availability[key] = {
                numberAvailableAppointments: value,
                hasAvailability: !!value,
            };
        });
        // Get the next startDate, and nextPrev option string used in advancing the calendar in the fetch
        [startDate, nextPrev] = getStartDateAndNextPrevParams(root);
    } while (monthAvailabilityMap.size > 0);

    return {
        ...site.public,
        ...results,
        hasAvailability: Object.keys(results.availability).length > 0,
        timestamp: moment().format(),
    };
}

async function fetchAvailability(site, startDate, nextPrev) {
    const bodyString = bodyParamString(
        site.private.calendar,
        startDate,
        nextPrev
    );

    const response = await fetch(site.private.scrapeUrl, {
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
 * Gets the bodyParam string for the fetch. Initially, it has no startDate, or nextprev, but
 * does when stepping the calendar forward in time.
 * @param {String} calendar (specific to location)
 * @param {String} startDate
 * @param {String} nextPrev
 * @returns
 */
function bodyParamString(calendar, startDate, nextPrev) {
    /* Example with options[nextprev] and month=
    'type=20223228&calendar=5236989&month=2021-05-12&skip=true&options%5Bnextprev%5D%5B2021-05-12%5D=2021-04-11&options%5BnumDays%5D=5&ignoreAppointment=&appointmentType=&calendarID='
    */
    const paramsList = [
        "type=20223228",
        `calendar=${calendar}`,
        "skip=true",
        "options%5Bqty%5D=1",
        "options%5BnumDays%5D=5",
        "ignoreAppointment=",
        "appointmentType=",
        "calendarID=",
    ];
    if (startDate) {
        paramsList.push(`month=${startDate}`);
        paramsList.push(`options%5B${nextPrev}`);
    }
    return paramsList.join("&");
}

/**
 * Gets the availability in a calendar.
 * @param {HTMLElement} root
 * @returns
 */
function getDailyAvailabilityCountsInCalendar(root) {
    function reformatDate(dateStr) {
        return moment(`${dateStr}T00:00:00`).format("M/D/YYYY");
    }

    if (hasNoAvailabilityMessage(root)) {
        return new Map();
    }

    let dailySlotCountsMap; // keyed by date, value accumulates slot counts per date.

    try {
        const slots = root.querySelectorAll(".time-selection");
        dailySlotCountsMap = slots
            .map((slot) =>
                reformatDate(slot.getAttribute("data-readable-date"))
            )
            .reduce((acc, date) => {
                acc.set(date, (acc.get(date) || 0) + 1);
                return acc;
            }, new Map());
    } catch (error) {
        console.error(`error trying to get day numbers: ${error}`);
    }

    return dailySlotCountsMap ? dailySlotCountsMap : new Map();
}

/**
 * If there's no availability, Acuity indicates it in a number of ways. Check
 * for them.
 * @param {HTMLElement} root
 * @returns true if one of the Acuity no availability indicators is found
 */
function hasNoAvailabilityMessage(root) {
    const noTimesAvailable = root.querySelector("#no-times-available-message");
    const alertDanger = root.querySelector("#alert-danger");
    return noTimesAvailable || alertDanger;
}

/**
 *
 * @param {String} str
 * @returns
 */
function getStartDateAndNextPrevParams(root) {
    /* Sample HTML for startDate and nextprev
    `<a href="javascript:self.showCalendar('2021-05-11', %7B%22nextprev%22%3A%7B%222021-05-11%22%3A%222021-04-11%22%7D%7D)"
        class="calendar-next"><span data-original-text="More Times">
            More Times</span> <i class="fa fa-chevron-right"></i></a>`;
    */

    const str = root.querySelector(".calendar-next").getAttribute("href");
    const content = str.match(/\(.*\)/);

    const split = content[0].split(",");

    const result = split.map((s) => s.replace(/[()']/g, "").trim());

    const nextPrev = result[1].match(/nextprev.*/)[0].replace(/%22%7D%7D/, "");

    return [result[0], nextPrev];
}
