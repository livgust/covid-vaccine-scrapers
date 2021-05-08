const { siteUrl, sites, entityName } = require("./config");
const { parseJson } = require("./dataFormatter.js");
const moment = require("moment");

module.exports = async function GetAvailableAppointments(browser) {
    console.log(`${entityName} starting.`);
    const siteData = await ScrapeWebsiteData(browser, sites);
    console.log(`${entityName} done.`);
    return {
        parentLocationName: entityName,
        timestamp: moment().format(),
        individualLocationData: siteData,
    };
};

/**
 *
 * @param {*} browser
 * @param {*} pageService
 * @param {*} sites
 * @returns array of site details and availability
 */
async function ScrapeWebsiteData(browser, sites) {
    const page = await browser.newPage();

    const submitButtonSelector = "button.btn.btn-default.btn-lg.center-block";
    await Promise.all([
        page.goto(siteUrl),
        await page.waitForSelector(submitButtonSelector, {
            visible: true,
            timeout: 15000,
        }),
    ]);

    await page.evaluate((submitButtonSelector) => {
        document.querySelector(submitButtonSelector).click();
    }, submitButtonSelector);

    await page.waitForSelector("#oas-scheduler");

    const siteData = [];

    for (const site of sites) {
        const availabilityContainer = await getAvailabilityForSite(page, site);

        siteData.push({
            ...site,
            availability: availabilityContainer,
            hasAvailability: Object.keys(availabilityContainer).length > 0,
        });
    }

    page.close();
    return siteData;
}

async function getAvailabilityForSite(page, site) {
    const responseJson = await fetchDataForSite(page, site);
    const availabilityContainer = parseJson(responseJson);
    return availabilityContainer;
}

async function fetchDataForSite(page, site) {
    const location = site.location;

    // 2021-05-08T02:34:12.058Z
    const startDateStr = moment().toISOString();
    // 2021-05-21T02:34:12.058Z  13 days
    const endDateStr = moment().add(13, "days").toISOString();

    const response = await page.evaluate(
        async (location, startDateStr, endDateStr) => {
            const json = await fetch(
                "https://southcoastapps.southcoast.org/OnlineAppointmentSchedulingApi/api/resourceTypes/slots/search",
                {
                    headers: {
                        accept: "application/json, text/plain, */*",
                        "accept-language": "en-US,en;q=0.9",
                        "content-type": "application/json",
                        "sec-ch-ua":
                            '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
                        "sec-ch-ua-mobile": "?0",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-site",
                        sessiontoken: "5d886340-71e9-4bd2-9449-80d5eb3263e9",
                    },
                    referrer: "https://www.southcoast.org/",
                    referrerPolicy: "strict-origin-when-cross-origin",
                    body: `{"ProviderCriteria":{"SpecialtyID":null,"ConcentrationID":null},"ResourceTypeId":"98C5A8BE-25D1-4125-9AD5-1EE64AD164D2","StartDate":"${startDateStr}","EndDate":"${endDateStr}","Location":"${location}"}`,
                    method: "POST",
                    mode: "cors",
                    credentials: "omit",
                }
            )
                .then((res) => res.json())
                .then((json) => {
                    return json;
                })
                .catch((error) =>
                    console.log(`error fetching site data: ${error}`)
                );
            return json;
        },
        location,
        startDateStr,
        endDateStr
    );

    return response;
}
