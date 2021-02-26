const s3 = require("../lib/s3");

function ScheduleUrl(siteName, zip) {
    return `https://${siteName.toLowerCase()}sched.rxtouch.com/rbssched/program/covid19/Patient/Schedule?zip=${zip}&appointmentType=5954`;
}

function CalendarUrl(siteName) {
    return `https://${siteName.toLowerCase()}sched.rxtouch.com/rbssched/program/covid19/Calendar/PatientCalendar`;
}

function CalendarDayUrl(siteName) {
    return `https://${siteName.toLowerCase()}sched.rxtouch.com/rbssched/program/covid19/Calendar/PatientCalendarDay`;
}

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
            // Clear cookies, so we don't get rate limited later on
            await page.deleteCookie({ name: "ASP.NET_SessionId" });

            // Go to /Patient/Advisory to get cookie
            await page.goto(
                `https://${siteName.toLowerCase()}sched.rxtouch.com/rbssched/program/covid19/Patient/Advisory`
            );

            // Go to /Patient/Schedule to check for availability
            const scheduleUrl = this.ScheduleUrl(siteName, loc.zip);
            await page.goto(scheduleUrl);
            if ((await page.url()) != scheduleUrl) {
                // We got navigated away, likely due to an invalid zip.
                results[loc.zip] = {
                    message: `Invalid zip code: ${loc.zip}`,
                    availability: null,
                };
                continue;
            }
            // Finding a facilityId means there's a nearby facility with availability
            const facilityId = await page.evaluate(() =>
                $("#facility option:selected").val()
            );
            if (!facilityId) {
                results[loc.zip] = {
                    message: "No available appointments.",
                    availability: null,
                };
                continue;
            }
            if (!process.env.DEVELOPMENT) {
                await s3.savePageContent(`${siteName}-${loc.zip}`, page);
            }

            const today = new Date();
            const currYear = today.getFullYear();
            const monthNumsToCheck = [
                // we'll need to fix this in Dec 2021... hopefully we don't need this project then
                today.getMonth() + 1,
                today.getMonth() + 2,
            ];

            const monthAvailabilty = await Promise.all(
                monthNumsToCheck.map(async (monthNum) => {
                    const response = await jQueryPost(
                        page,
                        this.CalendarUrl(siteName),
                        `facilityId=${facilityId}&month=${monthNum}&year=${currYear}&snapCalendarToFirstAvailMonth=false`
                    );
                    return {
                        monthNum,
                        availability: response?.Success
                            ? response?.Data?.Days?.filter(
                                  (day) => day.Available
                              )
                            : null,
                    };
                })
            );
            const dailyAvailability = await Promise.all(
                monthAvailabilty.map(async (entry) => {
                    return await Promise.all(
                        entry.availability.map(async (day) => {
                            const response = await jQueryPost(
                                page,
                                this.CalendarDayUrl(siteName),
                                `facilityId=${facilityId}&month=${entry.monthNum}&day=${day.DayNumber}&year=${currYear}&appointmentTypeId=5954`
                            );
                            return {
                                date: `${entry.monthNum}/${day.DayNumber}/${currYear}`,
                                numAppointments: response?.Success
                                    ? response?.Data?.Rows?.length
                                    : 0,
                            };
                        })
                    );
                })
            );

            results[loc.zip] = {
                message: null,
                availability: dailyAvailability.flat().reduce((acc, entry) => {
                    return {
                        ...acc,
                        [entry.date]: {
                            hasAvailability: true,
                            numberAvailableAppointments: entry.numAppointments,
                            signUpLink: null,
                        },
                    };
                }, {}),
            };
        }
    }
    return results;
}

module.exports = {
    ScheduleUrl,
    CalendarUrl,
    CalendarDayUrl,
    ScrapeRxTouch,
};
