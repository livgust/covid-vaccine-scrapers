const { entityName, loginUrl } = require("./config");
const storesList = require("./stores");

const moment = require("moment");

module.exports = async function GetAvailableAppointments(
    browser,
    fetchService = liveFetchService()
) {
    console.log(`${entityName} starting.`);

    const results = {
        parentLocationName: `${entityName}`,
        isChain: true,
        timestamp: moment().format(),
        individualLocationData: [],
    };

    try {
        results.individualLocationData = await ScrapeWebsiteData(
            browser,
            fetchService
        );
    } catch (error) {
        console.log(error);
    }

    console.log(`${entityName} done.`);

    return results;
};

/**
 * Dependency injection: in live scraping, the fetchAvailability() in this module is used.
 * In testing, mocks of these functions are injected.
 */
function liveFetchService() {
    return {
        getStores() {
            return storesList.stores;
        },
        async login(page) {
            return await login(page);
        },
        async fetchStoreAvailability(
            page,
            accountId,
            startDate,
            endDate,
            storeNumber
        ) {
            return await fetchStoreAvailability(
                page,
                accountId,
                startDate,
                endDate,
                storeNumber
            );
        },
    };
}

async function ScrapeWebsiteData(browser, fetchService) {
    const accountId = process.env.WALMART_CUSTOMER_ACCOUNT_ID;

    const stores = fetchService.getStores();
    const { startDate, endDate } = getStartEndDates();

    const results = [];

    const page = await fetchService.login(browser);

    if (page) {
        // Allows logging from page.evaluate(...)
        page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
        // Just try a limited number of storeIds until "Target closed" issue is resolved.
        // Object.keys(stores)
        ["2902", "3114", "2341"].forEach(async (storeId) => {
            try {
                let response = await fetchService.fetchStoreAvailability(
                    page,
                    accountId,
                    startDate,
                    endDate,
                    storeId
                );

                const availability = parseAvailability(response);
                results.push({
                    ...stores[storeId],
                    ...availability,
                    hasAvailability:
                        Object.keys(availability.availability).length > 0,
                });
            } catch (error) {
                console.log(`error trying to get data: ${error}`);
                throw new Error(
                    `${entityName} scraper has failed. Original ${error}`
                );
            }
        });
    }

    return results;
}

/**
 * Uses browser fetch() to get JSON for store availability.
 *
 * @param {Page} page
 * @param {String} storeNumber
 * @return response JSON
 */
async function fetchStoreAvailability(
    page,
    accountId,
    startDate,
    endDate,
    storeId
) {
    const response = await page
        .evaluate(
            async (accountId, startDate, endDate, storeId) => {
                const requestInput = `https://www.walmart.com/pharmacy/v2/clinical-services/time-slots/${accountId}`;
                const requestInit = {
                    headers: {
                        accept: "application/json",
                        "accept-language": "en-US,en;q=0.9",
                        "content-type": "application/json",
                        "rx-electrode": "true",
                        "sec-ch-ua":
                            '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
                        "sec-ch-ua-mobile": "?0",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin",
                        "wpharmacy-source": `web/chrome89.0.4389/OS X 11.2.3/${accountId}`,
                        "wpharmacy-trackingid":
                            "2d7f0aa0-009d-486b-b37d-30fe0ae9d5a3",
                    },
                    referrer:
                        "https://www.walmart.com/pharmacy/clinical-services/immunization/scheduled?imzType=covid&action=SignIn&rm=true&r=yes",
                    referrerPolicy: "strict-origin-when-cross-origin",
                    body: `{\"startDate\":\"${startDate}\",\"endDate\":\"${endDate}\",\"imzStoreNumber\":{\"USStoreId\":\"${storeId}\"}}`,
                    method: "POST",
                    mode: "cors",
                    credentials: "include",
                };

                // This logging only occurs if -> page.on("console", ...). See above.
                // This logging was added to debug an incorrect payload format -- an extra double-quote
                // in the body value.
                console.log(`${requestInput}`);
                console.log(`${JSON.stringify(requestInit)}`);

                // This is where we get
                // Error: Protocol error (Runtime.callFunctionOn): Target closed.
                // Only once has a single fetch worked, so the requestInput and requestInit
                // parts seem to be correct.
                return await fetch(requestInput, requestInit)
                    .then((res) => res.json())
                    .then((json) => json)
                    .catch((error) =>
                        console.error(`fetch availability error: ${error}`)
                    );
            },
            accountId,
            startDate,
            endDate,
            storeId
        )
        .catch((error) => {
            console.log(`fetch availability error: ${error}`);
        });

    console.log(`response: ${JSON.stringify(response)}`);

    return response;
}

function parseAvailability(response) {
    const result = {
        availability: {},
        hasAvailability: false,
        signUpLink: loginUrl,
        timestamp: moment(),
    };

    // slotDays is an array of objects:
    // {slotDate: "04212021", slots: [...], message}

    response?.data?.slotDays?.forEach((day) => {
        if (day.slots.length > 0) {
            const dateParts = day.slotDate.match(/(\d{2})(\d{2})(\d{4})/);
            result.availability[
                `${dateParts[1]}/${dateParts[2]}/${dateParts[3]}`
            ] = {
                numberAvailableAppointments: day.slots.length,
                hasAvailability: day.slots.length > 0,
            };
            result.hasAvailability = true;
        }
    });

    return result;
}

function getStartEndDates() {
    const walmartFormat = "MMDDYYYY";

    // TODO: Appointments end at 6 pm. Should scraping after closing time set the startDate to the
    // next day? Caution: the fetch query is sensitive to the endDate being beyond their range of 6 days.

    const addDay = 0; // moment().hour() > 18 ? 1 : 0;
    return {
        startDate: moment().add(addDay, "days").format(walmartFormat),
        endDate: moment().add(/* addDay + */ 6, "days").format(walmartFormat),
    };
}

/**
 * Login using puppeteer. No direct access to data URLs.
 * After logging in, access to availability can be done via fetch within the browser.
 * Fetch within the browser applies login credentials.
 *
 * @param {Page} page
 * @returns
 */
async function login(browser) {
    // page is mutable because we may need to close this one, and open a new one...
    let page = await browser.newPage();
    await page.setCacheEnabled(false);

    // Try to log-in:
    // await page.goto(loginUrl);

    // The user name input always shows up, so wait for the password field:
    // await page.waitForSelector("input#password");

    // Some 25% - 50% of the time, the password input fails to materialize!
    // May need to loop, say 4 times, if this times out, breaking once it
    // does show up.

    // The only problem is, the following loop fails to solve the problem.
    // It may be necessary to close the current page, get a new one, and if
    // the password field shows up, pass the new page as the return value.

    // But ... this still does not seem to solve the problem. Once the password
    // field doesn't show up, it won't up in the newly created page either!
    // It's as though some kind of caching is occurring.

    let tryCount = 1;
    for await (_ of [..."4321"]) {
        await page.goto(loginUrl);
        let inputElement = null;
        try {
            console.log(`login try count: ${tryCount}`);
            tryCount += 1;
            inputElement = await page.waitForSelector("input#password", {
                timeout: 1000,
            });
        } catch (error) {
            console.log(error);
            await page.close();
            page = await browser.newPage();
            await page.setCacheEnabled(false);
        }

        if (inputElement) {
            break;
        }
    }

    await page.type("input#email", process.env.WALMART_EMAIL);
    await page.waitForTimeout(300);
    await page.type("input#password", process.env.WALMART_PASSWORD);

    await page.click("#sign-in-form > button[type='submit']");

    await page.waitForNavigation().then(
        () => {},
        (err) => {
            page.screenshot({ path: "walmart.png" }); // login failed
            return false;
        }
    );

    // Wait for the store list page
    await page.waitForSelector(".store-list-container");

    // Code attempting to change the zip code setting.
    // Probably not necessary. Keeping just in case.
    /*
    Promise.all([
        await page.evaluate(() => {
            document
                .querySelector("button[data-automation-id='change-location']")
                .click();
        }),
        await page.waitForSelector("div.zip-form-footer"),
        await page.evaluate(() => {
            return (document.querySelector(
                "input[data-tl-id='store-finder-pickup-location']"
            ).value = "02118");
        }),
        await page.evaluate(() => {
            const button = document.querySelector(
                "button[data-automation-id='find-stores']"
            );
            if (button) {
                button.click();
            }
        }),
        await page.waitForSelector(
            "button[data-automation-id='change-location']"
        ),
    ]);
    */

    return page;
}
