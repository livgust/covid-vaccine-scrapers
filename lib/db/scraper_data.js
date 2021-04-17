const dbUtils = require("./utils");
const { generateKey } = require("../../data/dataDefaulter");
const getGeocode = require("./../../getGeocode");
const faunadb = require("faunadb"),
    fq = faunadb.query;
const lodash = require("lodash");
const moment = require("moment");

const scraperUtils = {
    addGeneratedIdsToLocations,
    createOrGetParentLocationRefId,
    getAppointmentsForAllLocations,
    getAppointmentsByScraperRun,
    getLocationsByParentLocation,
    getScraperRunsAndAppointmentsByParentScraperRun,
    getScraperRunsByParentScraperRun,
    generateLocationId,
    getScraperRunsByLocation,
    hashCode,
    updateLocationsByRefIds,
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

async function updateLocationsByRefIds(locationsWithRefIds) {
    const dataObjects = locationsWithRefIds.map((loc) => {
        const { refId, parentLocationRefId, ...restData } = loc;
        return {
            refId,
            data: {
                parentLocationRef: fq.Ref(
                    fq.Collection("parentLocations"),
                    parentLocationRefId
                ),
                ...restData,
            },
        };
    });
    return dbUtils.faunaQuery(
        fq.Map(
            dataObjects,
            fq.Lambda(
                "object",
                fq.Update(
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

async function writeLocationsByRefIds(locationsWithRefIds) {
    const dataObjects = locationsWithRefIds.map((loc) => {
        const { refId, parentLocationRefId, ...restData } = loc;
        return {
            refId,
            data: {
                parentLocationRef: fq.Ref(
                    fq.Collection("parentLocations"),
                    parentLocationRefId
                ),
                ...restData,
            },
        };
    });
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
                    fq.Collection("parentScraperRuns"),
                    parentScraperRunRefId
                ),
                timestamp: fq.Time(timestamp),
                siteTimestamp: siteTimestamp ? fq.Time(siteTimestamp) : null,
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
        availabilityWithNoNumbers: a.availabilityWithNoNumbers,
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
                    ),
                    { size: 10000 }
                ),
                fq.Lambda(["timestamp", "ref"], fq.Get(fq.Var("ref")))
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
                    ),
                    { size: 10000 }
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
            return res.data;
        });
}

async function createOrGetParentLocationRefId({ name, isChain }) {
    return dbUtils
        .faunaQuery(
            fq.If(
                fq.Exists(fq.Match("parentLocationsByName", name)),
                fq.Get(fq.Match("parentLocationsByName", name)),
                fq.Create(fq.Collection("parentLocations"), {
                    data: { name, isChain },
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
                    timestamp: fq.Time(timestamp),
                },
            })
        )
        .then((res) => res.ref.id);
}

async function getScraperRunsByParentScraperRun(parentScraperRunRefId) {
    return dbUtils
        .faunaQuery(
            fq.Map(
                fq.Paginate(
                    fq.Match(
                        "scraperRunsByParentScraperRunRef",
                        fq.Ref(
                            fq.Collection("parentScraperRuns"),
                            parentScraperRunRefId
                        )
                    ),
                    { size: 10000 }
                ),
                fq.Lambda((x) => fq.Get(x))
            )
        )
        .then((res) => res.data);
}

async function getLocationsByParentLocation(parentLocationRefId) {
    return dbUtils
        .faunaQuery(
            fq.Map(
                fq.Paginate(
                    fq.Match(
                        "locationsByParentLocationRef",
                        fq.Ref(
                            fq.Collection("parentLocations"),
                            parentLocationRefId
                        )
                    ),
                    { size: 10000 }
                ),
                fq.Lambda((x) => fq.Get(x))
            )
        )
        .then((res) => res.data);
}

async function getScraperRunsAndAppointmentsByParentScraperRun(
    parentScraperRunRefId
) {
    return dbUtils
        .faunaQuery(
            fq.Map(
                fq.Paginate(
                    fq.Match(
                        "scraperRunsByParentScraperRunRef",
                        fq.Ref(
                            fq.Collection("parentScraperRuns"),
                            parentScraperRunRefId
                        )
                    ),
                    { size: 10000 }
                ),
                fq.Lambda(
                    "sr",
                    fq.Let(
                        {
                            scraperRun: fq.Get(fq.Var("sr")),
                            appointments: fq.Select(
                                "data",
                                fq.Map(
                                    fq.Paginate(
                                        fq.Match(
                                            "appointmentsByScraperRun",
                                            fq.Var("sr")
                                        ),
                                        { size: 10000 }
                                    ),
                                    fq.Lambda("a", fq.Get(fq.Var("a")))
                                )
                            ),
                        },
                        {
                            scraperRun: fq.Var("scraperRun"),
                            appointments: fq.Var("appointments"),
                        }
                    )
                )
            )
        )
        .then((res) => res.data);
}

/* 
    Utility that for one scraper output, writes to all the tables (locations, scraperRuns, and appointments).
    We will call this many times from scraper.js.
*/
async function writeScrapedData({
    parentLocationName,
    isChain,
    timestamp,
    individualLocationData,
}) {
    console.log(
        `Writing scraped data: ${JSON.stringify({
            parentLocationName,
            isChain,
            timestamp,
            individualLocationData,
        })}`
    );
    /* PARENT LOCATION LOGIC */
    const parentLocationRefId = await scraperUtils.createOrGetParentLocationRefId(
        { name: parentLocationName, isChain }
    );

    /* PARENT SCRAPER RUN LOGIC */
    const parentScraperRunRefId = await scraperUtils.writeParentScraperRun({
        parentLocationRefId,
        timestamp,
    });

    const locationsToWrite = [];
    const locationsToUpdate = [];
    const scraperRunsToWrite = [];
    const appointmentsEntriesToWrite = [];

    for (const item of individualLocationData) {
        /* LOCATION LOGIC */
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
            totalAvailability,
            zip,
        } = item;
        const locationRefId = scraperUtils.generateLocationId({
            name,
            street,
            city,
            zip,
        });

        // check if there's an item for this location already.
        const existingLocationItem = await dbUtils.retrieveItemByRefIdIfExists(
            "locations",
            locationRefId
        );

        dbUtils.debugLog(
            `item ${locationRefId} exists: ${!!existingLocationItem}`
        );

        // if there isn't, make one.
        if (!existingLocationItem) {
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
            // if there is a location, check if we need to update the full object or a partial object
        } else {
            const {
                latitude,
                longitude,
                parentLocationRef,
                ...existingData
            } = {
                latitude: null, // in old entries, lat/long might not exist so we default to null so we can still destructure.
                longitude: null,
                parentLocationRef: null,
                ...existingLocationItem.data,
            };
            // if addresses are different or lat/long doesn't exist, we need to look up the lat/long again.
            if (
                JSON.stringify(existingData.address) !==
                    JSON.stringify({ street, city, zip }) ||
                !(latitude && longitude)
            ) {
                const locationData = await getGeocode.getGeocode(
                    name,
                    street,
                    zip
                );
                locationsToUpdate.push({
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
            } else if (
                JSON.stringify({
                    parentLocationRefId: parentLocationRef?.id,
                    ...existingData,
                }) !==
                JSON.stringify({
                    parentLocationRefId: parentLocationRefId,
                    name,
                    address: {
                        street,
                        city,
                        zip,
                    },
                    signUpLink,
                    extraData,
                    restrictions,
                    massVax,
                })
            ) {
                locationsToUpdate.push({
                    // don't push the lat/long or address fields; let them stay as-is in the DB since the address hasn't changed
                    refId: locationRefId.toString(),
                    parentLocationRefId,
                    name,
                    signUpLink,
                    extraData,
                    restrictions,
                    massVax,
                });
            }
        }

        /* SCRAPER RUN LOGIC */
        const scraperRunRefId = await dbUtils.generateId();
        scraperRunsToWrite.push({
            refId: scraperRunRefId,
            parentScraperRunRefId,
            locationRefId: locationRefId.toString(),
            timestamp,
            siteTimestamp,
        });

        /* APPOINTMENTS LOGIC */
        // we only write to the appointments table if there is availability.
        if (hasAvailability) {
            // if we have availability by date, write an entry per date.
            if (Object.keys(availability || {}).length) {
                Object.entries(availability).map(
                    async ([date, dateAvailability]) => {
                        if (
                            dateAvailability === true ||
                            (dateAvailability.hasAvailability &&
                                (signUpLink || dateAvailability?.signUpLink))
                        ) {
                            appointmentsEntriesToWrite.push({
                                scraperRunRefId,
                                date,
                                availabilityWithNoNumbers: !dateAvailability.numberAvailableAppointments,
                                numberAvailable:
                                    dateAvailability.numberAvailableAppointments,
                                signUpLink: dateAvailability.signUpLink,
                                extraData: dateAvailability.extraData,
                            });
                        }
                    }
                );
                // if we don't have availability by date, write an empty row signalling that
                // there is availability but we don't know when or how many.
            } else {
                appointmentsEntriesToWrite.push({
                    scraperRunRefId,
                    availabilityWithNoNumbers: !totalAvailability,
                    numberAvailable: totalAvailability,
                });
            }
        }
    }

    await Promise.all([
        scraperUtils.writeLocationsByRefIds(locationsToWrite),
        scraperUtils.updateLocationsByRefIds(locationsToUpdate),
        scraperUtils.writeScraperRunsByRefIds(scraperRunsToWrite),
        scraperUtils.writeAppointmentsEntries(appointmentsEntriesToWrite),
    ]);
    return {
        parentLocationRefId,
        parentScraperRunRefId,
    };
}

/* 
    Utility that will return all availability for each location's most recent scraper run.
    This will go into a lambda.
*/
async function getAppointmentsForAllLocations() {
    /* query returns structure like:
     {
         parentLocations: [
             {
                parentLocation: { },
                parentScraperRun: { },
                locations: [
                    location: { },
                    scraperRun: { },
                    appointments: [ { } ],
                ],
             },
         ],
     }
     */
    const queryResults = await dbUtils.faunaQuery(
        fq.Let(
            {
                parentLocationRefs: fq.Paginate(
                    fq.Documents(fq.Collection("parentLocations")),
                    { size: 1000 }
                ),
            },
            {
                parentLocations: fq.Select(
                    "data",
                    fq.Map(
                        fq.Var("parentLocationRefs"),
                        fq.Lambda(
                            "parentLocationRef",
                            fq.Let(
                                {
                                    parentScraperRun: fq.If(
                                        fq.Exists(
                                            fq.Match(
                                                "parentScraperRunsByParentLocationRefSortByTimestamp",
                                                fq.Var("parentLocationRef")
                                            )
                                        ),
                                        fq.Get(
                                            fq.Match(
                                                "parentScraperRunsByParentLocationRefSortByTimestamp",
                                                fq.Var("parentLocationRef")
                                            )
                                        ),
                                        null
                                    ),
                                },
                                {
                                    parentLocation: fq.Get(
                                        fq.Var("parentLocationRef")
                                    ),
                                    parentScraperRun: fq.Var(
                                        "parentScraperRun"
                                    ),
                                    locations: fq.Select(
                                        "data",
                                        fq.Map(
                                            fq.Paginate(
                                                fq.Match(
                                                    "locationsByParentLocationRef",
                                                    fq.Var("parentLocationRef")
                                                ),
                                                { size: 1000 }
                                            ),
                                            fq.Lambda(
                                                "locationRef",
                                                fq.Let(
                                                    {
                                                        scraperRun: fq.Select(
                                                            ["data", 0],
                                                            fq.Filter(
                                                                fq.Map(
                                                                    fq.Paginate(
                                                                        fq.Match(
                                                                            "scraperRunsByParentScraperRunRef",
                                                                            fq.Select(
                                                                                "ref",
                                                                                fq.Var(
                                                                                    "parentScraperRun"
                                                                                )
                                                                            )
                                                                        ),
                                                                        {
                                                                            size: 1000,
                                                                        }
                                                                    ),
                                                                    fq.Lambda(
                                                                        "x",
                                                                        fq.Get(
                                                                            fq.Var(
                                                                                "x"
                                                                            )
                                                                        )
                                                                    )
                                                                ),
                                                                fq.Lambda(
                                                                    "potentialRun",
                                                                    fq.Equals(
                                                                        fq.Select(
                                                                            [
                                                                                "data",
                                                                                "locationRef",
                                                                            ],
                                                                            fq.Var(
                                                                                "potentialRun"
                                                                            ),
                                                                            null
                                                                        ),
                                                                        fq.Var(
                                                                            "locationRef"
                                                                        )
                                                                    )
                                                                )
                                                            ),
                                                            null
                                                        ),
                                                    },
                                                    {
                                                        location: fq.Get(
                                                            fq.Var(
                                                                "locationRef"
                                                            )
                                                        ),
                                                        scraperRun: fq.Var(
                                                            "scraperRun"
                                                        ),
                                                        appointments: fq.Select(
                                                            "data",
                                                            fq.If(
                                                                fq.IsObject(
                                                                    fq.Var(
                                                                        "scraperRun"
                                                                    )
                                                                ),
                                                                fq.Map(
                                                                    fq.Paginate(
                                                                        fq.Match(
                                                                            "appointmentsByScraperRun",
                                                                            fq.Select(
                                                                                "ref",
                                                                                fq.Var(
                                                                                    "scraperRun"
                                                                                )
                                                                            )
                                                                        ),
                                                                        {
                                                                            size: 100,
                                                                        }
                                                                    ),
                                                                    fq.Lambda(
                                                                        "x",
                                                                        fq.Get(
                                                                            fq.Var(
                                                                                "x"
                                                                            )
                                                                        )
                                                                    )
                                                                ),
                                                                null
                                                            ),
                                                            null
                                                        ),
                                                    }
                                                )
                                            )
                                        )
                                    ),
                                }
                            )
                        )
                    )
                ),
            }
        )
    );
    const mappedLocations = queryResults.parentLocations.map(
        (parentLocationEntry) =>
            parentLocationEntry.locations.map((locationEntry) => ({
                id: locationEntry.location.ref.id,
                parentId: parentLocationEntry.parentLocation.ref.id,
                name: locationEntry.location.data.name,
                street: locationEntry.location.data.address?.street,
                city: locationEntry.location.data.address?.city,
                zip: locationEntry.location.data.address?.zip,
                latitude: locationEntry.location.data.latitude,
                longitude: locationEntry.location.data.longitude,
                timestamp:
                    locationEntry.scraperRun?.data.timestamp.value ||
                    parentLocationEntry.parentScraperRun?.data.timestamp.value,
                // only set totalAvailability if we have one appointment entry for overall availability
                // (no date is set for this entry but we don't double-check that here)
                totalAvailability:
                    locationEntry.appointments?.length === 1 &&
                    locationEntry.appointments[0].totalAvailability,
                availability: (locationEntry.appointments || []).reduce(
                    (obj, entry) => {
                        const apptDate = entry.data.date;
                        if (apptDate && !obj[apptDate]) {
                            obj[apptDate] = {
                                hasAvailability:
                                    !!entry.data.numberAvailable ||
                                    !!entry.data.availabilityWithNoNumbers,
                                numberAvailableAppointments:
                                    entry.data.numberAvailable,
                                signUpLink: entry.data.signUpLink,
                                extraData: entry.data.extraData,
                            };
                        } else if (apptDate) {
                            obj[apptDate] = {
                                ...obj[apptDate],
                                hasAvailability:
                                    obj[apptDate].hasAvailability ||
                                    entry.data.availabilityWithNoNumbers,
                                numberAvailableAppointments: entry.data
                                    .numberAvailable
                                    ? (obj[apptDate]
                                          .numberAvailableAppointments || 0) +
                                      entry.data.numberAvailable
                                    : null,
                            };
                        }
                        return obj;
                    },
                    {}
                ),
                hasAvailability: !!locationEntry.appointments?.length,
                signUpLink: locationEntry.location.data.signUpLink || null,
                restrictions: locationEntry.location.data.restrictions || null,
                extraData: locationEntry.location.data.extraData || null,
            }))
    );
    let locationList = [];
    // change from array of arrays to array.
    mappedLocations.forEach((loc) => {
        if (loc.length) {
            locationList.push(...loc);
        }
    });
    return {
        source: "Fauna",
        version: "2",
        timestamp: moment().format(),
        results: locationList,
    };
}
