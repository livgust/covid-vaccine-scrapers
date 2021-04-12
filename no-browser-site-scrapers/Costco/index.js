const https = require("https");
const moment = require("moment");
const { toTitleCase } = require("../../lib/stringUtil");

async function GetAvailableAppointments() {
    console.log("Costco locations starting");
    const webData = await ScrapeWebsiteData();
    console.log("Costco locations complete");
    return {
        parentLocationName: "Costco",
        isChain: true,
        timestamp: moment().format(),
        individualLocationData: webData,
    };
}

async function ScrapeWebsiteData() {
    const results = [];

    const locationsObject = await new Promise((resolve) => {
        https
            .get(
                "https://book.appointment-plus.com/book-appointment/get-clients?clientMasterId=426227&pageNumber=1&itemsPerPage=10&keyword=&clientId=&employeeId=&centerCoordinates%5Bid%5D=&centerCoordinates%5Blatitude%5D=42.4392873&centerCoordinates%5Blongitude%5D=-71.17923410000002&centerCoordinates%5Baccuracy%5D=2384&centerCoordinates%5BwhenAdded%5D=&centerCoordinates%5BsearchQuery%5D=&radiusInKilometers=100&_=1618155975724",
                (res) => {
                    let body = "";
                    res.on("data", (chunk) => {
                        body += chunk;
                    });
                    res.on("end", () => {
                        resolve(JSON.parse(body));
                    });
                }
            )
            .on("error", (e) => {
                console.error(`Error making token request for Costco: + ${e}`);
            })
            .end();
    }).then((res) => {
        return res.clientObjects.reduce((obj, loc) => {
            obj[loc.id] = {
                name: loc.locationName,
                street: toTitleCase(loc.address1),
                city: toTitleCase(loc.city),
                zip: toTitleCase(loc.postalCode),
                latitude: loc.latitude,
                longitude: loc.longitude,
                signUpLink: "https://book.appointment-plus.com/d133yng2/",
            };
            return obj;
        }, {});
    });

    for (const [id, locationEntry] of Object.entries(locationsObject)) {
        const availability = {};
        let hasAvailability = false;
        const employeeIds = await new Promise((resolve) => {
            https
                .get(
                    `https://book.appointment-plus.com/book-appointment/get-employees?clientMasterId=426651&clientId=${id}&pageNumber=1&itemsPerPage=10&keyword=&employeeId=&_=1618155975727`,
                    (res) => {
                        let body = "";
                        res.on("data", (chunk) => {
                            body += chunk;
                        });
                        res.on("end", () => {
                            resolve(JSON.parse(body));
                        });
                    }
                )
                .on("error", (e) => {
                    console.error(`Error making request for Costco: + ${e}`);
                })
                .end();
        }).then((res) =>
            res.employeeObjects.map((employeeObject) => employeeObject.id)
        );
        for (const employeeId of employeeIds) {
            const serviceIds = await new Promise((resolve) => {
                https
                    .get(
                        `https://book.appointment-plus.com/book-appointment/get-services/${employeeId}?clientMasterId=426651&clientId=${id}&pageNumber=1&itemsPerPage=10&keyword=&serviceId=&_=1618155975728`,
                        (res) => {
                            let body = "";
                            res.on("data", (chunk) => {
                                body += chunk;
                            });
                            res.on("end", () => {
                                resolve(JSON.parse(body));
                            });
                        }
                    )
                    .on("error", (e) => {
                        console.error(
                            `Error making request for Costco: + ${e}`
                        );
                    })
                    .end();
            }).then((res) =>
                res.serviceObjects.map((serviceObject) => serviceObject.id)
            );
            for (const serviceId of serviceIds) {
                const availability = await new Promise((resolve) => {
                    https
                        .get(
                            `https://book.appointment-plus.com/book-appointment/get-grid-hours?startTimestamp=${moment()
                                .format("YYYY-MM-DDTHH:mm:ss")
                                .replace(
                                    /:/g,
                                    "%3A"
                                )}&endTimestamp=${moment()
                                .add(1, "month")
                                .startOf("day")
                                .format("YYYY-MM-DD+HH:mm:ss")
                                .replace(
                                    /:/g,
                                    "%3A"
                                )}&limitNumberOfDaysWithOpenSlots=7&employeeId=${employeeId}&services%5B%5D=${serviceId}&numberOfSpotsNeeded=1&isStoreHours=true&clientMasterId=426651&toTimeZone=false&fromTimeZone=149&_=1618155975731`,
                            (res) => {
                                let body = "";
                                res.on("data", (chunk) => {
                                    body += chunk;
                                });
                                res.on("end", () => {
                                    resolve(JSON.parse(body));
                                });
                            }
                        )
                        .on("error", (e) => {
                            console.error(
                                `Error making request for Costco: + ${e}`
                            );
                        })
                        .end();
                }).then((res) => {
                    for (const [date, availabilityObject] of Object.entries(
                        res.data.gridHours
                    )) {
                        const totalSpots = (
                            availabilityObject?.timeslots?.numberOfSpots || [0]
                        ).reduce((acc, cur) => acc + cur, 0);
                        const spotsTaken = (
                            availabilityObject?.timeslots
                                ?.numberOfSpotsTaken || [0]
                        ).reduce((acc, cur) => acc + cur, 0);
                        const spotsAvailable = totalSpots - spotsTaken;
                        const formattedDate = moment(date).format("M/D/YY");
                        if (spotsAvailable) {
                            hasAvailability = true;
                            if (availability[formattedDate]) {
                                availability[formattedDate] = {
                                    hasAvailability: true,
                                    numberAvailableAppointments:
                                        (availability[formattedDate] || 0) +
                                        spotsAvailable,
                                };
                            } else {
                                availability[formattedDate] = {
                                    hasAvailability: true,
                                    numberAvailableAppointments: spotsAvailable,
                                };
                            }
                        }
                    }
                });
            }
        }
        results.push({
            ...locationEntry,
            availability,
            hasAvailability,
        });
    }
    return results;
}

module.exports = GetAvailableAppointments;
