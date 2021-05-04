const { site } = require("./config");
const fetch = require("node-fetch");
const htmlParser = require("node-html-parser");
const moment = require("moment");

module.exports = async function GetAvailableAppointments(
    _ignored,
    fetchService = liveFetchService()
) {
    console.log(`${site.name} starting.`);

    const websiteData = await ScrapeWebsiteData(site, fetchService);

    const results = {
        parentLocationName: `${site.name}`,
        timestamp: moment().format(),
        individualLocationData: [websiteData],
    };

    console.log(`${site.name} done.`);

    return results;
};

/**
 * Dependency injection: in live scraping, the fetchAvailability() in this module is used.
 * In testing, a mock fetchAvailability() is injected.
 */
function liveFetchService() {
    return {
        async fetchFrontPage(frontPageUrl) {
            return await fetchFrontPage(frontPageUrl);
        },
        async fetchCalendarPage(calendarUrl) {
            return await fetchCalendarPage(calendarUrl);
        },
    };
}

async function ScrapeWebsiteData(site, fetchService) {
    const availabilityContainer = {
        availability: {},
        hasAvailability: false,
    };

    const linksArray = await getCalendarLinks(fetchService, site.signUpLink);

    for (const link of linksArray) {
        // console.log(`calendarPageLink: ${link}`);

        const monthAvailabilityMap = await getSlotsFromPage(fetchService, link);

        // Add all day objects to results.availability
        monthAvailabilityMap.forEach((value, key) => {
            availabilityContainer.availability[key] = {
                numberAvailableAppointments: value,
                hasAvailability: !!value,
            };
        });
    }

    const results = {
        ...site,
        ...availabilityContainer,
        hasAvailability:
            Object.keys(availabilityContainer.availability).length > 0,
    };
    return results;
}

/**
 * Gets links that might be on the vaccine site's front page which
 * point to pages containing a calendar for a specific date.
 *
 * @param {*} fetchService
 * @param {String} frontPageUrl is the website URL
 * @returns an array of links (URLs): may be empty, or contain one or more links. Guaranteed not null.
 */
async function getCalendarLinks(fetchService, frontPageUrl) {
    const frontPageHtml = await fetchService.fetchFrontPage(frontPageUrl);
    // parse response
    /* look for
        <a href="https://www.signupgenius.com/go/409054CA9AB2CA2FA7-413">
        Tuesday April 13 at Whittier Rehabilitation Hospital Bradford, 145 Ward Hill Ave, Haverhill 01835&nbsp;
        </a>
    */
    const root = htmlParser.parse(frontPageHtml);

    const aList = root.querySelectorAll("a");

    const calendarLinks = aList
        .map((a) => a.getAttribute("href"))
        .filter((href) => href.includes("signupgenius"));

    return calendarLinks;
}

/**
 * Fetches the HTML for the front page of the vaccination site.
 *
 * @param {String} link to the Whittier Vaccine Clinic front page (see config.js -> signUpLink)
 * @returns HTML of the front page of the vaccination site.
 */
async function fetchFrontPage(link) {
    const response = await fetch(link)
        .then((res) => res.text())
        .then((html) => {
            return html;
        })
        .catch((error) =>
            console.log(
                `${site.name} :: error fetching sign up links on front page: ${error}`
            )
        );

    return response;
}

/**
 * Get the HTML containing a calendar by fetchings the link.
 * The link should look like this:
 * 'https://www.signupgenius.com/go/409054CA9AB2CA2FA7-413'
 * where the "413" is April 3.
 *
 * @param {String} link to the calendar page
 * @returns HTML containing a SignupGenius calendar
 */
async function fetchCalendarPage(calendarUrl) {
    const response = await fetch(calendarUrl)
        .then((res) => res.text())
        .then((html) => {
            return html;
        })
        .catch((error) =>
            console.log(
                `${site.name} :: error fetching calendar page: ${error}`
            )
        );

    return response;
}

/**
 * Gets the slots available on the calendar page. Parses the page for
 * the date, and gets the availability for that date from the calendar page.
 *
 * @param {*} fetchService
 * @param {*} link
 * @returns a Map keyed by date; value = number of available slots. Expect only on entry
 * because each calendar page is for a specific date.
 */
async function getSlotsFromPage(fetchService, link) {
    const calendarHtml = await fetchService.fetchCalendarPage(link);

    const date = calendarHtml.match(/\d{1,2}\/\d{1,2}\/\d{4}/)[0];

    const root = htmlParser.parse(calendarHtml);

    let monthAvailabilityMap = getDailyAvailabilityCountsInCalendar(root, date);

    return monthAvailabilityMap;
}

/**
 * Gets the available slots in a calendar.
 * @param {HTMLElement} root
 * @returns
 */
function getDailyAvailabilityCountsInCalendar(root, date) {
    if (signUpIsFull(root)) {
        return new Map();
    }

    let dailySlotCountsMap; // keyed by date, value accumulates slot counts per date.

    try {
        /*
            <tr>
                <td valign="top" width="48%" style="padding-top:10px;">
                    <p class="SUGbigbold hrow">Vaccine Appointment (4)</p>
                    <p class="SUGsmall hrow">
                    </p>
                </td>
                <td width="4%" valign="top">
                    &nbsp;
                </td>
                <td valign="top" width="48%">
                    <div style="padding-top:5px !important;">
                    <span class="SUGbigbold" style="line-height: 18px;">1 of 4 slots filled</span>
                    </div>
                    <div class="SUGbuttonContainer link_cursor" style="margin-top:10px;">
                        <span class="SUGbutton rounded">
                            <span onclick="checkTheBox(921218557);checkLIST(921218557);">Sign Up&nbsp;</span>
                            <input name="siid" type="checkbox" value="921218557" id="checkbox921218557" style="vertical-align: middle;position:relative;bottom:3px;" onclick="checkLIST(921218557);">
                        </span>
                    </div>
                </td>
            </tr>
        */
        let rows = root.querySelectorAll(".SUGbigbold.hrow");

        dailySlotCountsMap = rows.reduce((acc, row) => {
            let slotCount = 0;
            const outerRow = row.parentNode.parentNode;
            const alreadyFilled = outerRow.querySelector(".SUGsignups");
            if (!alreadyFilled) {
                slotCount = outerRow
                    .querySelector(".SUGbigbold.hrow")
                    .innerText.match(/\((\d+)\)/)[1];

                const xOfyFilled = outerRow.querySelector("span.SUGbigbold");
                if (xOfyFilled) {
                    const xOfYMatches = xOfyFilled.innerText.match(/\d+/g);
                    slotCount = xOfYMatches[1] - xOfYMatches[0];
                }
            }
            acc.set(date, (acc.get(date) || 0) + parseInt(slotCount));
            return acc;
        }, new Map());
    } catch (error) {
        console.error(`error trying to get day numbers: ${error}`);
    }

    return dailySlotCountsMap ? dailySlotCountsMap : new Map();
}

/**
 * Checks for ("#submitfooter h1").innerText == "NO SLOTS AVAILABLE. SIGN UP IS FULL."
 *
 * @param {HTMLElement} root
 * @returns true if the banner is there
 */
function signUpIsFull(root) {
    const submitFooter = root.querySelector("#submitfooter h1");
    let isFull =
        submitFooter &&
        submitFooter.innerText == "NO SLOTS AVAILABLE. SIGN UP IS FULL.";

    return isFull;
}
