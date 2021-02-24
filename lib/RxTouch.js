const s3 = require("../lib/s3");

module.exports.noAppointmentMatchString = "no locations with available appointments";

module.exports.ScrapeRxTouch = async function ScrapeRxTouch(browser, site, siteName) {
    const page = await browser.newPage();
    await page.goto(site.website);
    await page.solveRecaptchas().then(({ solved }) => {
        if (solved.length) {
            return page.waitForNavigation();
        } else {
            return;
        }
    });

    const results = {};

    for (const loc of [...new Set(site.locations)]) {
        if (!results[loc.zip]) {
            // Delete this cookie to avoid rate limiting after checking zip code 10 times.
            await page.deleteCookie({ name: "ASP.NET_SessionId" });
            await page.evaluate(
                () => (document.getElementById("zip-input").value = "")
            );
            await page.type("#zip-input", loc.zip);
            console.log(`Getting site name ${siteName.toLowerCase()}`);
            const [searchResponse, ...rest] = await Promise.all([
                Promise.race([
                    page.waitForResponse(
                        `https://${siteName.toLowerCase()}sched.rxtouch.com/rbssched/program/covid19/Patient/CheckZipCode`
                    ),
                    page.waitForNavigation(),
                ]),
                page.click("#btnGo"),
            ]);
            try {
                const result = (await searchResponse.buffer()).toString();
                // If we get a response, that means we weren't navigated to another page.
                // Usually means either invalid zip code or no appointments were found.
                results[loc.zip] = result;
            } catch (e) {
                // If we get a Protocol error, that means we got navigated away from the page.
                // Usually means appointments were found or we got rate limited due to too many requests.
                if (e.toString().includes("Protocol error")) {
                    console.error(
                        "Got a protocol error. Debug using S3 screenshots saved or with headless chrome:", e
                    );
                    if (!process.env.DEVELOPMENT) {
                        await s3.savePageContent(
                            `${siteName}-${loc.zip}`,
                            page
                        );
                    }
                } else {
                    throw e;
                }
            }
        }
    }

    return results;
};