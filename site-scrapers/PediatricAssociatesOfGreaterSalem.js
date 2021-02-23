const https = require("https");
const moment = require("moment");
const sites = require("../data/sites.json");
const DEBUG = false;

module.exports = async function GetAvailableAppointments() {
    console.log("Pediatric Associates of Greater Salem starting.");
    const {
        name,
        bearerTokenUrl,
        schedulingTokenUrl,
        graphQLUrl,
        ...restSalem
    } = sites.PediatricAssociatesOfGreaterSalem;

    const webData = await QuerySchedule(
        bearerTokenUrl,
        schedulingTokenUrl,
        graphQLUrl
    );
    console.log("Pediatric Associates of Greater Salem done.");

    return [
        {
            ...restSalem,
            ...webData,
            name: name,
            timestamp: moment().format(),
        },
    ];
};

async function QuerySchedule(bearerTokenUrl, schedulingTokenUrl, graphQLUrl) {
    // Get a bearer token
    const bearerToken = await GetToken(bearerTokenUrl);
    Debug("bearerToken", bearerToken);

    // Get a JWT
    const schedulingToken = await GetToken(schedulingTokenUrl);
    Debug("schedulingToken", schedulingToken);

    // Issue the GetFilters GraphQL query
    const responseData = await GetFilters(
        graphQLUrl,
        bearerToken,
        schedulingToken
    );
    Debug("responseData", responseData);

    let results = { availability: {}, hasAvailability: false };
    if (responseData.data.getFilters) {
        // TODO: Parse
    }
    return results;
}

function Debug(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

function GraphQLQuery() {
    return `query GetFilters($locationIds: [String!]!, $practitionerIds: [String!]!) {
  getFilters(locationIds: $locationIds, practitionerIds: $practitionerIds) {
    ...Filters
    __typename
  }
}

fragment Filters on Filters {
  patientNewness {
    text
    value
    __typename
  }
  specialties {
    text
    value
    patientNewness
    __typename
  }
  visitReasons {
    text
    value
    patientNewness
    specialties
    __typename
  }
  hasTelehealthConfiguration
  __typename
}`;
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

async function GetFilters(url, bearerToken, schedulingToken) {
    const postData = JSON.stringify({
        operationName: "GetFilters",
        variables: {
            locationIds: ["2804-102"],
            practitionerIds: [],
        },
        query: GraphQLQuery(),
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

function Post(url, postData, options) {
    return new Promise((resolve) => {
        const req = https.request(url, options, (res) => {
            let body = "";
            //responseHeaders = res.headers;
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
