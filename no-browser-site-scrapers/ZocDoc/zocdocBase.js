const fetch = require("node-fetch");
const moment = require("moment");

async function fetchAvailability() {
    const response = await fetch("https://api.zocdoc.com/directory/v2/gql", {
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
            "x-zd-referer": "https://www.zocdoc.com/vaccine/screener?state=MA",
            "x-zd-url":
                "https://www.zocdoc.com/vaccine/search/MA?flavor=state-search",
            "x-zdata": "eyJob3N0Ijoid3d3LnpvY2RvYy5jb20ifQ==",
            "zd-application-name": "patient-web-app",
            "zd-referer": "https://www.zocdoc.com/vaccine/screener?state=MA",
            "zd-session-id": "7003f0975861439882d25da7d6d87954",
            "zd-tracking-id": "b28be354-5d7f-4ea2-bdad-1e05b17554d0",
            "zd-url":
                "https://www.zocdoc.com/vaccine/search/MA?flavor=state-search",
            "zd-user-agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36",
        },
        referrer: "https://www.zocdoc.com/",
        referrerPolicy: "strict-origin-when-cross-origin",
        body:
            '{"operationName":"providerLocationsAvailability","variables":{"directoryId":"-1","insurancePlanId":"-1","isNewPatient":true,"jumpAhead":true,"numDays":14,"procedureId":"5243","searchRequestId":"7345a02c-6dac-4108-8e76-1ac9f5c0052b","timeFilter":"AnyTime","firstAvailabilityMaxDays":30,"providerLocationIds":["pr_fSHH-Tyvm0SZvoK3pfH8tx|lo_EMLPse6C60qr6_M2rJmilx","pr_VUnpWUtg1k2WFBMK8IhZkx|lo_PhFQcSZjdUKZUHp63gDcmx","pr_pEgrY3r5qEuYKsKvc4Kavx|lo_f3k2t812AUa9NTIYJpbuKx","pr_TeD-JuoydUKqszEn2ATb8h|lo_jbrpfIgELEWWL2j5d3t6Sh","pr_iXjD9x2P-0OrLNoIknFr8R|lo_xmpTUhghfUC2n6cs3ZGHhh","pr_BDBebslqJU2vrCAvVMhYeh|lo_zDtK7NZWO0S_rgUqjxD1hB","pr_4Vg_3ZeLY0aHJJxsCU-WhB|lo_VA_6br22m02Iu57vrHWtaB","pr_CUmBnwtlz0C16bif5EU0IR|lo_X6zHHncQnkqyLp-rvpi1_R"]},"query":"query providerLocationsAvailability($directoryId: String, $insurancePlanId: String, $isNewPatient: Boolean, $isReschedule: Boolean, $jumpAhead: Boolean, $firstAvailabilityMaxDays: Int, $numDays: Int, $procedureId: String, $providerLocationIds: [String], $searchRequestId: String, $startDate: String, $timeFilter: TimeFilter, $widget: Boolean) {\\n  providerLocations(ids: $providerLocationIds) {\\n    id\\n    ...availability\\n    __typename\\n  }\\n}\\n\\nfragment availability on ProviderLocation {\\n  id\\n  provider {\\n    id\\n    monolithId\\n    __typename\\n  }\\n  location {\\n    id\\n    monolithId\\n    state\\n    phone\\n    __typename\\n  }\\n  availability(directoryId: $directoryId, insurancePlanId: $insurancePlanId, isNewPatient: $isNewPatient, isReschedule: $isReschedule, jumpAhead: $jumpAhead, firstAvailabilityMaxDays: $firstAvailabilityMaxDays, numDays: $numDays, procedureId: $procedureId, searchRequestId: $searchRequestId, startDate: $startDate, timeFilter: $timeFilter, widget: $widget) {\\n    times {\\n      date\\n      timeslots {\\n        isResource\\n        startTime\\n        __typename\\n      }\\n      __typename\\n    }\\n    firstAvailability {\\n      startTime\\n      __typename\\n    }\\n    showGovernmentInsuranceNotice\\n    timesgridId\\n    today\\n    __typename\\n  }\\n  __typename\\n}\\n"}',
        method: "POST",
        mode: "cors",
    })
        .then((response) => response.json())
        .then((json) => {
            return json;
        })
        .catch((error) => console.log(`error fetching availability: ${error}`));

    return response ? response : {};
}

/**
 *
 * @param {*} availabilityResponses
 * @returns
 */
function parseAvailability(availabilityResponses) {
    function reformatDate(date) {
        var dateObj = moment(date + "T00:00:00");
        return `${dateObj.month() + 1}/${dateObj.date()}/${dateObj.year()}`;
    }

    const data = availabilityResponses.data;
    const pLocations = availabilityResponses.data.providerLocations;

    const results = {};

    Object.values(pLocations).map((pLoc) => {
        /*
            {
                providerId : {
                    availability: { date: {numberAvailableAppointments, hasAvailability} }
                }
            }
        */

        if (data.providerLocations.length > 0) {
            const times = pLoc.availability.times;

            const providerIdDateTimes = {};
            times
                .filter((timeSlotDay) => timeSlotDay.timeslots.length > 0)
                .forEach((timeSlotDay) => {
                    providerIdDateTimes[reformatDate(timeSlotDay.date)] = {
                        numberAvailableAppointments:
                            timeSlotDay.timeslots.length,
                        hasAvailability: true,
                    };
                });
            results[pLoc.id] = { availability: providerIdDateTimes };
        }
    });

    return results;
}

module.exports = {
    fetchAvailability,
    parseAvailability,
};
