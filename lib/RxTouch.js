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
                //if there's something available, log it with a unique name so we can check it out l8r g8r
                if (result.indexOf(this.noAppointmentMatchString) == -1) {
                    // theoretically found appointments
                    if (!process.env.DEVELOPMENT) {
                        await s3.savePageContent(
                            `${siteName}-${loc.zip}`,
                            page
                        );
                    }
                }
                results[loc.zip] = result;
            } catch (e) {
                if (e.toString().includes("Protocol error")) {
                    console.log(
                        "Got a protocol error. Run chromium with headless=false to debug."
                    );
                }
                throw e;
            }
        }
    }

    return results;
};