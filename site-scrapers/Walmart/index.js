const { entityName, loginUrl } = require("./config");
const storesList = require("./stores");

const moment = require("moment");
const { savePageContent } = require("../../lib/s3");
const { sendSlackMsg } = require("../../lib/slack");

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

    results.individualLocationData = await ScrapeWebsiteData(
        browser,
        fetchService
    );

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
    const page = await browser.newPage();

    // Set up data used by the scraper to login, and to fetch availability.
    const accountId = process.env.WALMART_CUSTOMER_ACCOUNT_ID;
    const stores = fetchService.getStores();
    const { startDate, endDate } = getStartEndDates();

    const results = [];

    try {
        // Allows logging from page.evaluate(...)
        page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

        await fetchService.login(page);

        for (const storeId of Object.keys(stores)) {
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
                console.error(`error trying to get data: ${error}`);
                throw new Error(
                    `${entityName} scraper has failed. Original ${error}`
                );
            }
        }
    } catch (error) {
        savePageContent(entityName, page);
        sendSlackMsg("bot", `${entityName} failed to login`);
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
    await page.waitForTimeout(100);
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
                        // "sec-ch-ua":
                        //     '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
                        // "sec-ch-ua-mobile": "?0",
                        // "sec-fetch-dest": "empty",
                        // "sec-fetch-mode": "cors",
                        // "sec-fetch-site": "same-origin",
                        // "wpharmacy-source": `web/chrome89.0.4389/OS X 11.2.3/${accountId}`,
                        // "wpharmacy-trackingid":
                        //     "2d7f0aa0-009d-486b-b37d-30fe0ae9d5a3",
                    },
                    referrer:
                        "https://www.walmart.com/pharmacy/clinical-services/immunization/scheduled?imzType=covid&action=SignIn&rm=true&r=yes",
                    referrerPolicy: "strict-origin-when-cross-origin",
                    body: `{\"startDate\":\"${startDate}\",\"endDate\":\"${endDate}\",\"imzStoreNumber\":{\"USStoreId\":\"${storeId}\"}}`,
                    method: "POST",
                    mode: "cors",
                    credentials: "include",
                };

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
            console.error(`fetch availability error: ${error}`);
        });

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

    return {
        startDate: moment().format(walmartFormat),
        endDate: moment().add(6, "days").format(walmartFormat),
    };
}

/**
 * Login using puppeteer. No direct access to data URLs.
 * After logging in, access to availability can be done via fetch within the browser.
 * Fetch within the browser applies login credentials.
 *
 * @param {Page} page
 * @returns true if successful
 * @throws if the password field doesn't appear (it happens too often)
 */
async function login(page) {
    const signInWithEmailValidationFormSelector =
        "#sign-in-with-email-validation";
    const signInWithPasswordFormSelector = "#sign-in-with-password-form";

    const submitEmailButtonSelector =
        "button[data-automation-id='signin-continue-submit-btn']";
    const submitPasswordButtonSelector =
        "#sign-in-with-password-form > button[type='submit']";

    const emailInputSelector = "input#email";
    const passwordInputSelector = "input#password";

    await page.goto(loginUrl);

    await page.waitForSelector(emailInputSelector);

    const emailValidationForm = await page.$(
        signInWithEmailValidationFormSelector
    );

    if (emailValidationForm) {
        await page.type(emailInputSelector, process.env.WALMART_EMAIL);
        const btn = await page.$(submitEmailButtonSelector);

        await page.click(submitEmailButtonSelector);

        await page.waitForSelector("#sign-in-password-no-otp");
        await page.waitForTimeout(300);
        await page.type(
            "#sign-in-password-no-otp",
            process.env.WALMART_PASSWORD
        );

        await page.waitForTimeout(300);

        // The "remember me" checkbox appears again but with a different id!
        await page.evaluate(() => {
            const checkbox = document.querySelector("#remember-me-pwd");
            console.log(`remember me checkbox exists: ${checkbox}`);
            if (checkbox) {
                console.log("unchecking remember me...");
                checkbox.checked = false;
            }
        });

        await page.waitForTimeout(300);

        await page.evaluate(() => {
            const button = document.querySelector(
                "button[data-automation-id='sign-in-pwd']"
            );
            console.log(`sign-in-pwd button is: ${button}`);
            if (button) {
                console.log("clicking password submit button ...");
                button.click();
                console.log("clicked password submit button ...");
            }
        });
    } else {
        await page.waitForSelector(emailInputSelector);
        await page.type(emailInputSelector, process.env.WALMART_EMAIL);

        await page.waitForSelector(passwordInputSelector, { timeout: 5000 });
        await page.waitForTimeout(300);
        await page.type("input#password", process.env.WALMART_PASSWORD);

        // Uncheck the "remember me" checkbox
        await page.evaluate(() => {
            const checkbox = document.querySelector("#remember-me");
            console.log(`remember me checkbox exists: ${checkbox}`);
            if (checkbox) {
                console.log("unchecking remember me...");
                checkbox.checked = false;
            }
        });

        await page.waitForTimeout(300);

        const submitButtonSelector =
            "button[data-automation-id='signin-submit-btn']";
        const submitBtn = await page.$(submitButtonSelector);
        await page.click(submitButtonSelector);
    }

    await page.waitForNavigation().catch((error) => {
        page.screenshot({ path: "walmart.png" }); // login failed
    });

    // Wait for the store list on the page
    await page.waitForSelector(".store-list-container");
    await page.waitForTimeout(500);
}
