const { site } = require("./config");
const moment = require("moment");
const s3 = require("../../lib/s3");
const { sendSlackMsg } = require("../../lib/slack");

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${site.name} done.`);
    return {
        ...site,
        ...webData,
        timestamp: moment().format(),
    };
};

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(site.signUpLink, { waitUntil: "networkidle0" });
    await page.waitForSelector("#frameForm");

    let hasAvailability = false;
    let availability = {};
    const frameForm = await page.$("#frameForm");
    const botUrl = await frameForm.evaluate((node) =>
        node.getAttribute("action")
    );
    await page.goto(botUrl, { waitUntil: "networkidle0" });
    await page.waitForXPath(site.getStartedBtn);
    const getStartedBtns = await page.$x(site.getStartedBtn);
    getStartedBtns[0].click();
    await page.waitForXPath(site.massLinkXPath);
    const massLinks = await page.$x(site.massLinkXPath);
    massLinks[1].click();
    // Wait for schedule bot response
    const poll = new Promise((resolve) => {
        const interval = setInterval(async () => {
            // wait for count of bot responses to be 3
            const botMessages = await page.$x(site.botMessageXPath);
            const count = botMessages.length;
            if (count > 2) {
                clearInterval(interval);
                resolve(count);
            }
        }, 500);
    });
    const botFrameContents = await page.content();
    const noAppointments = botFrameContents.match(site.noAppointments);
    if (!noAppointments) {
        const msg = `${site.name} - possible appointments`;
        console.log(msg);
        await s3.savePageContent(site.name, page);
        await sendSlackMsg("bot", msg);
    }

    return {
        hasAvailability,
        availability,
    };
}
