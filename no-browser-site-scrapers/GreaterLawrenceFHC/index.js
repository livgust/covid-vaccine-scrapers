const { sites, provider } = require("./config");
const fetch = require("node-fetch");
const htmlParser = require("node-html-parser");
const moment = require("moment");

let currentSite = null;
module.exports = async function GetAvailableAppointments(
    _ignored,
    fetchService = liveFetchService()
) {
    console.log(`${provider} starting.`);

    const results = [];

    for (const site of sites) {
        currentSite = site;
        const websiteData = await ScrapeWebsiteData(site, fetchService);

        results.push(websiteData);
    }

    console.log(`${provider} done.`);
    return results;
};

function liveFetchService() {
    return {
        async fetchAvailability(site, startDate, nextPrev) {
            return await fetchAvailability(site, startDate, nextPrev);
        },
    };
}

async function ScrapeWebsiteData(site, fetchService) {
    // get current listing, and then advance month until no further availability
    let monthAvailabilityMap = new Map();
    // let [startDate, nextPrev] = [null, null];
    let startDate = null;
    let nextPrev = null;
    const results = {
        availability: {},
        hasAvailability: false,
    };

    do {
        const calendarHtml = await fetchService.fetchAvailability(
            site,
            startDate,
            nextPrev
        );
        // parse calendarHtml
        const root = htmlParser.parse(calendarHtml);

        monthAvailabilityMap = extractAvailability(root);
        // Add all day objects to results.availability
        monthAvailabilityMap.forEach((value, key) => {
            results.availability[key] = {
                numberAvailableAppointments: value,
                hasAvailability: !!value,
            };
        });
        // Array.from(monthAvailabilityMap.entries()).reduce(
        //     (acc, [key, value]) => ({ ...acc, [key]: value }),
        //     results.availability
        // );
        [startDate, nextPrev] = getStartDateAndNextPrevParams(root);
        // console.log(
        //     `site: ${site.public.name} :: startDate: ${startDate}, nextprev: ${nextPrev}`
        // );
    } while (monthAvailabilityMap.size > 0);

    return {
        ...site.public,
        ...results,
        hasAvailability: Object.keys(results).length > 0,
        timestamp: moment().format(),
    };
}

async function fetchAvailability(site, startDate, nextPrev) {
    const bodyString = bodyParamString(
        site.private.calendar,
        startDate,
        nextPrev
    );
    console.log(`bodyString: ${bodyString}`);

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

function extractAvailability(root) {
    const map = getDailyAvailabilityCountsForMonth(root);
    return map;
    /*
        const slots = root.querySelectorAll(".time-selection");
        if (slots.length > 0) {
            results.totalAvailability = slots.length;
            results.hasAvailability = true;
        }
        return results;
        */
}

function bodyParamString(calendar, startDate, nextPrev) {
    /* Example with nextprev and month=
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
        // nextprev%5D%5B2021-05-12%5D=2021-04-11
        paramsList.push(`options%5B${nextPrev}`);
    }
    return paramsList.join("&");
}

/**
 *
 * @param {HTMLElement} root
 * @returns
 */
function getDailyAvailabilityCountsForMonth(root) {
    function reformatDate(dateStr) {
        return moment(`${dateStr}T00:00:00`).format("M/D/YYYY");
    }

    /*
        The website seems to have changed to "alert-danger" for its "no
        times available" message. Keeping the old way ("#no-times-availabile-message")
        in case they switch back.
     */
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
    // console.log(`match parens content: ${content}`);

    const split = content[0].split(",");
    // console.log(split);

    const parensPattern = /[()']/g;

    const result = split.map((s) => s.replace(parensPattern, "").trim());
    // console.log(`startDate and nextprev: ${result}`);

    const nextPrev = result[1].match(/nextprev.*/)[0].replace(/%22%7D%7D/, "");
    console.log(`nextprev: ${nextPrev}`);

    return [result[0], nextPrev];
}
