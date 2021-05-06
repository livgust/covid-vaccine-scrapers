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

    const DEBUG = true;
    try {
        // Uncomment if logging from page.evaluate(...) is needed for debugging.
        // page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

        const loginSucceeded = await fetchService.login(page);

        if (!loginSucceeded) {
            console.log("login failed");
            return results;
        }

        let count = 0;
        for (const storeId of Object.keys(stores)) {
            count += 1;

            if (DEBUG && count == 3) {
                break;
            }
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
                    name: "Walmart",
                    ...stores[storeId],
                    ...availability,
                    hasAvailability:
                        Object.keys(availability.availability).length > 0,
                });

                if (
                    process.env.DEVELOPMENT &&
                    (results.length % 5 == 0 ||
                        results.length == storesList.length)
                ) {
                    console.log(`    ${results.length} stores done.`);
                }
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

    page.close();

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
                    },
                    referrer:
                        "https://www.walmart.com/pharmacy/clinical-services/immunization/scheduled?imzType=covid&action=SignIn&rm=true&r=yes",
                    referrerPolicy: "strict-origin-when-cross-origin",
                    body: `{"startDate":"${startDate}","endDate":"${endDate}","imzStoreNumber":{"USStoreId":"${storeId}"}}`,
                    method: "POST",
                    mode: "cors",
                    credentials: "include",
                };

                const response = await fetch(requestInput, requestInit)
                    .then((res) => res.json())
                    .then((json) => json)
                    .catch((error) =>
                        console.error(`fetch availability error: ${error}`)
                    );

                return response;
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

    const submitEmailButtonSelector =
        "button[data-automation-id='signin-continue-submit-btn']";

    const emailInputSelector = "input#email";
    const passwordInputSelector = "input#password";

    await page.goto(loginUrl);

    await page.waitForSelector(emailInputSelector);

    const emailValidationForm = await page.$(
        signInWithEmailValidationFormSelector
    );

    // There are two processes for logging in.
    // 1. the usual enter email -> enter password -> submit.
    // 2. a sequential one: enter email -> submit -> enter password -> submit
    // Case 2 (emailValidationForm) is treated first. Case 1 is in the "else" block.

    // Note that console.log() in page.evaluate() only occurs if "page.on(...)" is uncommented above.

    if (emailValidationForm) {
        console.log(
            "email validation form: login process will confront 2 password inputs"
        );
        await page.type(emailInputSelector, process.env.WALMART_EMAIL);

        await page.click(submitEmailButtonSelector);

        await page.waitForSelector("#sign-in-password-no-otp");
        await page.waitForTimeout(300);
        await page.type(
            "#sign-in-password-no-otp",
            process.env.WALMART_PASSWORD
        );

        await page.waitForTimeout(300);

        // The "remember me" checkbox appears, but with a different id!
        await page.evaluate(() => {
            const checkbox = document.querySelector("#remember-me-pwd");
            console.log(`remember me checkbox exists: ${checkbox}`);
            if (checkbox) {
                console.log("unchecking remember me...");
                checkbox.checked = false;
            }
        });

        await page.waitForTimeout(300);

        // The following will fail to submit. But see password entry and click retry below.
        await page
            .evaluate(() => {
                const button = document.querySelector(
                    '#sign-in-with-password-form > .buttons-container button[data-automation-id="sign-in-pwd"]'
                );
                console.log(
                    `sign-in-pwd button form's HTML: ${button.form.outerHTML}`
                );
                // debugger; // This sets a breakpoint in the next line; go to Chrome to continue stepping.
                if (button) {
                    console.log("clicking password submit button ...");
                    button.click();
                    console.log("clicked password submit button ...");
                } else {
                    console.log("Didn't find the 'sign-in-pwd' button!");
                }
            })
            .catch((error) => {
                // debugger; // This breakpoint doesn't get hit because there is no error!
                console.log(
                    `error just after clicking password submit button: ${error}`
                );
            });

        const passwordField = await page.$("#sign-in-password-no-otp");
        if (passwordField) {
            // The only way to solve this is to enter the password again, and then click again.
            await page.type(
                "#sign-in-password-no-otp",
                process.env.WALMART_PASSWORD
            );

            await page.waitForTimeout(300);

            await page
                .evaluate(() => {
                    const button = document.querySelector(
                        '#sign-in-with-password-form > .buttons-container button[data-automation-id="sign-in-pwd"]'
                    );
                    console.log(
                        `sign-in-pwd button form's HTML: ${button.form.outerHTML}`
                    );
                    // debugger; // This sets a breakpoint in the next line; go to Chrome to continue stepping.
                    if (button) {
                        console.log("clicking password submit button ...");
                        button.click();
                        console.log("clicked password submit button ...");
                    } else {
                        console.log("Didn't find the 'sign-in-pwd' button!");
                    }
                })
                .catch((error) => {
                    // debugger; // This breakpoint doesn't get hit because there is no error!
                    console.log(
                        `error just after clicking password submit button: ${error}`
                    );
                });
        }
    } else {
        // Normal log-in with both email and password input fields.
        console.log("email and password fields presented at the same time");
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
        await page.click(submitButtonSelector);
    }

    page.waitForTimeout(2000);

    const { captchas, solutions, solved, error } = await page.solveRecaptchas();

    console.log(
        `page :: captchas: ${JSON.stringify(
            captchas
        )}, solutions: ${JSON.stringify(solutions)}, solved? '${JSON.stringify(
            solved
        )}', error: ${error}`
    );

    if (solved.length) {
        await page
            .waitForNavigation({ timeout: 10000 })
            .catch((error) =>
                console.log(`waiting for page-solved navigations ${error}`)
            );
    } else {
        const childFrames = page.mainFrame().childFrames();
        // Solve the reCaptcha if it occurs.
        // Loop over all potential frames on that page
        console.log(`childFrame count: ${childFrames.length}`);
        for (const frame of page.mainFrame().childFrames()) {
            // Attempt to solve any potential reCAPTCHAs in child frames
            const {
                captchas,
                solutions,
                solved,
                error,
            } = await frame.solveRecaptchas();
            console.log(
                `frame title: '${frame.title}' :: captchas: ${captchas}, solutions: ${solutions}, solved? '${solved}', error: ${error}`
            );

            if (solved.length) {
                await page
                    .waitForNavigation({ timeout: 10000 })
                    .catch((error) =>
                        console.log(
                            `waiting for frome-solved navigations ${error}`
                        )
                    );
                break;
            }
        }
    }

    // Wait for the store list on the page
    let loginSucceeded = true;

    await page
        .waitForSelector(".store-list-container", { timeout: 10000 })
        .catch((error) => {
            loginSucceeded = false;
            console.log(
                `timed out waiting for 'store-list-container': ${error}`
            );
        });
    await page.waitForTimeout(500);

    return loginSucceeded;
}
