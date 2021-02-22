const sites = require("./../data/sites.json");
const usZips = require("us-zips");
const fs = require("fs");
const moment = require("moment");

module.exports = async function GetAvailableAppointments(browser) {
    console.log("Walgreens starting.");
    const webData = await ScrapeWebsiteData(browser);
    console.log("Walgreens done.");
    const results = webData.map((entry) => {
        const availability = {};
        entry.appointmentAvailability.forEach((slot) => {
            const date = moment(slot.date);
            availability[date.format("M/D/YYYY")] = {
                hasAvailability: !!slot.slots.length,
                numberAvailableAppointments: slot.slots.length,
            };
        });
        return {
            name: entry.name,
            street: (entry.address.line1 + " " + entry.address.line2).trim(),
            city: entry.address.city,
            zip: entry.address.zip,
            signUpLink: sites.Walgreens.website,
            hasAvailability: true,
            extraData: {
                "Vaccine Type": entry.manufacturerName,
            },
            availability: availability,
        };
    });
    return results;
};

async function waitAndClick(page, selector) {
    await page.waitForSelector(selector);
    await page.click(selector);
    return;
}

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(sites.Walgreens.website);
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

    const uniqueZips = [
        ...new Set(sites.Walgreens.locations.map((site) => site.zip)),
    ];

    // SEARCH PAGE
    for (const zip of uniqueZips) {
        const { latitude, longitude } = usZips[zip];
        const todayString = new moment().local().format("YYYY-MM-DD");
        console.log(
            `for zip ${zip}, lat: ${latitude} and long: ${longitude}. Today is ${todayString}`
        );

        let postResponse = await page.evaluate(
            (latitude, longitude, todayString) =>
                new Promise((resolve) => {
                    jQuery
                        .ajax({
                            url:
                                "https://www.walgreens.com/hcschedulersvc/svc/v2/immunizationLocations/timeslots",
                            type: "POST",
                            dataType: "json",
                            data: JSON.stringify({
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
                            contentType: "application/json",
                        })
                        .then(
                            (res) => resolve(res),
                            (err) => {
                                console.dir(err, { depth: null });
                                debugger;
                                resolve(err);
                            }
                        );
                }),
            latitude,
            longitude,
            todayString
        );
        console.log(postResponse);
        if (postResponse.locations) {
            postResponse.locations.forEach((location) => {
                availableLocations[location.locationId] = location;
            });
        }
    }
    return Object.values(availableLocations);
}
