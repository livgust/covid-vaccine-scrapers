const { site } = require("./config");
const { sendSlackMsg } = require("../../lib/slack");
const s3 = require("../../lib/s3");
const moment = require("moment");

const noAppointmentMatchString =
    "No services or classes are available for booking at this time.";

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const data = await ScrapeWebsiteData(browser);
    console.log(`${site.name} done.`);
    const { website, ...restSite } = site;
    return {
        parentLocationName: "Arlington Family Practice Group",
        timestamp: moment().format(),
        individualLocationData: [
            {
                ...restSite,
                signUpLink: site.website,
                ...data,
            },
        ],
    };
};

async function waitForLoadComplete(page, loaderSelector) {
    await page.waitForSelector(loaderSelector, { visible: true });
    await page.waitForSelector(loaderSelector, { hidden: true });
}

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(site.website);
    await page.waitForSelector("#nextBtn", { visible: true });
    await page.click("#nextBtn");
    await waitForLoadComplete(page, ".schedulerPanelLoading");
    await page.click("#nextBtn");
    const content = await (await page.$(".schedulerPanelBody")).evaluate(
        (node) => node.innerText
    );
    const hasAvailability = content.indexOf(noAppointmentMatchString) == -1;
    if (hasAvailability && !process.env.DEVELOPMENT) {
        await s3.savePageContent(site.name, page);
        await sendSlackMsg(
            "bot",
            "Arlington Family Practice Group may have appointments."
        );
    }
    return { hasAvailability };
}
