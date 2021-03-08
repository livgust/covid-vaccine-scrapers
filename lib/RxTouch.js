const s3 = require("../lib/s3");
const moment = require("moment");

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

async function GetAllAvailability(availabilityService, zip) {
    const currYear = moment().format("YYYY");
    const currMonth = parseInt(moment().format("M"));
    const monthNumsToCheck = [
        // we'll need to fix this in Dec 2021... hopefully we don't need this project then
        currMonth,
        currMonth + 1,
    ];
    const monthlyAvailability = await Promise.all(
        monthNumsToCheck.map(async (monthNum) => {
            const response = await availabilityService.getAvailabilityForMonth(
                currYear,
                monthNum
            );
            return {
                monthNum,
                availability: response?.Success
                    ? response?.Data?.Days?.filter((day) => day.Available)
                    : null,
            };
        })
    );
    const dailyAvailability = await Promise.all(
        monthlyAvailability.map(async (entry) => {
            return await Promise.all(
                entry.availability.map(async (day) => {
                    const response = await availabilityService.getAvailabilityForDay(
                        currYear,
                        entry.monthNum,
                        day.DayNumber
                    );
                    return {
                        date: `${entry.monthNum}/${day.DayNumber}/${currYear}`,
                        numAppointments: response?.Success
                            ? response?.Data?.Rows?.length || 0
                            : 0,
                    };
                })
            );
        })
    );
    const filteredDailyAvailability = dailyAvailability
        .flat()
        .reduce((acc, entry) => {
            // Sometimes the PatientCalendar API returns results when PatientCalendarDay API has no availability for that day, so we filter out these cases
            if (entry.numAppointments === 0) {
                return { ...acc };
            }
            return {
                ...acc,
                [entry.date]: {
                    hasAvailability: true,
                    numberAvailableAppointments: entry.numAppointments,
                    signUpLink: null,
                },
            };
        }, {});
    return {
        message:
            Object.keys(filteredDailyAvailability).length !== 0
                ? `Availability found. Search on signup website for zip ${zip}`
                : `No available appointments (code 2).`,
        availability: filteredDailyAvailability,
    };
}

function getAvailabilityService(page, siteName, facilityId) {
    return {
        async getAvailabilityForMonth(year, month) {
            return await jQueryPost(
                page,
                `https://${siteName.toLowerCase()}sched.rxtouch.com/rbssched/program/covid19/Calendar/PatientCalendar`,
                `facilityId=${facilityId}&month=${month}&year=${year}&snapCalendarToFirstAvailMonth=false`
            );
        },
        async getAvailabilityForDay(year, month, day) {
            return await jQueryPost(
                page,
                `https://${siteName.toLowerCase()}sched.rxtouch.com/rbssched/program/covid19/Calendar/PatientCalendarDay`,
                `facilityId=${facilityId}&month=${month}&day=${day}&year=${year}&appointmentTypeId=5954`
            );
        },
    };
}

async function ScrapeRxTouch(browser, site, siteName) {
    const page = await browser.newPage();
    await page.goto(site.website);
    await page.solveRecaptchas().then(({ solved }) => {
        if (solved.length) {
            return page.waitForNavigation();
        } else {
            return;
        }
    });

    const results = {};

    for (const loc of [...new Set(site.locations)]) {
        if (!results[loc.zip]) {
            // Delete this cookie to avoid rate limiting after checking zip code 10 times.
            await page.deleteCookie({ name: "ASP.NET_SessionId" });

            // Go to /Patient/Advisory to get cookie
            const patientAdvisoryUrl = `https://${siteName.toLowerCase()}sched.rxtouch.com/rbssched/program/covid19/Patient/Advisory`;
            await page.goto(patientAdvisoryUrl);

            // Go to /Patient/Schedule to check for availability
            const scheduleUrl = `https://${siteName.toLowerCase()}sched.rxtouch.com/rbssched/program/covid19/Patient/Schedule?zip=${
                loc.zip
            }&appointmentType=5954`;
            await page.goto(scheduleUrl);

            if ((await page.url()) !== scheduleUrl) {
                // We got navigated away, due to invalid zip code or "queue-it" system
                if ((await page.url()) === patientAdvisoryUrl) {
                    results[loc.zip] = {
                        message: `Invalid zip code: ${loc.zip}`,
                        availability: {},
                    };
                } else {
                    results[loc.zip] = {
                        // Got redirected from queue-it system.
                        message: `Can't determine availability.`,
                        availability: {},
                    };
                }
                continue;
            }
            // Finding a facilityId means there's a nearby facility with availability
            const facilityId = await page.evaluate(() =>
                $("#facility option:selected").val()
            );
            if (!facilityId) {
                results[loc.zip] = {
                    message: "No available appointments.",
                    availability: {},
                };
                continue;
            }
            if (!process.env.DEVELOPMENT) {
                await s3.savePageContent(`${siteName}-${loc.zip}`, page);
            }
            const availabilityService = getAvailabilityService(
                page,
                siteName,
                facilityId
            );
            results[loc.zip] = await GetAllAvailability(
                availabilityService,
                loc.zip
            );
        }
    }
    return results;
}

module.exports = {
    ScrapeRxTouch,
    GetAllAvailability,
};
