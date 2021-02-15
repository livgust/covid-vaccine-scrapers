const https = require("https");
const html_parser = require("node-html-parser");

/**
 * Gets the verification token and an updated cookie to use for future requests.
 * @param { The URL that returns the verifcation token} requestVerificationUrl
 */
module.exports.GetCookieAndVerificationToken = async function GetCookieAndVerificationToken(
    requestVerificationUrl
) {
    let cookie = "";
    const tokenPromise = new Promise(resolve => {
        let response = "";
        https
            .get(requestVerificationUrl, res => {
                let body = "";
                // Collect the headers and cookies
                let responseHeaders = res.headers;
                cookie = responseHeaders["set-cookie"];
                res.on("data", chunk => {
                    body += chunk;
                });
                res.on("end", () => {
                    response = body;

                    resolve([body, cookie]);
                });
            })
            .on("error", e => {
                console.error(
                    "Error making mychart request for LynnTech: " + e
                );
            })
            .end();
    });
    const tokenResponse = await tokenPromise;

    // Get the request verification token from the response document
    const root = html_parser.parse(tokenResponse);
    verificationInput = root.querySelector(
        "input[name=__RequestVerificationToken]"
    );
    verificationToken = verificationInput.getAttribute("value");
    return [cookie, verificationToken];
};

/**
 * Gets a schedule making a request to the schedule endpoint. For many mychart sites, this returns a schedule only for a single week.
 *
 */
module.exports.GetSchedule = async function GetSchedule(
    cookie,
    verificationToken,
    scheduleHost,
    schedulePath,
    postData
) {
    const options = {
        hostname: scheduleHost,
        port: 443,
        path: schedulePath,
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Content-Length": postData.length,
            __RequestVerificationToken: verificationToken,
            Cookie: cookie,
        },
    };

    // now request the schedule
    return new Promise(resolve => {
        const req = https.request(options, res => {
            let body = "";
            responseHeaders = res.headers;
            res.on("data", chunk => {
                body += chunk;
            });
            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    console.error("Error status code returned from " + res.url);
                    resolve();
                }
            });
        });
        req.write(postData);
        req.on("error", e => {
            console.error("Error making scheduling request : " + e);
        });
        req.end();
    });
};

/**
 * Updates the results object from the data in the postResponse
 * @param {The results object to be updated.} results
 * @param {The response from schedule post} postResponse
 */
module.exports.UpdateResults = function UpdateResults(results, postResponse) {
    allDays = postResponse.AllDays;

    // The AllDays property is an object, not an array.
    // The property of the object is generated from the date, which we don't know
    // We need to iterate over all the properties to determine the dates and the slots.
    for (const dayEntryProperty in allDays) {
        if (Object.prototype.hasOwnProperty.call(allDays, dayEntryProperty)) {
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
};
