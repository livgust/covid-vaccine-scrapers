const { site } = require("./config");
const usZips = require("us-zips");
const moment = require("moment");
const dataFormatter = require("./dataFormatter");

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${site.name} done.`);
    const results = dataFormatter.formatAndMergeData(
        webData,
        site.locations,
        site.website
    );
    return results;
};

async function waitAndClick(page, selector) {
    await page.waitForSelector(selector);
    await page.click(selector);
    return;
}

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(site.website);
    // note: this might happen too quickly - might not show up yet
    const needToLogIn = await Promise.race([
        page.waitForSelector("#pf-dropdown-signin").then(() => true),
        page.waitForSelector("#pf-acc-signout").then(() => false),
    ]);

    if (needToLogIn) {
        await page.evaluate(() =>
            document.querySelector(".sign-in-register a").click()
        );
        await page.waitForSelector("#user_name");
        await page.type("#user_name", process.env.WALGREENS_EMAIL);
        await page.waitForTimeout(1000);
        await page.type("#user_password", process.env.WALGREENS_PASSWORD);
        await page.waitForSelector("#submit_btn:not([disabled])");
        await page.click("#submit_btn");
        await page.waitForNavigation().then(
            () => {},
            (err) => page.screenshot({ path: "walgreens.png" }) //if you get here, it's almost definitely because login failed.
        );
    }

    const isChallenge = await Promise.race([
        page.waitForSelector("#radio-security").then(() => true),
        page.waitForSelector("#pf-acc-signout").then(() => false),
    ]);

    // SECURITY CHALLENGE
    if (isChallenge) {
        await page.click("#radio-security");
        await page.click("#optionContinue");
        await page.waitForSelector("#secQues");
        await page.type("#secQues", process.env.WALGREENS_CHALLENGE);
        await page.click("#validate_security_answer");
        await page.waitForNavigation();
    }
    const availableLocations = {};

    const uniqueZips = [...new Set(site.locations.map((site) => site.zip))];

    // SEARCH PAGE
    for (const zip of uniqueZips) {
        const { latitude, longitude } = usZips[zip];
        const todayString = new moment().local().format("YYYY-MM-DD");

        let postResponse = await page.evaluate(
            (latitude, longitude, todayString) =>
                new Promise((resolve) => {
                    fetch(
                        "https://www.walgreens.com/hcschedulersvc/svc/v2/immunizationLocations/timeslots",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                position: {
                                    latitude: latitude,
                                    longitude: longitude,
                                },
                                vaccine: { productId: "" },
                                appointmentAvailability: {
                                    startDateTime: todayString,
                                },
                                radius: 25,
                                size: 25,
                                serviceId: "99",
                                state: "MA",
                            }),
                        }
                    )
                        .then((response) => response.json())
                        .then((data) => {
                            resolve(data); // fetch won't reject 404 or 500
                        })
                        .catch((error) => {
                            resolve(error); // only happens on network failure
                        });
                }),
            latitude,
            longitude,
            todayString
        );
        if (postResponse && postResponse.locations) {
            postResponse.locations.forEach((location) => {
                availableLocations[location.partnerLocationId] = location;
            });
        }
    }
    return Object.values(availableLocations);
}
