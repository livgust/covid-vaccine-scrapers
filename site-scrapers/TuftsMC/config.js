const site = {
    name: "Tufts Medical Center",
    street: "279 Tremont St",
    city: "Boston",
    zip: "02116",
    signUpLink:
        "https://www.zocdoc.com/wl/tuftscovid19vaccination/practice/64825?reason_visit=5243",
};

const requestInit = {
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
};

module.exports = {
    site,
    requestInit,
};
