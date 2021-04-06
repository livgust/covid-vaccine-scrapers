const { site } = require("./config");
const moment = require("moment");
const s3 = require("../../lib/s3");
const { sendSlackMsg } = require("../../lib/slack");
const html_parser = require("node-html-parser");
const { JSDOM } = require("jsdom");

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${site.name} starting.`);
    const webData = await ScrapeWebsiteData(browser);
    console.log(`${site.name} done.`);
    const { noAppointments, timeslotsUrl, ...restSite } = site;
    return {
        parentLocationName: "Mercy Medical Center",
        timestamp: new Date(),
        individualLocationData: [
            {
                ...restSite,
                ...webData,
            },
        ],
    };
};

async function jQueryPost(page, url, data) {
    return await page.evaluate(
        async (url, data) => {
            return await new Promise((resolve) => {
                $.post(url, data, function (data) {
                    resolve(data);
                });
            });
        },
        url,
        data
    );
}

async function getTimeSlotsForDate(page, ScheduleDay) {
    const url = site.timeslotsUrl;
    const data = {
        ScheduleDay,
    };
    return await jQueryPost(page, url, data);
}

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(site.signUpLink, { waitUntil: "networkidle0" });
    await page.waitForSelector("form");
    await page.evaluate(() => {
        document.querySelector("button[name='SiteName']").click();
    });
    // Wait for form to post
    await page.waitForSelector("button[onclick*='ScheduleDay']");
    const daysToCheck = 11; // we could check more but it looks like they only allow 11 days right now.

    let hasAvailability = false;
    let availability = {};

    for (let i = 0; i < daysToCheck; i++) {
        const date = moment().local().add(i, "days").format("MM/DD/YYYY");
        const xhrRes = await getTimeSlotsForDate(page, date);
        // xhrRes is html in this case so we can just string match regex
        // but we also match any html so we know we get a good response
        const someHTMLRegex = /div/;
        const someHTML = xhrRes.match(someHTMLRegex);
        const noAppointments = xhrRes.match(site.noAppointments);
        if (someHTML && !noAppointments) {
            const dom = new JSDOM(xhrRes);
            const reserveButtons = dom.window.document.querySelectorAll(
                "button[onclick*='ReserveAppt']"
            );

            const numAvailableAppts = await reserveButtons.length;

            if (numAvailableAppts) {
                hasAvailability = true;
            } else {
                console.log(`There could be appointments: ${xhrRes}`);
                const msg = `${site.name} - possible appointments on ${date}`;
                await sendSlackMsg("bot", msg);
            }

            if (!availability[date]) {
                availability[date] = {
                    hasAvailability: true,
                    numberAvailableAppointments: 0,
                };
                availability[
                    date
                ].numberAvailableAppointments += numAvailableAppts;
            }
        }
    }

    return {
        hasAvailability,
        availability,
    };
}
