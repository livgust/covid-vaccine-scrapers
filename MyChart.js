const sites = require('../data/sites.json');
const https = require('https');
const html_parser = require('node-html-parser');

module.exports = async function GetAvailableAppointments() {
    console.log('LynnTech starting.');
    const webData = await ScrapeWebsiteData();
    console.log('LynnTech done.');
    return {
        ...sites.LynnTech,
        ...webData,
    };
};

let siteId = '13300632';
let vt = '1089';
let dept = '133001025';

async function ScrapeWebsiteData() {
    // We need to go through the flow and use a request verification token
    let cookie = '';
    const tokenPromise = new Promise(resolve => {
        let response = '';
        https
            .get(
                `https://mychartos.ochin.org/mychart/SignupAndSchedule/EmbeddedSchedule?id=${siteId}&vt=${vt}&dept=${dept}&view=plain&public=1&payor=-1,-2,-3,4655,4660,1292,4661,5369,5257,1624,4883&lang=english1089`,
                res => {
                    let body = '';
                    // Collect the heeaders and cookies
                    let responseHeaders = res.headers;
                    cookie = responseHeaders['set-cookie'];
                    res.on('data', chunk => {
                        body += chunk;
                    });
                    res.on('end', () => {
                        response = body;

                        resolve(response);
                    });
                }
            )
            .on('error', e => {
                console.error(
                    'Error making mychart request for LynnTech: ' + e
                );
            })
            .end();
    });
    const tokenResponse = await tokenPromise;

    // Get the request verification token from the
    const root = html_parser.parse(tokenResponse);
    verificationInput = root.querySelector(
        'input[name=__RequestVerificationToken]'
    );
    verificationToken = verificationInput.getAttribute('value');

    // Setup the return object.
    const results = { availability: {}, hasAvailability: false };

    // Setup the post data to answer the survey questions
    let startDate = new Date();
    startDate.setDate(startDate.getDate());
    // The data can only be returned for one week. Check the calendar for future weeks.
    for (const i of Array(10).keys()) {
        // Format the date as 'YYYY-MM-dd'
        let startDateFormatted = `${startDate.getFullYear()}-${(
            '0' +
            (startDate.getMonth() + 1)
        ).slice(-2)}-${('0' + startDate.getDate()).slice(-2)}`;

        const postData = `id=${siteId}&vt=${vt}&dept=${dept}&view=plain&start=${startDateFormatted}&filters=%7B%22Providers%22%3A%7B%2213300632%22%3Atrue%7D%2C%22Departments%22%3A%7B%22133001025%22%3Atrue%7D%2C%22DaysOfWeek%22%3A%7B%220%22%3Atrue%2C%221%22%3Atrue%2C%222%22%3Atrue%2C%223%22%3Atrue%2C%224%22%3Atrue%2C%225%22%3Atrue%2C%226%22%3Atrue%7D%2C%22TimesOfDay%22%3A%22both%22%7D`;
        const options = {
            hostname: 'mychartos.ochin.org',
            port: 443,
            path:
                '/mychart/OpenScheduling/OpenScheduling/GetOpeningsForProvider',
            method: 'POST',
            headers: {
                'Content-Type':
                    'application/x-www-form-urlencoded; charset=UTF-8',
                'Content-Length': postData.length,
                __RequestVerificationToken: verificationToken,
                Cookie: cookie,
            },
        };

        // now request the schedule
        const schedulePromise = new Promise(resolve => {
            const req = https.request(options, res => {
                let body = '';
                responseHeaders = res.headers;
                res.on('data', chunk => {
                    body += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(body));
                    } else {
                        console.error(
                            'Error status code returned from ' + res.url
                        );
                        resolve();
                    }
                });
            });
            req.write(postData);
            req.on('error', e => {
                console.error('Error making scheduling request : ' + e);
            });
            req.end();
        });

        const postResponse = await schedulePromise;
        if (postResponse) {
            allDays = postResponse.AllDays;

            // The AllDays property is an object, not an array.
            // The property of the object is generated from the date, which we don't know
            // We need to iterate over all the properties to determine the dates and the slots.
            for (const dayEntryProperty in allDays) {
                if (
                    Object.prototype.hasOwnProperty.call(
                        allDays,
                        dayEntryProperty
                    )
                ) {
                    dayEntry = allDays[dayEntryProperty];
                    const date = new Date(dayEntry.DateISO);
                    const slots = dayEntry.Slots;
                    const slotsAvailable = slots.length || 0;

                    if (date >= new Date()) {
                        results.availability[
                            `${date.getMonth() + 1}/${date.getDate() +
                                1}/${date.getFullYear()}`
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
        } else {
            console.error('Null response returned from scheduling request');
        }
        // Increment the date another week.
        startDate.setDate(startDate.getDate() + 7);
    }
    return results;
}
