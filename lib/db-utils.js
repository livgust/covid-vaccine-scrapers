const dotenv = require("dotenv");
dotenv.config();
const { generateKey } = require("../data/dataDefaulter");
const faunadb = require("faunadb"),
    q = faunadb.query;

var client = new faunadb.Client({ secret: process.env.FAUNADB });

/* 
    General utility methods, used just within db-utils and test file.
*/
async function faunaQuery(query) {
    try {
        const res = await client.query(query);
        return res;
    } catch (error) {
        // Keeping this log here for debugging purposes.
        // console.log(`for query ${JSON.stringify(query)}, got error ${error}`);
        // console.log(error.description);
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
    return faunaQuery(q.NewId());
}

function generateLocationId({ name, street, city, zip }) {
    // This deterministically generates a key from the location info.
    const keyString = generateKey({ name, street, city, zip });
    // FaunaDB only accepts positive ref ids, so we make it positive.
    const hash = Math.abs(hashCode(keyString));
    return hash;
}

/*
    Basic CRUD operations.
*/
async function retrieveItemByRefId(collectionName, refId) {
    const result = await faunaQuery(
        q.Get(q.Ref(q.Collection(collectionName), refId))
    );
    // console.log(
    //     `querying ${collectionName} collection with refId ${refId} and got result ${JSON.stringify(
    //         result
    //     )}`
    // );
    return result;
}

async function deleteItemByRefId(collectionName, refId) {
    await faunaQuery(q.Delete(q.Ref(q.Collection(collectionName), refId)));
}

async function writeLocationByRefId({
    refId,
    name,
    address: { street, city, zip },
    signUpLink,
    latitude,
    longitude,
}) {
    await faunaQuery(
        q.Create(q.Ref(q.Collection("locations"), refId), {
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
            },
        })
    );
}

async function writeScraperRunByRefId({ refId, locationRefId, timestamp }) {
    await faunaQuery(
        q.Create(q.Ref(q.Collection("scraperRuns"), refId), {
            data: {
                locationRef: q.Ref(q.Collection("locations"), locationRefId),
                timestamp,
            },
        })
    );
}

async function writeAppointmentsByRefId({
    refId,
    scraperRunRefId,
    date,
    numberAvailable,
    signUpLink,
    extraData,
}) {
    await faunaQuery(
        q.Create(q.Ref(q.Collection("appointments"), refId), {
            data: {
                scraperRunRef: q.Ref(
                    q.Collection("scraperRuns"),
                    scraperRunRefId
                ),
                date,
                numberAvailable,
                signUpLink,
                extraData,
            },
        })
    );
}

/*
    Index-based queries. This allows us to search our indexes (scraperRunsByLocation, appointmentsByScraperRun).
*/
async function getScaperRunsByLocation(locationRefId) {
    const scraperRuns = await faunaQuery(
        q.Map(
            q.Paginate(
                q.Match(
                    q.Index("scraperRunsByLocation"),
                    q.Ref(q.Collection("locations"), locationRefId)
                )
            ),
            q.Lambda((x) => q.Get(x))
        )
    );
    // console.log(
    //     `for locationRefId ${locationRefId} got response ${JSON.stringify(
    //         scraperRuns
    //     )}`
    // );
    return scraperRuns;
}

async function getAppointmentsByScraperRun(scraperRunRefId) {
    const appointments = await faunaQuery(
        q.Map(
            q.Paginate(
                q.Match(
                    q.Index("appointmentsByScraperRun"),
                    q.Ref(q.Collection("scraperRuns"), scraperRunRefId)
                )
            ),
            q.Lambda((x) => q.Get(x))
        )
    );
    // console.log(
    //     `for scraperRunRefId ${scraperRunRefId} got response ${JSON.stringify(
    //         appointments
    //     )}`
    // );
    return appointments;
}

/* 
    Utility that for one scraper output, writes to all the tables (locations, scraperRuns, and appointments).
    We will call this many times from main.js.
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
    latitude,
    longitude,
    signUpLink,
}) {
    const locationRefId = generateLocationId({ name, street, city, zip });
    try {
        await retrieveItemByRefId("locations", locationRefId);
    } catch (e) {
        if (e.message === "instance not found") {
            await writeLocationByRefId({
                refId: locationRefId,
                name,
                address: {
                    street,
                    city,
                    zip,
                },
                signUpLink,
                latitude,
                longitude,
            });
        }
    }

    const scraperRunRefId = await generateId();
    await writeScraperRunByRefId({
        refId: scraperRunRefId,
        locationRefId,
        timestamp,
    });

    if (hasAvailability && availability) {
        Object.entries(availability).map(async ([date, dateAvailability]) => {
            if (
                dateAvailability.hasAvailability &&
                dateAvailability.numberAvailableAppointments > 0
            ) {
                const appointmentsRefId = await generateId();
                await writeAppointmentsByRefId({
                    refId: appointmentsRefId,
                    scraperRunRefId,
                    date,
                    numberAvailable:
                        dateAvailability.numberAvailableAppointments,
                    signUpLink: dateAvailability.signUpLink || signUpLink,
                    extraData,
                });
            }
        });
    }
}

/* 
    Utility that will return all availability for each location's most recent scraper run.
    This will go into a lambda.
*/
async function getAppointmentsForAllLocations() {}

module.exports = {
    getAppointmentsForAllLocations,
    getAppointmentsByScraperRun,
    deleteItemByRefId,
    generateLocationId,
    getScaperRunsByLocation,
    retrieveItemByRefId,
    writeAppointmentsByRefId,
    writeLocationByRefId,
    writeScrapedData,
    writeScraperRunByRefId,
};
