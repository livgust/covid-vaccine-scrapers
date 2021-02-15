const sites = require('../data/sites.json');
const https = require('https');
const html_parser = require('node-html-parser');

module.exports = async function GetAvailableAppointments() {
    console.log('Atrius starting.');
    const webData = await ScrapeWebsiteData();
    console.log('Atrius done.');
    return {
        ...sites.Atrius,
        ...webData,
    };
};

async function ScrapeWebsiteData() {
    // We need to go through the flow and use a request verification token
    let cookie = '';
    const initialPromise = new Promise(resolve => {
        let response = '';
        https
            .get(sites.Atrius.website, res => {
                let body = '';
                res.on('data', chunk => {
                    body += chunk;
                });
                res.on('end', () => {
                    response = body;

                    resolve(response);
                });
                responseHeaders = res.headers;
                cookie = responseHeaders['set-cookie'];
            })
            .on('error', e => {
                console.error(
                    'Error making ' + sites.Atrius.website + ' request: ' + e
                );
            });
    });
    const initialResponse = await initialPromise;

    const dphPromise = new Promise(resolve => {
        https
            .get(sites.Atrius.dphLink, res => {
                let body = '';
                responseHeaders = res.headers;
                // update the cookie again
                cookie = responseHeaders['set-cookie'];
                res.on('data', chunk => {
                    body += chunk;
                });
                res.on('end', () => {
                    response = body;

                    resolve(response);
                });
            })
            .on('error', e => {
                console.error(
                    'Error Making request to  [' + req.url + '] : ' + e
                );
            })
            .end();
    });
    const dphResponse = await dphPromise;
    const root = html_parser.parse(dphResponse);
    verificationInput = root.querySelector(
        'input[name=__RequestVerificationToken]'
    );
    verificationToken = verificationInput.getAttribute('value');

    // Setup the post data to answer the survey questions
    const postData =
        'view=grouped&specList=121&vtList=1424&start=&filters=%7B%22Providers%22%3A%7B%7D%2C%22Departments%22%3A%7B%7D%2C%22DaysOfWeek%22%3A%7B%7D%2C%22TimesOfDay%22%3A%22both%22%7D';
    const options = {
        hostname: 'myhealth.atriushealth.org',
        port: 443,
        path: '/OpenScheduling/OpenScheduling/GetScheduleDays',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
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
                    console.error('Error status code returned from ' + res.url);
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
    const results = { availability: {}, hasAvailability: false };
    if (postResponse) {
        allDays = postResponse.AllDays;

        // The AllDays property is an object, not an array.
        // The property of the object is generated from the date, which we don't know
        // We need to iterate over all the properties to determine the dates and the slots.
        for (const dayEntryProperty in allDays) {
            if (
                Object.prototype.hasOwnProperty.call(allDays, dayEntryProperty)
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
    return results;
}
