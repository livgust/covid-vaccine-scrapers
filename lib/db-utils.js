const dotenv = require("dotenv");
dotenv.config();
const faunadb = require("faunadb"),
    q = faunadb.query;

var client = new faunadb.Client({ secret: process.env.FAUNADB });

/*
Functions/operations we'll want:
- add/fetch appointment availability for a given date to `appointments`, linked to a scraper run
- add/fetch a scraper run to scraperRuns, linked to a location
- add/fetch a location's info

Once we implement the helper functions, we should try this:
From one scraper run (East Boston), write to each of the 3 tables:
- location
- scraper run
- appointment availability

*/

async function deleteItemByRefId(collectionName, refId) {
    await client.query(q.Delete(q.Ref(q.Collection(collectionName), refId)));
}

// note: instead of generating an ID here, we might want to store this in each scraper's config file
async function generateId() {
    return client.query(q.NewId());
}

async function retrieveItemByRefId(collectionName, refId) {
    const result = await client.query(
        q.Get(q.Ref(q.Collection(collectionName), refId))
    );
    return result;
}

// keeping this table-specific for now, b/c of required input types
async function replaceLocationByRefId({
    id,
    name,
    address: { street, city, zip },
    signupLink,
}) {
    await client.query(
        q.Replace(q.Ref(q.Collection("locations"), id), {
            data: {
                name,
                address: {
                    street,
                    city,
                    zip,
                },
                signupLink,
            },
        })
    );
}

// keeping this table-specific for now, b/c of required input types
async function writeLocationByRefId({
    id,
    name,
    address: { street, city, zip },
    signupLink,
}) {
    await client.query(
        q.Create(q.Ref(q.Collection("locations"), id), {
            data: {
                name,
                address: {
                    street,
                    city,
                    zip,
                },
                signupLink,
            },
        })
    );
}

module.exports = {
    deleteItemByRefId,
    generateId,
    retrieveItemByRefId,
    replaceLocationByRefId,
    writeLocationByRefId,
};
