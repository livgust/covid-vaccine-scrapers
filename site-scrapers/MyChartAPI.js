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
    const tokenPromise = new Promise((resolve) => {
        https
            .get(requestVerificationUrl, (res) => {
                let body = "";
                // Collect the headers and cookies
                let responseHeaders = res.headers;
                cookie = responseHeaders["set-cookie"];
                res.on("data", (chunk) => {
                    body += chunk;
                });
                res.on("end", () => {
                    response = body;

                    resolve([body, cookie]);
                });
            })
            .on("error", (e) => {
                console.error(
                    "Error making mychart request for verification request " + e
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
    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let body = "";
            responseHeaders = res.headers;
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    msg = console.error(
                        `Error status code [${res.statusCode}] returned from schedule request: ${res.statusMessage}`
                    );
                    resolve();
                }
            });
        });
        req.write(postData);
        req.on("error", (e) => {
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
            //force midnight local time zone to avoid UTC dateline issues
            const date = new Date(`${dayEntry.DateISO}T00:00`);
            const slots = dayEntry.Slots;
            const slotsAvailable = slots.length || 0;
            let midnightToday = new Date();
            midnightToday.setHours(0, 0, 0, 0);
            if (date >= midnightToday) {
                results.availability[
                    `${
                        date.getMonth() + 1
                    }/${date.getDate()}/${date.getFullYear()}`
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
};

/**
 * Adds the weekCount number of weeks to the results object
 */
module.exports.AddFutureWeeks = async function AddFutureWeeks(
    scheduleHost,
    schedulePath,
    cookie,
    verificationToken,
    weekCount,
    postDataCallback
) {
    const results = { availability: {}, hasAvailability: false };
    // Setup the post data to answer the survey questions
    let startDate = new Date();
    startDate.setDate(startDate.getDate());
    // The data can only be returned for one week. Check the calendar for 10 future weeks.
    for (const i of Array(weekCount).keys()) {
        // Format the date as 'YYYY-MM-dd'
        let startDateFormatted = `${startDate.getFullYear()}-${(
            "0" +
            (startDate.getMonth() + 1)
        ).slice(-2)}-${("0" + startDate.getDate()).slice(-2)}`;

        // Generate the postdata with the formatted startDate.
        let postData = postDataCallback(startDateFormatted);

        // Get the schedule
        let postResponse = await this.GetSchedule(
            cookie,
            verificationToken,
            scheduleHost,
            schedulePath,
            postData
        );
        if (postResponse) {
            //Add the details from the postResponse to the results.
            this.UpdateResults(results, postResponse);
        } else {
            console.error("Null response returned from scheduling request");
        }
        // Increment the date another week.
        startDate.setDate(startDate.getDate() + 7);
    }
    return results;
};
