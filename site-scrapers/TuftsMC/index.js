const https = require("https");
const file = require("../../lib/file");
const fetch = require("node-fetch");
const { site, requestInit } = require("./config");

module.exports = async function GetAvailableAppointments(
    browser,
    pageService = defaultPageService()
) {
    console.log(`${site.name} starting.`);
    const webData = await ScrapeWebsiteData(browser, pageService);
    console.log(`${site.name} done.`);
    return {
        ...site,
        ...webData,
        timestamp: new Date(),
    };
};

function defaultPageService() {
    return {
        async fetchAvailability() {
            return fetchAvailability();
        },
    };
}

async function ScrapeWebsiteData(browser, fetchService) {
    // Initialize results to no availability
    const results = {
        availability: {},
        hasAvailability: false,
    };

    /* Note:
        site has next button if 'button[data-test="desktop-controls-right-arrow"]'
        is not disabled
    */

    const response = await fetchService.fetchAvailability();

    results.availability = {
        ...results.availability,
        ...parseResponse(response),
    };
    // }

    results.hasAvailability = !!Object.keys(results.availability).length;

    if (process.env.DEVELOPMENT) {
        file.write(
            `${process.cwd()}/out.json`,
            `${JSON.stringify(results, null, "   ")}`
        );
    }

    return results;
}

async function fetchAvailability() {
    let fetchResponse = await fetch("https://api.zocdoc.com/directory/v2/gql", {
        headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "sec-ch-ua":
                '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "x-zd-application": "patient-web-app",
            "x-zd-referer": "",
            "x-zd-url":
                "https://www.zocdoc.com/wl/tuftscovid19vaccination/practice/64825?reason_visit=5243",
            "x-zdata": "eyJob3N0Ijoid3d3LnpvY2RvYy5jb20ifQ==",
            "zd-application-name": "patient-web-app",
            "zd-pageview-id": "205cc2a39612c66a00163be877d1b493",
            "zd-referer": "",
            "zd-session-id": "d61cc2b74bd246029b988a4038123001",
            "zd-tracking-id": "b28be354-5d7f-4ea2-bdad-1e05b17554d0",
            "zd-url":
                "https://www.zocdoc.com/wl/tuftscovid19vaccination/practice/64825?reason_visit=5243",
            "zd-user-agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36",
        },
        referrer: "https://www.zocdoc.com/",
        referrerPolicy: "strict-origin-when-cross-origin",
        body:
            '{"operationName":"providerLocationsAvailability","variables":{"directoryId":"1172","insurancePlanId":"-1","isNewPatient":false,"numDays":7,"procedureId":"5243","widget":false,"providerLocationIds":["pr_fSHH-Tyvm0SZvoK3pfH8tx|lo_EMLPse6C60qr6_M2rJmilx"]},"query":"query providerLocationsAvailability($directoryId: String, $insurancePlanId: String, $isNewPatient: Boolean, $isReschedule: Boolean, $jumpAhead: Boolean, $firstAvailabilityMaxDays: Int, $numDays: Int, $procedureId: String, $providerLocationIds: [String], $searchRequestId: String, $startDate: String, $timeFilter: TimeFilter, $widget: Boolean) {\\n  providerLocations(ids: $providerLocationIds) {\\n    id\\n    ...availability\\n    __typename\\n  }\\n}\\n\\nfragment availability on ProviderLocation {\\n  id\\n  provider {\\n    id\\n    monolithId\\n    __typename\\n  }\\n  location {\\n    id\\n    monolithId\\n    state\\n    phone\\n    __typename\\n  }\\n  availability(directoryId: $directoryId, insurancePlanId: $insurancePlanId, isNewPatient: $isNewPatient, isReschedule: $isReschedule, jumpAhead: $jumpAhead, firstAvailabilityMaxDays: $firstAvailabilityMaxDays, numDays: $numDays, procedureId: $procedureId, searchRequestId: $searchRequestId, startDate: $startDate, timeFilter: $timeFilter, widget: $widget) {\\n    times {\\n      date\\n      timeslots {\\n        isResource\\n        startTime\\n        __typename\\n      }\\n      __typename\\n    }\\n    firstAvailability {\\n      startTime\\n      __typename\\n    }\\n    showGovernmentInsuranceNotice\\n    timesgridId\\n    today\\n    __typename\\n  }\\n  __typename\\n}\\n"}',
        method: "POST",
        mode: "cors",
    })
        .then((res) => res.json()) // expecting a json response
        .then((data) => {
            return data;
        })
        .catch((error) => {
            console.log(`fetch error: ${error}`);
        });

    return fetchResponse && fetchResponse.data.providerLocations
        ? fetchResponse
        : {};
}

/**
 *
 * @param {JSON} data
 * @returns an Object {} of slot counts (int) keyed by date.
 */
function parseResponse(response) {
    function reformatDate(date) {
        const dateObj = new Date(date + "T00:00:00");
        return new Intl.DateTimeFormat("en-US").format(dateObj);
    }

    const data = response.data;
    const dateTimeslotCountResults = {};

    if (data.providerLocations.length > 0) {
        const times = data.providerLocations[0].availability.times;

        times
            .filter((timeSlotDay) => timeSlotDay.timeslots.length > 0)
            .forEach((timeSlotDay) => {
                dateTimeslotCountResults[reformatDate(timeSlotDay.date)] = {
                    numberAvailableAppointments: timeSlotDay.timeslots.length,
                    hasAvailability: true,
                };
            });
    }

    return dateTimeslotCountResults;
}
