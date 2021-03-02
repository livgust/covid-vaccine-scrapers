const https = require("https");
const html_parser = require("node-html-parser");

/**
 * Gets the verification token and an updated cookie to use for future requests.
 * @param {string} requestVerificationUrl - The URL that returns the verifcation token
 */
async function GetCookieAndVerificationToken(requestVerificationUrl) {
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
    const verificationInput = root.querySelector(
        "input[name=__RequestVerificationToken]"
    );
    const verificationToken = verificationInput.getAttribute("value");
    return [cookie, verificationToken];
}

/**
 * Gets a schedule making a request to the schedule endpoint. For many mychart sites, this returns a schedule only for a single week.
 *
 */
async function GetSchedule(
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
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    console.error(
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
}

/**
 * Add relevant site info to the results object
 * @param {object} results
 * @param {object} defaultResults
 * @param {string} siteKey
 * @param {object} siteInfo
 */
function AddSiteInfo(results, defaultResults, siteKey, siteInfo) {
    // set default availability values
    results[siteKey] = JSON.parse(JSON.stringify(defaultResults));
    if (Object.keys(siteInfo) == 0) return;

    // fill in site info from API response
    var { Name, Address } = siteInfo;
    results[siteKey].name = Name;
    results[siteKey].street = Address.Street.join(" ");
    results[siteKey].city = Address.City;
    results[siteKey].zip = Address.PostalCode;
}

/**
 * Updates the results object from the data in the postResponse
 * @param {object} results - The results object to be updated.
 * @param {object} postResponse - The response from schedule post
 */
function UpdateResults(results, postResponse) {
    const defaultResults = { availability: {}, hasAvailability: false };
    const allLocations = postResponse.AllDepartments;

    if (!allLocations) {
        console.warn(
            `No data found in postResponse, error code: ${postResponse.ErrorCode}`
        );
        return results;
    }

    for (const [key, info] of Object.entries(allLocations)) {
        if (!results[key]) {
            AddSiteInfo(results, defaultResults, key, info);
        }
    }

    // The AllDays property is an object, not an array.
    // The keys in the object are generated from the date, but we don't care about the
    // keys themselves, so just iterate over the values.
    const allDays = Object.values(postResponse.AllDays);

    for (const dayEntry of allDays) {
        const key = dayEntry.DepartmentID;
        if (!results[key]) {
            AddSiteInfo(results, defaultResults, key, {});
        }

        //force midnight local time zone to avoid UTC dateline issues
        const date = new Date(`${dayEntry.DateISO}T00:00`);
        const slots = dayEntry.Slots;
        const slotsAvailable = slots.length || 0;
        let midnightToday = new Date();
        midnightToday.setHours(0, 0, 0, 0);
        if (date >= midnightToday) {
            results[key].availability[
                `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
            ] = {
                numberAvailableAppointments: slotsAvailable,
                hasAvailability: !!slotsAvailable,
            };
            if (slotsAvailable) {
                results[key].hasAvailability = true;
            }
        }
    }
    return results;
}

/**
 * Adds the weekCount number of weeks to the results object
 */
async function AddFutureWeeks(
    scheduleHost,
    schedulePath,
    cookie,
    verificationToken,
    weekCount,
    postDataCallback
) {
    var results = {};
    // Setup the post data to answer the survey questions
    let startDate = new Date();
    startDate.setDate(startDate.getDate());
    // The data can only be returned for one week. Check the calendar for 10 future weeks.
    for (var i = 0; i < weekCount; i++) {
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
}

module.exports = {
    GetCookieAndVerificationToken,
    GetSchedule,
    UpdateResults,
    AddFutureWeeks,
    AddSiteInfo,
};
