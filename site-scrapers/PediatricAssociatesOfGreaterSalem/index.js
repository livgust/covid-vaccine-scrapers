const { site } = require("./config");
const https = require("https");
const moment = require("moment");

// Set to true to see responses in the console.
const DEBUG = false;

// Total days to search in the schedule.
const DAYSTOSEARCH = 16;

module.exports = async function GetAvailableAppointments() {
    console.log("Pediatric Associates of Greater Salem starting.");
    try {
        return DoGetAvailableAppointments();
    } finally {
        console.log("Pediatric Associates of Greater Salem done.");
    }
};

async function DoGetAvailableAppointments() {
    const {
        name,
        bearerTokenUrl,
        schedulingTokenUrl,
        graphQLUrl,
        locations,
        ...restSalem
    } = site;

    const webData = await QuerySchedule(
        DAYSTOSEARCH,
        bearerTokenUrl,
        schedulingTokenUrl,
        graphQLUrl
    );
    // We do not have separate availability information for each site.
    // Distribute webData to all locations.
    return locations.map((location) => {
        return {
            name: `${name} (${location.city})`,
            ...location,
            ...webData,
            timestamp: moment().format(),
        };
    });
}

async function QuerySchedule(
    days,
    bearerTokenUrl,
    schedulingTokenUrl,
    graphQLUrl
) {
    // Get a bearer token
    const bearerToken = await GetToken(bearerTokenUrl);
    Debug("bearerToken", bearerToken);

    // Get a JWT
    const schedulingToken = await GetToken(schedulingTokenUrl);
    Debug("schedulingToken", schedulingToken);

    // Issue the GetFilters GraphQL query
    const responseData = await SearchAvailabilityDates(
        days,
        graphQLUrl,
        bearerToken,
        schedulingToken
    );
    Debug("responseData", responseData);

    return ParseAvailabilityDates(responseData.data.searchAvailabilityDates);
}

function Debug(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

function GetToken(url) {
    return new Promise((resolve) => {
        let response = "";
        https.get(url, (res) => {
            let body = "";
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                response = JSON.parse(body);
                resolve(response.token);
            });
        });
    });
}

async function SearchAvailabilityDates(
    days,
    url,
    bearerToken,
    schedulingToken
) {
    const postData = JSON.stringify({
        operationName: "SearchAvailabilityDates",
        variables: {
            locationIds: ["2804-102"],
            practitionerIds: [],
            specialty: "Unknown Provider",
            serviceTypeTokens: [
                // TODO: I am not sure what this GUID signifies or if it varies.
                "codesystem.scheduling.athena.io/servicetype.canonical|49b8e757-0345-4923-9889-a3b57f05aed2",
            ],
            startAfter: Today(),
            startBefore: DaysLater(days - 1),
        },
        query: SearchAvailabilityDatesQuery(),
    });

    const options = {
        method: "POST",
        headers: {
            authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
            "Content-Length": postData.length,
            "x-scheduling-jwt": schedulingToken,
        },
    };

    const responseData = await Post(url, postData, options);
    return JSON.parse(responseData);
}

function Today() {
    // Today's date in format 2021-02-26T00:00:00-05:00 (ISO-8601)
    return moment().startOf("day").format();
}

function DaysLater(days) {
    // The last second of "days" days later e.g. 2021-03-13T23:59:59-05:00
    return moment().add(days, "days").endOf("day").format();
}

function SearchAvailabilityDatesQuery() {
    return `query SearchAvailabilityDates($locationIds: [String!], $practitionerIds: [String!], $specialty: String, $serviceTypeTokens: [String!]!, $startAfter: String!, $startBefore: String!, $visitType: VisitType) {
        searchAvailabilityDates(locationIds: $locationIds, practitionerIds: $practitionerIds, specialty: $specialty, serviceTypeTokens: $serviceTypeTokens, startAfter: $startAfter, startBefore: $startBefore, visitType: $visitType) {
            date
            availability
            __typename
        }}`;
}

function Post(url, postData, options) {
    return new Promise((resolve) => {
        const req = https.request(url, options, (res) => {
            let body = "";
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body);
                } else {
                    console.error(
                        `Error status code [${res.statusCode}] returned: ${res.statusMessage}`
                    );
                    resolve();
                }
            });
        });
        req.write(postData);
        req.on("error", (e) => {
            console.error("Error making request: " + e);
        });
        req.end();
    });
}

function ParseAvailabilityDates(availabilityDates) {
    // Expected response like
    // [
    //     {"date":"2021-02-26","availability":false,"__typename":"Availability"},
    //     ...
    // ]
    const availability = {};
    let hasAvailability = false;
    availabilityDates.forEach((availabilityDate) => {
        if (availabilityDate.availability) {
            availability[ReformatDate(availabilityDate.date)] = true;
            hasAvailability = true;
        }
    });

    return { availability: availability, hasAvailability: hasAvailability };
}

function ReformatDate(dateString) {
    return moment(dateString).format("YYYY/MM/DD");
}
