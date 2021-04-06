const dbUtils = require("./utils");
const { generateKey } = require("../../data/dataDefaulter");
const getGeocode = require("./../../getGeocode");
const faunadb = require("faunadb"),
    fq = faunadb.query;
const lodash = require("lodash");

const scraperUtils = {
    addGeneratedIdsToLocations,
    getAppointmentsForAllLocations,
    getAppointmentsByScraperRun,
    getAppointmentsByScraperRuns,
    generateLocationId,
    getScraperRunsByLocation,
    getScraperRunsByLocations,
    writeAppointmentsByRefId,
    writeAppointmentsByRefIds,
    writeLocationByRefId,
    writeLocationsByRefIds,
    writeScrapedData,
    writeScraperRunByRefId,
    writeScraperRunsByRefIds,
};

module.exports = scraperUtils;

function hashCode(s) {
    // Taken from: https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0
    var h = 0,
        l = s.length,
        i = 0;
    if (l > 0) while (i < l) h = ((h << 5) - h + s.charCodeAt(i++)) | 0;
    return h;
}

function generateLocationId({ name, street, city, zip }) {
    // This deterministically generates a key from the location info.
    const keyString = generateKey({ name, street, city, zip });
    // FaunaDB only accepts positive ref ids, so we make it positive.
    const hash = Math.abs(scraperUtils.hashCode(keyString));
    return hash.toString();
}

function addGeneratedIdsToLocations(locations) {
    return locations.reduce((acc, curr) => {
        return [
            {
                ...curr,
                // FaunaDB only accepts positive ref ids, so we make it positive.
                refId: Math.abs(
                    // hash it
                    scraperUtils.hashCode(
                        // This deterministically generates a key from the location info.
                        generateKey({
                            name: curr.name,
                            street: curr.street,
                            city: curr.city,
                            zip: curr.zip,
                        })
                    )
                ).toString(),
            },
            ...acc,
        ];
    }, []);
}

function addScraperRunIdsToLocations(locations) {
    return locations.reduce(async (acc, curr) => {
        return [
            {
                ...curr,
                scraperRunId: await dbUtils.generateId(),
            },
            ...(await acc),
        ];
    }, []);
}

function addAppointmentsToLocations(locations) {
    return locations.reduce(async (acc, loc) => {
        if (loc.hasAvailability && loc.availability) {
            return [
                ...(await acc),
                {
                    ...loc,
                    appointments: lodash.compact(
                        await Promise.all(
                            Object.entries(loc.availability).map(
                                async ([date, dateAvailability]) => {
                                    if (
                                        dateAvailability.hasAvailability &&
                                        dateAvailability.numberAvailableAppointments >
                                            0
                                    ) {
                                        return {
                                            appointmentsRefId: await dbUtils.generateId(),
                                            scraperRunRefId: loc.scraperRunId,
                                            date,
                                            numberAvailable:
                                                dateAvailability.numberAvailableAppointments,
                                            signUpLink:
                                                dateAvailability.signUpLink ||
                                                loc.signUpLink ||
                                                null,
                                            extraData: loc.extraData,
                                        };
                                    }
                                }
                            )
                        )
                    ),
                },
            ];
        }
        return [...(await acc)];
    }, []);
}

async function writeLocationByRefId({
    refId,
    name,
    address: { street, city, zip },
    signUpLink,
    latitude,
    longitude,
    extraData,
    restrictions,
    massVax,
}) {
    await dbUtils.faunaQuery(
        fq.Create(fq.Ref(fq.Collection("locations"), refId), {
            data: {
                name,
                address: {
                    street,
                    city,
                    zip,
                },
                signUpLink,
                latitude,
                longitude,
                extraData,
                restrictions,
                massVax,
            },
        })
    );
}

async function writeLocationsByRefIds(locationsWithRefIds) {
    const queries = locationsWithRefIds.map((loc) =>
        fq.Create(fq.Ref(fq.Collection("locations"), loc.refId), {
            data: {
                name: loc.name,
                address: {
                    street: loc.street,
                    city: loc.city,
                    zip: loc.zip,
                },
                signUpLink: loc.signUpLink,
                latitude: loc.latitude,
                longitude: loc.longitude,
            },
        })
    );
    await dbUtils.faunaQuery(queries);
}

async function writeScraperRunByRefId({
    refId,
    locationRefId,
    timestamp,
    siteTimestamp,
}) {
    await dbUtils.faunaQuery(
        fq.Create(fq.Ref(fq.Collection("scraperRuns"), refId), {
            data: {
                locationRef: fq.Ref(fq.Collection("locations"), locationRefId),
                timestamp,
                siteTimestamp,
            },
        })
    );
}

async function writeScraperRunsByRefIds(locationAndScraperRunsIds, timestamp) {
    const queries = locationAndScraperRunsIds.map((loc) =>
        fq.Create(fq.Ref(fq.Collection("scraperRuns"), loc.scraperRunId), {
            data: {
                locationRef: fq.Ref(fq.Collection("locations"), loc.refId),
                timestamp,
            },
        })
    );
    const result = await dbUtils.faunaQuery(queries);
    return result;
}

async function writeAppointmentsByRefId({
    refId,
    scraperRunRefId,
    date,
    numberAvailable,
    signUpLink,
}) {
    await dbUtils.faunaQuery(
        fq.Create(fq.Ref(fq.Collection("appointments"), refId), {
            data: {
                scraperRunRef: fq.Ref(
                    fq.Collection("scraperRuns"),
                    scraperRunRefId
                ),
                date,
                numberAvailable,
                signUpLink,
            },
        })
    );
}

async function writeAppointmentsByRefIds(locationsWithAllData) {
    const queries = locationsWithAllData
        .map((loc) =>
            loc.appointments.map((a) =>
                fq.Create(
                    fq.Ref(fq.Collection("appointments"), a.appointmentsRefId),
                    {
                        data: {
                            scraperRunRef: fq.Ref(
                                fq.Collection("scraperRuns"),
                                a.scraperRunRefId
                            ),
                            date: a.date,
                            numberAvailable: a.numberAvailable,
                            signUpLink: a.signUpLink,
                            extraData: a.extraData,
                        },
                    }
                )
            )
        )
        .flat();
    dbUtils.debugLog(
        "writeAppointmentsByRefIds queries",
        JSON.stringify(queries)
    );
    const result = await dbUtils.faunaQuery(queries);
    return result;
}

/*
    Index-based queries. This allows us to search our indexes (scraperRunsByLocation, appointmentsByScraperRun).
*/
async function getScraperRunsByLocation(locationRefId) {
    const scraperRuns = await dbUtils.faunaQuery(
        fq.Map(
            fq.Paginate(
                fq.Match(
                    fq.Index("scraperRunsByLocation"),
                    fq.Ref(fq.Collection("locations"), locationRefId)
                )
            ),
            fq.Lambda((x) => fq.Get(x))
        )
    );
    dbUtils.debugLog(
        `for locationRefId ${locationRefId} got response ${JSON.stringify(
            scraperRuns
        )}`
    );
    return scraperRuns;
}

async function getScraperRunsByLocations(locations) {
    const queries = locations.map((loc) =>
        fq.Map(
            fq.Paginate(
                fq.Match(
                    fq.Index("scraperRunsByLocation"),
                    fq.Ref(fq.Collection("locations"), loc.refId)
                )
            ),
            fq.Lambda((x) => fq.Get(x))
        )
    );
    const scraperRuns = await dbUtils.faunaQuery(queries);
    return scraperRuns;
}

async function getAppointmentsByScraperRun(scraperRunRefId) {
    const appointments = await dbUtils.faunaQuery(
        fq.Map(
            fq.Paginate(
                fq.Match(
                    fq.Index("appointmentsByScraperRun"),
                    fq.Ref(fq.Collection("scraperRuns"), scraperRunRefId)
                )
            ),
            fq.Lambda((x) => fq.Get(x))
        )
    );
    dbUtils.debugLog(
        `for scraperRunRefId ${scraperRunRefId} got response ${JSON.stringify()}`
    );
    return appointments;
}

async function getAppointmentsByScraperRuns(scraperRunRefIds) {
    const queries = await scraperRunRefIds.map((scraperRunRefId) =>
        fq.Map(
            fq.Paginate(
                fq.Match(
                    fq.Index("appointmentsByScraperRun"),
                    fq.Ref(fq.Collection("scraperRuns"), scraperRunRefId)
                )
            ),
            fq.Lambda((x) => fq.Get(x))
        )
    );
    const appointments = await dbUtils.faunaQuery(queries);

    dbUtils.debugLog(
        `for scraperRunRefIds ${scraperRunRefIds} got response ${JSON.stringify(
            appointments
        )}`
    );
    return appointments;
}

/* 
    Utility that for one scraper output, writes to all the tables (locations, scraperRuns, and appointments).
    We will call this many times from scraper.js.
*/
async function writeScrapedData({
    parentLocationName,
    timestamp,
    individualLocationData,
    // name,
    // street,
    // city,
    // zip,
    // availability,
    // hasAvailability,
    // extraData,
    // timestamp,
    // signUpLink,
    // restrictions,
    // massVax,
    // siteTimestamp,
}) {
    //Global TODO: update where object properties come from

    // TODO: add parent location if it doesn't exist, get the ID

    // TODO: write parentScraperRunRefId and write it
    for (const item of individualLocationData) {
        const {
            availability,
            city,
            extraData,
            hasAvailability,
            massVax,
            name,
            restrictions,
            signUpLink,
            siteTimestamp,
            street,
            zip,
        } = item;
        const locationRefId = scraperUtils.generateLocationId({
            name,
            street,
            city,
            zip,
        });
        const itemExists = await dbUtils.checkItemExistsByRefId(
            "locations",
            locationRefId
        );

        dbUtils.debugLog(`item ${locationRefId} exists: ${itemExists}`);
        if (!itemExists) {
            const locationData = await getGeocode.getGeocode(name, street, zip);
            // TODO: add parentLocationRefId
            await scraperUtils.writeLocationByRefId({
                refId: locationRefId.toString(),
                name,
                address: {
                    street,
                    city,
                    zip,
                },
                signUpLink,
                latitude: locationData?.results[0].geometry.location.lat,
                longitude: locationData?.results[0].geometry.location.lng,
                extraData,
                restrictions,
                massVax,
            });
        }
        // TODO: merge new info if exists for location

        // TODO: do we need to generate this ID? we should get it back
        const scraperRunRefId = await dbUtils.generateId();
        await scraperUtils.writeScraperRunByRefId({
            refId: scraperRunRefId,
            locationRefId,
            timestamp,
            siteTimestamp,
        });

        if (hasAvailability && availability) {
            await Promise.all(
                Object.entries(availability).map(
                    async ([date, dateAvailability]) => {
                        if (
                            dateAvailability === true ||
                            (dateAvailability.hasAvailability &&
                                dateAvailability.numberAvailableAppointments >
                                    0)
                        ) {
                            const appointmentsRefId = await dbUtils.generateId();
                            await scraperUtils.writeAppointmentsByRefId({
                                refId: appointmentsRefId,
                                scraperRunRefId,
                                date,
                                numberAvailable:
                                    dateAvailability.numberAvailableAppointments,
                                signUpLink: dateAvailability.signUpLink,
                            });
                        }
                    }
                )
            );
        }
    }
}

/* 
    Utility that will return all availability for each location's most recent scraper run.
    This will go into a lambda.
*/
async function getAppointmentsForAllLocations() {}
