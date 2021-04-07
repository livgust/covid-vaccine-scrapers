const dotenv = require("dotenv");
dotenv.config();
const { generateKey } = require("../data/dataDefaulter");
const faunadb = require("faunadb"),
    fq = faunadb.query;
const lodash = require("lodash");
const { getGeocode } = require("./../getGeocode");

DEBUG = false; // set to false to disable debugging
function debug_log(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

const client = new faunadb.Client({ secret: process.env.FAUNA_DB });

/* 
    General utility methods, used just within db-utils and test file.
*/
async function faunaQuery(query) {
    try {
        debug_log(`trying to execute query ${JSON.stringify(query)}`);
        const res = await client.query(query);
        debug_log(
            `successfully executed query ${JSON.stringify(
                query
            )}, got res ${JSON.stringify(res)}`
        );
        return res;
    } catch (error) {
        console.error(`for query ${JSON.stringify(query)}, got error ${error}`);
        console.error(error.description);
        throw error;
    }
}
function hashCode(s) {
    // Taken from: https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0
    var h = 0,
        l = s.length,
        i = 0;
    if (l > 0) while (i < l) h = ((h << 5) - h + s.charCodeAt(i++)) | 0;
    return h;
}

async function generateId() {
    return faunaQuery(fq.NewId());
}

function generateLocationId({ name, street, city, zip }) {
    // This deterministically generates a key from the location info.
    const keyString = generateKey({ name, street, city, zip });
    // FaunaDB only accepts positive ref ids, so we make it positive.
    const hash = Math.abs(hashCode(keyString));
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
                    hashCode(
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
                scraperRunId: await generateId(),
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
                                            appointmentsRefId: await generateId(),
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

/*
    Basic CRUD operations.
*/
async function retrieveItemByRefId(collectionName, refId) {
    const result = await faunaQuery(
        fq.Get(fq.Ref(fq.Collection(collectionName), refId))
    );
    debug_log(
        `querying ${collectionName} collection with refId ${refId} and got result ${JSON.stringify(
            result
        )}`
    );
    return result;
}

async function retrieveItemsByRefIds(collectionName, refIds) {
    const queries = refIds.map((refId) =>
        fq.Get(fq.Ref(fq.Collection(collectionName), refId))
    );
    const result = await faunaQuery(queries);
    debug_log(
        `querying ${collectionName} collection with refIds ${refIds} and got result ${JSON.stringify(
            result
        )}`
    );
    return result;
}

async function checkItemExistsByRefId(collectionName, refId) {
    const result = await faunaQuery(
        fq.Exists(fq.Ref(fq.Collection(collectionName), refId))
    );
    return result;
}

async function checkItemsExistByRefIds(collectionName, refIds) {
    const queries = refIds.map((refId) =>
        fq.Exists(fq.Ref(fq.Collection(collectionName), refId))
    );
    const result = await faunaQuery(queries);
    return result;
}

async function deleteItemByRefId(collectionName, refId) {
    await faunaQuery(fq.Delete(fq.Ref(fq.Collection(collectionName), refId)));
}

async function deleteItemsByRefIds(collectionName, refIds) {
    const queries = refIds.map((refId) =>
        fq.Delete(fq.Ref(fq.Collection(collectionName), refId))
    );
    await faunaQuery(queries);
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
    await faunaQuery(
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
    await faunaQuery(queries);
}

async function writeScraperRunByRefId({
    refId,
    locationRefId,
    timestamp,
    siteTimestamp,
}) {
    await faunaQuery(
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
    const result = await faunaQuery(queries);
    return result;
}

async function writeAppointmentsByRefId({
    refId,
    scraperRunRefId,
    date,
    numberAvailable,
    signUpLink,
}) {
    await faunaQuery(
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
    debug_log("writeAppointmentsByRefIds queries", JSON.stringify(queries));
    const result = await faunaQuery(queries);
    return result;
}

/*
    Index-based queries. This allows us to search our indexes (scraperRunsByLocation, appointmentsByScraperRun).
*/
async function getScraperRunsByLocation(locationRefId) {
    const scraperRuns = await faunaQuery(
        fq.Map(
            fq.Paginate(
                fq.Match(
                    fq.Index("scraperRunsByLocationRefSortByTimestamp"),
                    fq.Ref(fq.Collection("locations"), locationRefId)
                )
            ),
            fq.Lambda((x) => fq.Get(x))
        )
    );
    debug_log(
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
                    fq.Index("scraperRunsByLocationRefSortByTimestamp"),
                    fq.Ref(fq.Collection("locations"), loc.refId)
                )
            ),
            fq.Lambda((x) => fq.Get(x))
        )
    );
    const scraperRuns = await faunaQuery(queries);
    return scraperRuns;
}

async function getAppointmentsByScraperRun(scraperRunRefId) {
    const appointments = await faunaQuery(
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
    debug_log(
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
    const appointments = await faunaQuery(queries);

    debug_log(
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
    name,
    street,
    city,
    zip,
    availability,
    hasAvailability,
    extraData,
    timestamp,
    signUpLink,
    restrictions,
    massVax,
    siteTimestamp,
}) {
    const locationRefId = generateLocationId({ name, street, city, zip });
    const itemExists = await checkItemExistsByRefId("locations", locationRefId);
    debug_log(`item ${locationRefId} exists: ${itemExists}`);
    if (!itemExists) {
        const locationData = await getGeocode(name, street, zip);
        await writeLocationByRefId({
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

    const scraperRunRefId = await generateId();
    await writeScraperRunByRefId({
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
                            dateAvailability.numberAvailableAppointments > 0)
                    ) {
                        const appointmentsRefId = await generateId();
                        await writeAppointmentsByRefId({
                            refId: appointmentsRefId,
                            scraperRunRefId,
                            date,
                            numberAvailable:
                                dateAvailability.numberAvailableAppointments ||
                                null,
                            signUpLink:
                                dateAvailability.signUpLink || signUpLink,
                        });
                    }
                }
            )
        );
    }
}

/* 
    Utility that for a batch of scrapers' output, writes to all the tables (locations, scraperRuns, and appointments).
    This, and the batch functions called from here, are not currently called in our code (tests only).
    But we may want to batch in the future, so leaving this here for now. 
*/
async function writeScrapedDataBatch(locations, timestamp) {
    // Generate Location RefIds
    const locationsWithRefIds = await addGeneratedIdsToLocations(locations);
    // Add Location documents for those that don't exist
    const itemsExistBools = await checkItemsExistByRefIds(
        "locations",
        locationsWithRefIds.map((loc) => loc.refId)
    );
    const nonExistentLocations = locationsWithRefIds.filter((_refId, idx) => {
        return !itemsExistBools[idx];
    });
    if (locationsWithRefIds.length) {
        await writeLocationsByRefIds(nonExistentLocations);
    }
    // Generate scraperRuns RefIds
    const locationsWithScraperRunIds = await addScraperRunIdsToLocations(
        locationsWithRefIds
    );
    // Write scraperRuns
    await writeScraperRunsByRefIds(locationsWithScraperRunIds, timestamp);

    // Generate appointment RefIds and filter on availability
    const locationsWithAllData = await addAppointmentsToLocations(
        locationsWithScraperRunIds
    );
    debug_log("locationsWithAllData", locationsWithAllData);
    writeAppointmentsByRefIds(locationsWithAllData);
}

/* 
    Utility that will return all availability for each location's most recent scraper run.
    This will go into a lambda.
*/
async function getAppointmentsForAllLocations() {}

module.exports = {
    addGeneratedIdsToLocations,
    checkItemExistsByRefId,
    checkItemsExistByRefIds,
    getAppointmentsForAllLocations,
    getAppointmentsByScraperRun,
    getAppointmentsByScraperRuns,
    deleteItemByRefId,
    deleteItemsByRefIds,
    generateLocationId,
    getScraperRunsByLocation,
    getScraperRunsByLocations,
    retrieveItemByRefId,
    retrieveItemsByRefIds,
    writeAppointmentsByRefId,
    writeAppointmentsByRefIds,
    writeLocationByRefId,
    writeLocationsByRefIds,
    writeScrapedData,
    writeScrapedDataBatch,
    writeScraperRunByRefId,
    writeScraperRunsByRefIds,
};
