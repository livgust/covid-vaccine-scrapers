const sites = require("../data/sites.json");
const https = require("https");
const html_parser = require('node-html-parser')
// import { parse } from 'node-html-parser';

module.exports = async function GetAvailableAppointments() {
    console.log("Atrius starting.");
    const webData = await ScrapeWebsiteData();
    console.log("Atrius done.");
    return {
        ...sites.Atrius,
        ...webData,
    };
};

async function ScrapeWebsiteData() {

    // const page = await browser.newPage();
    // await page.goto(sites.Atrius.website);

    // We need to go through the flow and use a request verification token
    let cookie = ""
    const initialPromise = new Promise((resolve) => {
        let response = "";
        https.get(sites.Atrius.website, (res) => {
            let body = "";
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                response = body;

                resolve(response);
            });
            responseHeaders = res.headers
            cookie = responseHeaders['set-cookie'];
        });
    });
    const initialResponse = await initialPromise;
    console.log('cookie: ' + cookie);

    
    const dphPromise = new Promise((resolve) => {
        https.get(sites.Atrius.dphLink, (res) => {
            let body = "";
            responseHeaders = res.headers
            // update the cookie again
            cookie = responseHeaders['set-cookie'];
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                response = body;

                resolve(response);
            });
        });
    });
    const dphResponse = await dphPromise;
    const root = html_parser.parse(dphResponse)
    verificationInput = root.querySelector('input[name=__RequestVerificationToken]')
    verificationToken = verificationInput.getAttribute('value');

    // Setup the post data to answer the survey questions
    const postData = 'view=grouped&specList=121&vtList=1424&start=&filters=%7B%22Providers%22%3A%7B%7D%2C%22Departments%22%3A%7B%7D%2C%22DaysOfWeek%22%3A%7B%7D%2C%22TimesOfDay%22%3A%22both%22%7D'
    const options = {
        hostname: 'myhealth.atriushealth.org',
        port: 443,
        path: '/OpenScheduling/OpenScheduling/GetScheduleDays',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Content-Length': postData.length,
          '__RequestVerificationToken': verificationToken,
          'Cookie': cookie
        }
      }

    // now request the schedule
    const schedulePromise = new Promise((resolve) => {
        let response = "";
        const req = https.request(options, (res) => {
            let body = "";
            responseHeaders = res.headers
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                response = JSON.parse(body);
                resolve(response);
            });
        });
        req.write(postData);
        req.end();
    });

    const postResponse = await schedulePromise;
    allDays = postResponse.AllDays


    const results = { availability: {}, hasAvailability: false };
    // The AllDays property is an object, not an array.
    // The property of the object is generated from the date, which we don't know
    // We need to iterate over all the properties to determine the dates and the slots.
    for (const dayEntryProperty in allDays) {
        if (Object.prototype.hasOwnProperty.call(allDays, dayEntryProperty)) {
            dayEntry = allDays[dayEntryProperty]
            const date = new Date(dayEntry.DateISO);
            let slots = dayEntry.Slots;
            let slotsAvailable = slots?slots.length:0

            if (date >= new Date()) {
                results.availability[
                    `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
                ] = {
                    numberAvailableAppointments: slotsAvailable,
                    hasAvailability: !!slotsAvailable,
                };
                if (slotsAvailable) {
                    results.hasAvailability = true;
                }
            }
        }
    }
    return results;
}
