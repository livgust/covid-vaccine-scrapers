const { site, paths } = require("./config");
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

    const frameForm = await page.$("#frameForm");
    const botUrl = await frameForm.evaluate((node) =>
        node.getAttribute("action")
    );
    await page.goto(botUrl, { waitUntil: "networkidle0" });

    await page.waitForXPath(paths.getStartedBtn);
    const getStartedBtns = await page.$x(paths.getStartedBtn);
    getStartedBtns[0].click();
    await page.waitForXPath(paths.massOption);
    const massLinks = await page.$x(paths.massOption);
    massLinks[1].click();
    await page.waitForTimeout(1000);
    const scheduleBtns = await page.$x(paths.scheduleBtn);
    scheduleBtns[1].click();

    // Wait for schedule chat bot response
    const lastMessageText = await new Promise((resolve) => {
        const interval = setInterval(async () => {
            // wait for count of chat bot responses to be at least 2
            const botMessages = await page.$x(paths.botMessage);
            const count = botMessages.length;
            const lastMessage = botMessages.pop();
            const messageText = await lastMessage.evaluate(
                (node) => node.innerText
            );
            if (count > 2) {
                clearInterval(interval);
                resolve(messageText);
            }
        }, 500);
    });

    let hasAvailability = false;
    let availability = {};

    const noAppointments = lastMessageText.includes(paths.noAppointments);
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
