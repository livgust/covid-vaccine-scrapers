const { entityName, loginUrl } = require("./config");
// const { parseAvailability, getStores } = require("./walmartBase");

const moment = require("moment");

module.exports = async function GetAvailableAppointments(
    browser,
    fetchService = liveFetchService()
) {
    console.log(`${entityName} starting.`);

    const websiteData = await ScrapeWebsiteData(browser, fetchService);

    const results = {
        parentLocationName: `${entityName}`,
        isChain: true,
        timestamp: moment().format(),
        individualLocationData: websiteData,
    };

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
            return getStores();
        },
        async login(page) {
            return await login(page);
        },
        async fetchStoreAvailability(page, storeNumber) {
            return await fetchStoreAvailability(page, storeNumber);
        },
    };
}

async function ScrapeWebsiteData(browser, fetchService) {
    const page = await browser.newPage();

    const loginSucceeded = await fetchService.login(page);

    const results = [];

    const stores = fetchService.getStores();
    if (loginSucceeded) {
        Promise.all([
            Object.keys(stores).forEach(async (storeNumber) => {
                let response = await fetchService.fetchStoreAvailability(
                    page,
                    storeNumber
                );

                // accumulate the store results into the encompassing results object
                const availability = parseAvailability(response);

                results.push({
                    ...stores[storeNumber],
                    ...availability,
                    hasAvailability:
                        Object.keys(availability.availability).length > 0,
                });
            }),
        ]);
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
async function fetchStoreAvailability(page, storeNumber) {
    const accountId = process.env.WALMART_CUSTOMER_ACCOUNT_ID;
    const inventoryUrl = `https://www.walmart.com/pharmacy/v2/clinical-services/inventory/store/${storeNumber}/${accountId}?type=imz`;
    return await page.evaluate(async (storeNumber, inventoryUrl) => {
        fetch(inventoryUrl)
            .then((res) => res.json())
            .then((json) => {
                return json;
            })
            .catch((error) => console.log(`Argh! ${error}`));
    });
}

/**
 * Login using puppeteer. No direct access to data URLs.
 * After logging in, access to availability can be done via fetch within the browser.
 * Fetch within the browser applies login credentials.
 *
 * @param {Page} page
 * @returns
 */
async function login(page) {
    await page.goto(loginUrl);

    await page.waitForSelector("input#email");

    await page.type("input#email", process.env.WALMART_EMAIL);
    await page.waitForTimeout(200);
    await page.type("input#password", process.env.WALMART_PASSWORD);

    await page.click("#sign-in-form > button[type='submit']");

    const success = await page.waitForNavigation().then(
        () => {
            return true;
        },
        (err) => {
            page.screenshot({ path: "walmart.png" }); // login failed
            return false;
        }
    );
    return success;
}

function getStores() {
    const { stores } = require("./stores");
    return stores;
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

    response?.data?.slotDays.forEach((day) => {
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
