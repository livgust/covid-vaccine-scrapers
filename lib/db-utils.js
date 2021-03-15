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
async function generateId() {
    return client.query(q.NewId());
}

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

async function deleteLocationByRefId(id) {
    await client.query(q.Delete(q.Ref(q.Collection("locations"), id)));
}

async function retrieveLocationByRefId(id) {
    const result = await client.query(
        q.Get(q.Ref(q.Collection("locations"), id))
    );
    return result;
}

module.exports = {
    generateId,
    writeLocationByRefId,
    retrieveLocationByRefId,
    deleteLocationByRefId,
};
