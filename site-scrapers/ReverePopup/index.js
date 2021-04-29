// Unsure how often this clinic will pop up but seems to be weekly for now
const { site } = require("./config");
const moment = require("moment");

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const info = await ScrapeWebsiteData(browser);
    console.log(`${site.name} done.`);
    return {
        parentLocationName: "Revere Popup Clinic",
        timestamp: moment().format(),
        individualLocationData: [
            {
                ...site,
                ...info,
            },
        ],
    };
};

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    const results = {
        hasAvailability: false,
        availability: {},
    };
    await page.goto(site.signUpLink);
    // Only 1 h1 on page, will have text like "Sign Up for Vaccinations - Rumney Marsh Academy on 04/30/2021"
    try {
        await page.waitForSelector("h1", { visible: true });
        const date = await page.$eval(
            "h1",
            (h1) => h1.innerText.match(/[0-9]+\/[0-9]+\/[0-9]+/)[0]
        );

        // the first tr on the page is unrelated which is why you have to be specific
        const appointments = await page.$$eval("tr[data-parent]", (trs) =>
            trs.reduce((acc, tr) => {
                // text will look like "06:09 pm\n\n20 appointments available"
                const text = tr.innerText;
                const numberAvailableAppointments = text.match(
                    /([0-9]+) appointments available/
                );
                if (numberAvailableAppointments) {
                    return Number(numberAvailableAppointments[1]) + acc;
                }
                return acc;
            }, 0)
        );

        if (appointments) {
            results["hasAvailability"] = true;
            results["availability"][date] = {
                numberAvailableAppointments: appointments,
                hasAvailability: true,
            };
            return results;
        } else {
            return results;
        }
    } catch (error) {
        console.log("Error in Revere PopUp clinic:", error);
        return results;
    }
}
