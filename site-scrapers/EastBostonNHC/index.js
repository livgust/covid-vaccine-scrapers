const { site } = require("./config");
const fetch = require("node-fetch");
const moment = require("moment");
const lodash = require("lodash");
const https = require("https");

// appointmentTypes seem not to matter.
// facilityIDs line up with locations.
// const appointmentType = "6011f3c4fa2b92009a1c0f43";
// each page has 100 results. do more pages?? get the first 5 pages?

// todo - maybe convert to a function that takes in 1 arg, an obj with these props.
async function getFetchResponse(page, url, method, headers, body) {
    return await page.evaluate(
        async (url, method, headers, body) => {
            const response = await fetch(url, {
                method,
                headers,
                body, // body data type must match "Content-Type" header
            });
            return await response.text();
        },
        url,
        method,
        headers,
        body
    );
}

async function getHttpsResponse(url, method, headers, inputBody) {
    const options = {
        method,
        headers,
    };
    const promiseToRes = new Promise((resolve) => {
        const req = https.request(url, options, (res) => {
            let body = "";
            console.log(`statusCode: ${res.statusCode}`);
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                resolve(body);
            });
        });
        req.on("error", (error) => {
            console.error(error);
        });
        if (inputBody) {
            req.write(inputBody);
        }
        req.end();
    });

    // const tokenPromise = new Promise((resolve) => {
    //     https
    //         .request(url, options, (res) => {
    //             let body = "";
    //             res.on("data", (chunk) => {
    //                 body += chunk;
    //             });
    //             res.on("end", () => {
    //                 resolve(body);
    //             });
    //         })
    //         .on("error", (e) => {
    //             console.error(
    //                 `Error making request with options ${options} for EastBostonNHC` +
    //                     e
    //             );
    //         })
    //         // .write(inputBody)
    //         .end();
    // });
    const tokenResp = await promiseToRes;
    return JSON.parse(tokenResp);
}

// the function to unit test. will return an availability dictionary.
async function GetAllAvailability(availabilityService) {
    // Fetch 1
    // const loginResponse = await availabilityService.getLoginResponse();
    // console.log("got loginResponse", loginResponse);

    // const accessToken = JSON.parse(loginResponse).token;
    // console.log("got loginToken", accessToken);

    const loginResponseHttps = await availabilityService.getLoginResponseHttps();
    console.log("got loginResponseHttps", loginResponseHttps);

    const accessTokenHttps = loginResponseHttps.token;
    console.log("got accessTokenHttps", accessTokenHttps);

    // // Fetch 2
    // const rawAvailability = await availabilityService.getAvailabilityResponse(
    //     accessToken
    // );

    const rawAvailabilityHttps = await availabilityService.getAvailabilityResponseHttps(
        accessTokenHttps
    );
    // parse appointmentsResponse

    console.log("raw", rawAvailabilityHttps);

    const availabilityObj = rawAvailabilityHttps.response.reduce(
        (acc, appointment) => {
            const zip = appointment.facility.postcode;
            const date = appointment.date.split("T")[0]; // get 2021-03-08 from 2021-03-08T22:40:00.000Z

            console.log("========");
            console.log(`current acc ${JSON.stringify(acc)}`);
            console.log(`Trying to add entry with zip ${zip} and date ${date}`);

            // in the case we haven't seen this zip before...
            if (!acc[zip]) {
                console.log(`didnt find zip ${zip}, adding full object`);
                return {
                    [zip]: {
                        availability: {
                            [date]: {
                                hasAvailability: true,
                                numberAvailableAppointments: 1,
                            },
                        },
                    },
                    ...acc,
                };
            }
            // if we have the zip already, check for the date...
            if (!acc[zip].availability[date]) {
                console.log(`found zip ${zip} but not zip/date ${zip}/${date}`);

                return lodash.set(acc, `${zip}.availability.${date}`, {
                    hasAvailability: true,
                    numberAvailableAppointments: 1,
                });
            }
            console.log(`found zip ${zip} and zip/date ${zip}/${date}`);
            return lodash.set(
                acc,
                `${zip}.availability.${date}.numberAvailableAppointments`,
                acc[zip].availability[date].numberAvailableAppointments + 1
            );
        },
        {}
    );
    console.log("====");
    console.log(JSON.stringify(availabilityObj));

    // should return webData in the correct format, by zip code
    return availabilityObj;
}
function getAvailabilityService() {
    return {
        async getLoginResponseHttps() {
            const data = JSON.stringify({ id: "600f45213901d90012deb171" });
            return await getHttpsResponse(
                "https://api.lumahealth.io/api/widgets/login",
                "POST",
                {
                    "Content-Type": "application/json;charset=UTF-8",
                    "Content-Length": data.length,
                },
                data
            );
        },

        async getAvailabilityResponseHttps(accessToken) {
            return await getHttpsResponse(
                "https://api.lumahealth.io/api/scheduler/availabilities?appointmentType=6011f3c4fa2b92009a1c0f43&date=%3E2021-03-03T00%3A00%3A00-05%3A00&date=%3C2021-03-23T23%3A59%3A59-04%3A00&facility=6011f3c1fa2b92009a1c0e28%2C6011f3c1fa2b92009a1c0e24%2C601a236ff7f880001333e993%2C601a236ff7f880001333e993%2C6011f3c1fa2b92009a1c0e2a&includeNullApptTypes=true&limit=100&page=1&patientForm=603fd7026345ba0013a476ef&populate=true&provider=601a24ac98d5e900120d2582%2C6011f3c2fa2b92009a1c0e59%2C6011f3c2fa2b92009a1c0e69%2C6011f3c2fa2b92009a1c0e6d&sort=date&sortBy=asc&status=available",
                "GET",
                {
                    "x-access-token": accessToken,
                }
            );
        },
    };
}

module.exports = async function GetAvailableAppointments(
    _browser, // gets passed from main.js but we dont use
    availabilityService = getAvailabilityService()
) {
    console.log(`${site.name} starting.`);
    // const availabilityService = getAvailabilityService();

    const webData = await GetAllAvailability(availabilityService);
    // start with 100 appointments, worry about pagination later.

    console.log("got webData", webData);

    console.log(`${site.name} done.`);
    return site.locations.map((loc) => {
        const response = webData[loc.zip] || null;
        return {
            name: `${site.name} (${loc.city} - ${loc.zip})`,
            hasAvailability: !!response, //? true : false, // fix
            availability: response?.availability || {}, //? response.availability : {},
            signUpLink: site.website,
            extraData: `Open to residents of the following neighborhoods: Chelsea (02150), East Boston (02128), Everett (02149), Revere (02151), South End (02118), Winthrop (02152)`,
            ...loc,
            timestamp: moment().format(),
        };
    });
};

// module.exports = { GetAvailableAppointments, GetAllAvailability };

// // facilities:
// const A = "6011f3c1fa2b92009a1c0e24"; // COVID19 VACCINE EB LIVERPOOL
// const B = "6011f3c1fa2b92009a1c0e28"; // REVERE
// const C = "6011f3c1fa2b92009a1c0e2a"; // COVID19 VACCINE SOUTH END
// const D = "601a236ff7f880001333e993"; // CHELSEA

// return {
//     [zip]: {
//         // availability: {
//         [date]: {
//             hasAvailability: true,
//             numberAvailableAppointments: currNumAvailApp,
//         },
//         // ...acc[zip],
//         // },
//     },
//     // ...acc,
// };
// const newAvailabilityObject = {
//     [date]: {
//         hasAvailability: true,
//         numberAvailableAppointments: 1,
//     },
//     ...acc[zip].availability,
// };
// console.log(
//     `for date ${date} going to add newAvailObj`,
//     newAvailabilityObject
// );
// return {
//     [zip]: newAvailabilityObject,
//     ...acc,
// };
// const loginResponse = await getFetchResponse(
//     page,
//     "https://api.lumahealth.io/api/widgets/login",
//     "POST",
//     {
//         "Content-Type": "application/json;charset=UTF-8",
//     },
//     JSON.stringify({ id: "600f45213901d90012deb171" })
// );

// Fetch 2
// const appointmentsUrl = "https://api.lumahealth.io/api/scheduler/availabilities?appointmentType=6011f3c4fa2b92009a1c0f43&date=%3E2021-03-03T00%3A00%3A00-05%3A00&date=%3C2021-03-23T23%3A59%3A59-04%3A00&facility=6011f3c1fa2b92009a1c0e28%2C6011f3c1fa2b92009a1c0e24%2C601a236ff7f880001333e993%2C601a236ff7f880001333e993%2C6011f3c1fa2b92009a1c0e2a&includeNullApptTypes=true&limit=100&page=1&patientForm=603fd7026345ba0013a476ef&populate=true&provider=601a24ac98d5e900120d2582%2C6011f3c2fa2b92009a1c0e59%2C6011f3c2fa2b92009a1c0e69%2C6011f3c2fa2b92009a1c0e6d&sort=date&sortBy=asc&status=available",

// const appointmentResponse = await getAppointments(page, accessToken);

// const appointmentsResponse = await getFetchResponse(
//     page,
//     // todo - swap out the date to be today + 30 days?
//     "https://api.lumahealth.io/api/scheduler/availabilities?appointmentType=6011f3c4fa2b92009a1c0f43&date=%3E2021-03-03T00%3A00%3A00-05%3A00&date=%3C2021-03-23T23%3A59%3A59-04%3A00&facility=6011f3c1fa2b92009a1c0e28%2C6011f3c1fa2b92009a1c0e24%2C601a236ff7f880001333e993%2C601a236ff7f880001333e993%2C6011f3c1fa2b92009a1c0e2a&includeNullApptTypes=true&limit=100&page=1&patientForm=603fd7026345ba0013a476ef&populate=true&provider=601a24ac98d5e900120d2582%2C6011f3c2fa2b92009a1c0e59%2C6011f3c2fa2b92009a1c0e69%2C6011f3c2fa2b92009a1c0e6d&sort=date&sortBy=asc&status=available",
//     "GET",
//     {
//         "x-access-token": accessToken,
//     },
//     null
// );

// async function scrape(browser) {
//     // visit url with pupp
//     // get token (login, validate)

//     console.log("scraping TKJ....");

//     console.log("scraping TKJ DONE with pdata");

//     const loginUrl = "https://api.lumahealth.io/api/widgets/login";
//     const data = { id: "600f45213901d90012deb171" };
//     const validateUrl = "https://api.lumahealth.io/api/tokens/validate";

//     const patientFormsUrl = "https://api.lumahealth.io/api/patientForms"; // need to set x-access-token

//     // or, just make API calls

//     // check availabilities via API call (sep function, for unit testing). if any, log the .har file

//     return true;
// }
// const loginUrl = "https://api.lumahealth.io/api/widgets/login";
// const loginMethod = "POST";
// const loginHeaders = {
//     "Content-Type": "application/json;charset=UTF-8",
// };
// const loginData = { id: "600f45213901d90012deb171" };
// async function getAppointments(page, inputToken) {
//     // const queryString =
//     //     "appointmentType=6011f3c4fa2b92009a1c0f43&date=%3E2021-03-03T00%3A00%3A00-05%3A00&date=%3C2021-03-23T23%3A59%3A59-04%3A00&facility=6011f3c1fa2b92009a1c0e28%2C6011f3c1fa2b92009a1c0e24%2C601a236ff7f880001333e993%2C601a236ff7f880001333e993%2C6011f3c1fa2b92009a1c0e2a&includeNullApptTypes=true&limit=100&page=1&patientForm=603fd7026345ba0013a476ef&populate=true&provider=601a24ac98d5e900120d2582%2C6011f3c2fa2b92009a1c0e59%2C6011f3c2fa2b92009a1c0e69%2C6011f3c2fa2b92009a1c0e6d&sort=date&sortBy=asc&status=available";
//     return await page.evaluate(async (token) => {
//         const response = await fetch(
//             "https://api.lumahealth.io/api/scheduler/availabilities?appointmentType=6011f3c4fa2b92009a1c0f43&date=%3E2021-03-03T00%3A00%3A00-05%3A00&date=%3C2021-03-23T23%3A59%3A59-04%3A00&facility=6011f3c1fa2b92009a1c0e28%2C6011f3c1fa2b92009a1c0e24%2C601a236ff7f880001333e993%2C601a236ff7f880001333e993%2C6011f3c1fa2b92009a1c0e2a&includeNullApptTypes=true&limit=100&page=1&patientForm=603fd7026345ba0013a476ef&populate=true&provider=601a24ac98d5e900120d2582%2C6011f3c2fa2b92009a1c0e59%2C6011f3c2fa2b92009a1c0e69%2C6011f3c2fa2b92009a1c0e6d&sort=date&sortBy=asc&status=available",
//             {
//                 headers: {
//                     "x-access-token": token,
//                     // "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiI2MDNmZDcxOTkzMzllODAwMTI1Yzg1ZjIiLCJleHAiOjE2MTU0MDEzNzk3NjIsInR5cGUiOiJwYXRpZW50Iiwicm9sZXMiOlsicGF0aWVudCJdfQ.xP5pSYLXJckAf19skLD-_M19aeJwQhXechLSBJnK478",
//                 },
//                 body: null,
//                 method: "GET",
//             }
//         );
//         return await response.text();
//     }, inputToken);
// }
// headers: {
//     // Accept: "application/json, text/plain, */*",
//     "Content-Type": "application/json;charset=UTF-8",
//     // "Sec-Fetch-Dest": "empty",
//     // "Sec-Fetch-Mode": "cors",
//     // "Sec-Fetch-Site": "same-site",
// },

// postData("https://example.com/answer", { answer: 42 }).then((data) => {
//     console.log(data); // JSON data parsed by `data.json()` call
// });
// myPostData("https://api.lumahealth.io/api/widgets/login", {
//     id: "600f45213901d90012deb171",
// })
//     .then((data) => {
//         console.log(data); // JSON data parsed by `data.json()` call
//     })
//     .catch((error) => {
//         console.error("Error:", error);
//     });

// async function jQueryPost(page, url, data) {
//     return await page.evaluate(
//         async (url, data) => {
//             return await new Promise((resolve) => {
//                 $.post(url, data, function (data) {
//                     resolve(data);
//                 });
//             });
//         },
//         url,
//         data
//     );
// }

// const loginResults = await fetch(
//     "https://api.lumahealth.io/api/widgets/login",
//     {
//         headers: {
//             accept: "application/json, text/plain, */*",
//             "accept-language": "en-US,en;q=0.9",
//             "content-type": "application/json;charset=UTF-8",
//             "sec-fetch-dest": "empty",
//             "sec-fetch-mode": "cors",
//             "sec-fetch-site": "same-site",
//         },
//         referrer: "https://patient.lumahealth.io/",
//         referrerPolicy: "strict-origin-when-cross-origin",
//         body: '{"id":"600f45213901d90012deb171"}',
//         method: "POST",
//         mode: "cors",
//     }
// )
//     .then((response) => response.json())
//     .then((data) => console.log(data));

// console.log("loginResults", await loginResults);

// async function postData(url = "", data = {}) {
//     // Default options are marked with *
//     const response = await fetch(url, {
//         method: "POST", // *GET, POST, PUT, DELETE, etc.
//         mode: "cors", // no-cors, *cors, same-origin
//         cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
//         credentials: "same-origin", // include, *same-origin, omit
//         headers: {
//             "Content-Type": "application/json",
//             // 'Content-Type': 'application/x-www-form-urlencoded',
//         },
//         redirect: "follow", // manual, *follow, error
//         referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
//         body: JSON.stringify(data), // body data type must match "Content-Type" header
//     });
//     return response.json(); // parses JSON response into native JavaScript objects
// }

// async function myPostData(url = "", data = {}) {
//     // Default options are marked with *
//     const response = await fetch(
//         "https://api.lumahealth.io/api/widgets/login",
//         {
//             headers: {
//                 Accept: "application/json, text/plain, */*",
//                 "Content-Type": "application/json;charset=UTF-8",
//                 "Sec-Fetch-Dest": "empty",
//                 "Sec-Fetch-Mode": "cors",
//                 "Sec-Fetch-Site": "same-site",
//             },
//         }
//     );
//     return response.json(); // parses JSON response into native JavaScript objects
// }

// extra headers:

// accept: "application/json, text/plain, */*",
// "accept-language": "en-US,en;q=0.9",
// "sec-fetch-dest": "empty",
// "sec-fetch-mode": "cors",
// "sec-fetch-site": "same-site",

// referrer: "https://patient.lumahealth.io/",
// referrerPolicy: "strict-origin-when-cross-origin",
// mode: "cors",
