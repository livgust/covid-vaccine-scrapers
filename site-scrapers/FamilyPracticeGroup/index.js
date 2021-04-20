const { site } = require("./config");
const { sendSlackMsg } = require("../../lib/slack");
const s3 = require("../../lib/s3");
const moment = require("moment");

const noAppointmentMatchString =
    "All appointment times are currently reserved.";

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
    return { hasAvailability: false };
    // const page = await browser.newPage();
    // await page.goto(site.website);
    // await page.waitForSelector("#nextBtn", { visible: true });
    // await page.click("#nextBtn");
    // await page.waitForSelector("#serviceTitle", { visible: true });
    // await page.waitForSelector("#nextBtn", { visible: true });
    // await page.waitForTimeout(300);
    // await page.click("#nextBtn");
    // await page.waitForSelector("#screeningQuestionPassBtn", { visible: true });
    // await page.click("#screeningQuestionPassBtn");
    // await waitForLoadComplete(page, ".schedulerPanelLoading");

    // const content = await (await page.$(".schedulerPanelBody")).evaluate(
    //     (node) => node.innerText
    // );
    // const hasAvailability = content.indexOf(noAppointmentMatchString) === -1;
    // return { hasAvailability };
}
