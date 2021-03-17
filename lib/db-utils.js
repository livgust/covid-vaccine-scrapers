const dotenv = require("dotenv");
dotenv.config();
const { generateKey } = require("../data/dataDefaulter");
const faunadb = require("faunadb"),
    q = faunadb.query;

var client = new faunadb.Client({ secret: process.env.FAUNADB });

async function faunaQuery(query) {
    try {
        const res = await client.query(query);
        return res;
    } catch (error) {
        // Keeping this log here for debugging purposes.
        console.log(`for query ${JSON.stringify(query)}, got error ${error}`);
        console.log(error.description);
        throw error;
    }
}

async function deleteItemByRefId(collectionName, refId) {
    await faunaQuery(q.Delete(q.Ref(q.Collection(collectionName), refId)));
}

async function generateId() {
    return faunaQuery(q.NewId());
}

// Taken from: https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0
function hashCode(s) {
    var h = 0,
        l = s.length,
        i = 0;
    if (l > 0) while (i < l) h = ((h << 5) - h + s.charCodeAt(i++)) | 0;
    return h;
}

function generateLocationId({ name, street, city, zip }) {
    // uses the name and location info to generate a key
    const keyString = generateKey({ name, street, city, zip });

    // FaunaDB only accepts positive ref ids, so we make it positive.
    const hash = Math.abs(hashCode(keyString));
    return hash;
}

async function retrieveItemByRefId(collectionName, refId) {
    const result = await faunaQuery(
        q.Get(q.Ref(q.Collection(collectionName), refId))
    );
    console.log(
        `querying ${collectionName} collection with refId ${refId} and got result ${JSON.stringify(
            result
        )}`
    );
    return result;
}

async function replaceLocationByRefId({
    refId,
    name,
    address: { street, city, zip },
    signUpLink,
}) {
    await faunaQuery(
        q.Replace(q.Ref(q.Collection("locations"), refId), {
            data: {
                name,
                address: {
                    street,
                    city,
                    zip,
                },
                signUpLink,
            },
        })
    );
}

async function writeLocationByRefId({
    refId,
    name,
    address: { street, city, zip },
    signUpLink,
    latitude,
    longitude,
}) {
    console.log(`writing location with refid ${refId} to locations table...`);
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

    // now, the location is in there and correct, so we can add a scraper run
    const scraperRunRefId = await generateId();
    await writeScraperRunByRefId({
        refId: scraperRunRefId,
        locationRefId,
        timestamp,
    });

    // for each availabaility where hasAvailability = true and num > 0, add to appointments collection
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

async function getScaperRunsByLocation(locationRefId) {
    const scraperRuns = await faunaQuery(
        q.Map(
            q.Paginate(
                q.Match(
                    q.Index("scraperRunsByLocation"),
                    q.Ref(q.Collection("locations"), locationRefId)
                )
            ),
            q.Lambda("scraperRun", q.Get(q.Var("scraperRun")))
        )
    );
    console.log(
        `for locationRefId ${locationRefId} got response ${JSON.stringify(
            scraperRuns
        )}`
    );
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
            q.Lambda("appointment", q.Get(q.Var("appointment")))
        )
    );
    console.log(
        `for scraperRunRefId ${scraperRunRefId} got response ${JSON.stringify(
            appointments
        )}`
    );
    return appointments;
}

// TODO
// - Q: how do we enforce types (that every scraper outputs all the info we need)?
// - A: see her branch with the types (results-shape-test)
// other ideas:
// https://medium.com/javascript-scene/you-might-not-need-typescript-or-static-types-aa7cb670a77b
// https://stackoverflow.com/questions/8407622/set-type-for-function-parameters - JSdoc?

/* Move to separate file, to show this is what the lambda uses, and returns as a JSON object to the frontend */
async function getAvailabilityForAllLocations() {
    // TODO: using the util methods or a new query, do the following:
    // get all locations from LocationTable (will return locationRefIds)
    // for every locationID, get the most recent scraper run()
    // for that scraper run id, get the availability (appointmentsByScraperRun)
    // put this into another lambda - called whenever somebody pings the website. we'll want to cache

    // this will be harder to test! b/c it depends on all rows in Locations table...
}
module.exports = {
    getAppointmentsByScraperRun,
    deleteItemByRefId,
    generateLocationId,
    getScaperRunsByLocation,
    retrieveItemByRefId,
    replaceLocationByRefId,
    writeAppointmentsByRefId,
    writeLocationByRefId,
    writeScrapedData,
    writeScraperRunByRefId,
};
