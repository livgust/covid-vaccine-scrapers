const dbUtils = require("./utils");
const { generateKey } = require("../../data/dataDefaulter");
const getGeocode = require("./../../getGeocode");
const faunadb = require("faunadb"),
    fq = faunadb.query;
const lodash = require("lodash");

const scraperUtils = {
    addGeneratedIdsToLocations,
    createOrGetParentLocationRefId,
    getAppointmentsForAllLocations,
    getAppointmentsByScraperRun,
    getAppointmentsByScraperRuns,
    generateLocationId,
    getScraperRunsByLocation,
    hashCode,
    writeAppointmentsEntries,
    writeLocationsByRefIds,
    writeParentScraperRun,
    writeScrapedData,
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

async function writeLocationsByRefIds(locationsWithRefIds) {
    const dataObjects = locationsWithRefIds.map((loc) => ({
        refId: loc.refId,
        data: {
            parentLocationRef: fq.Ref(
                fq.Collection("parentLocations"),
                loc.parentLocationRefId
            ),
            name: loc.name,
            address: {
                street: loc.address.street,
                city: loc.address.city,
                zip: loc.address.zip,
            },
            signUpLink: loc.signUpLink,
            latitude: loc.latitude,
            longitude: loc.longitude,
            extraData: loc.extraData,
            restrictions: loc.restrictions,
            massVax: loc.massVax,
        },
    }));
    return dbUtils.faunaQuery(
        fq.Map(
            dataObjects,
            fq.Lambda(
                "object",
                fq.Create(
                    fq.Ref(
                        fq.Collection("locations"),
                        fq.Select("refId", fq.Var("object"))
                    ),
                    {
                        data: fq.Select("data", fq.Var("object")),
                    }
                )
            )
        )
    );
}

async function writeScraperRunsByRefIds(scraperRuns) {
    const dataObjects = scraperRuns.map(
        ({
            refId,
            parentScraperRunRefId,
            locationRefId,
            timestamp,
            siteTimestamp,
        }) => ({
            ref: fq.Ref(fq.Collection("scraperRuns"), refId),
            data: {
                locationRef: fq.Ref(fq.Collection("locations"), locationRefId),
                parentScraperRunRef: fq.Ref(
                    fq.Collection("scraperRuns", parentScraperRunRefId)
                ),
                timestamp,
                siteTimestamp,
            },
        })
    );
    return dbUtils.faunaQuery(
        fq.Map(
            dataObjects,
            fq.Lambda(
                "scraperRun",
                fq.Create(fq.Select("ref", fq.Var("scraperRun")), {
                    data: fq.Select("data", fq.Var("scraperRun")),
                })
            )
        )
    );
}

async function writeAppointmentsEntries(appointmentsEntries) {
    const appointmentsObjects = appointmentsEntries.map((a) => ({
        scraperRunRef: fq.Ref(fq.Collection("scraperRuns"), a.scraperRunRefId),
        date: a.date,
        numberAvailable: a.numberAvailable,
        signUpLink: a.signUpLink,
        extraData: a.extraData,
    }));
    return dbUtils.faunaQuery(
        fq.Map(
            appointmentsObjects,
            fq.Lambda(
                "appointmentsEntry",
                fq.Create(fq.Collection("appointments"), {
                    data: fq.Var("appointmentsEntry"),
                })
            )
        )
    );
}

/*
    Index-based queries. This allows us to search our indexes (scraperRunsByLocation, appointmentsByScraperRun).
*/
async function getScraperRunsByLocation(locationRefId) {
    return dbUtils
        .faunaQuery(
            fq.Map(
                fq.Paginate(
                    fq.Match(
                        fq.Index("scraperRunsByLocationRefSortByTimestamp"),
                        fq.Ref(fq.Collection("locations"), locationRefId)
                    )
                ),
                fq.Lambda((x) => fq.Get(x))
            )
        )
        .then((res) => {
            dbUtils.debugLog(
                `for locationRefId ${locationRefId} got response ${JSON.stringify(
                    res
                )}`
            );
            return res;
        });
}

async function getAppointmentsByScraperRun(scraperRunRefId) {
    return dbUtils
        .faunaQuery(
            fq.Map(
                fq.Paginate(
                    fq.Match(
                        fq.Index("appointmentsByScraperRun"),
                        fq.Ref(fq.Collection("scraperRuns"), scraperRunRefId)
                    )
                ),
                fq.Lambda((x) => fq.Get(x))
            )
        )
        .then((res) => {
            dbUtils.debugLog(
                `for scraperRunRefId ${scraperRunRefId} got response ${JSON.stringify(
                    res
                )}`
            );
            return res;
        });
}

async function getAppointmentsByScraperRuns(scraperRunRefIds) {
    const queries = scraperRunRefIds.map((scraperRunRefId) =>
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
    return dbUtils.faunaQuery(queries).then((res) => {
        dbUtils.debugLog(
            `for scraperRunRefIds ${scraperRunRefIds} got response ${JSON.stringify(
                res
            )}`
        );
        return res;
    });
}

async function createOrGetParentLocationRefId(name) {
    return dbUtils
        .faunaQuery(
            fq.If(
                fq.Exists(fq.Match("parentLocationsByName", name)),
                fq.Get(fq.Match("parentLocationsByName", name)),
                fq.Create(fq.Collection("parentLocations"), {
                    data: { name: name },
                })
            )
        )
        .then((res) => res.ref.id);
}

async function writeParentScraperRun({ parentLocationRefId, timestamp }) {
    return dbUtils
        .faunaQuery(
            fq.Create(fq.Collection("parentScraperRuns"), {
                data: {
                    parentLocationRef: fq.Ref(
                        fq.Collection("parentLocations"),
                        parentLocationRefId
                    ),
                    timestamp,
                },
            })
        )
        .then((res) => res.ref.id);
}

/* 
    Utility that for one scraper output, writes to all the tables (locations, scraperRuns, and appointments).
    We will call this many times from scraper.js.
*/
async function writeScrapedData({
    parentLocationName,
    timestamp,
    individualLocationData,
}) {
    const parentLocationRefId = await scraperUtils.createOrGetParentLocationRefId(
        parentLocationName
    );

    const parentScraperRunRefId = await scraperUtils.writeParentScraperRun({
        parentLocationRefId,
        timestamp,
    });

    const locationsToWrite = [];
    const scraperRunsToWrite = [];
    const appointmentsEntriesToWrite = [];

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
            locationsToWrite.push({
                refId: locationRefId.toString(),
                parentLocationRefId,
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

        const scraperRunRefId = await dbUtils.generateId();
        scraperRunsToWrite.push({
            refId: scraperRunRefId,
            parentScraperRunRefId,
            locationRefId,
            timestamp,
            siteTimestamp,
        });

        if (hasAvailability && availability) {
            Object.entries(availability).map(
                async ([date, dateAvailability]) => {
                    if (
                        dateAvailability === true ||
                        (dateAvailability.hasAvailability &&
                            dateAvailability.numberAvailableAppointments > 0)
                    ) {
                        appointmentsEntriesToWrite.push({
                            scraperRunRefId,
                            date,
                            numberAvailable:
                                dateAvailability.numberAvailableAppointments,
                            signUpLink: dateAvailability.signUpLink,
                        });
                    }
                }
            );
        }
    }

    return Promise.all([
        scraperUtils.writeLocationsByRefIds(locationsToWrite),
        scraperUtils.writeScraperRunsByRefIds(scraperRunsToWrite),
        scraperUtils.writeAppointmentsEntries(appointmentsEntriesToWrite),
    ]);
}

/* 
    Utility that will return all availability for each location's most recent scraper run.
    This will go into a lambda.
*/
async function getAppointmentsForAllLocations() {}
