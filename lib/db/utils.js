const dotenv = require("dotenv");
dotenv.config();

const faunadb = require("faunadb"),
    fq = faunadb.query;

const DEBUG = false; // set to false to disable debugging
function debugLog(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

const client = new faunadb.Client({ secret: process.env.FAUNA_DB });

async function faunaQuery(query) {
    try {
        debugLog(`trying to execute query ${JSON.stringify(query)}`);
        const res = await client.query(query);
        debugLog(
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
async function generateId() {
    return faunaQuery(fq.NewId());
}
/*
    Basic CRUD operations.
*/
async function retrieveItemByRefId(collectionName, refId) {
    return faunaQuery(
        fq.Get(fq.Ref(fq.Collection(collectionName), refId))
    ).then((res) => {
        debugLog(
            `querying ${collectionName} collection with refId ${refId} and got result ${JSON.stringify(
                res
            )}`
        );
        return res;
    });
}

/* returns null if the object doesn't exist */
async function retrieveItemByRefIdIfExists(collectionName, refId) {
    return faunaQuery(
        fq.If(
            fq.Exists(fq.Ref(fq.Collection(collectionName), refId)),
            fq.Get(fq.Ref(fq.Collection(collectionName), refId)),
            null
        )
    );
}

async function retrieveItemsByRefIds(collectionName, refIds) {
    const queries = refIds.map((refId) =>
        fq.Get(fq.Ref(fq.Collection(collectionName), refId))
    );
    return faunaQuery(queries).then((res) => {
        debugLog(
            `querying ${collectionName} collection with refIds ${refIds} and got result ${JSON.stringify(
                res
            )}`
        );
        return res;
    });
}

async function checkItemExistsByRefId(collectionName, refId) {
    return faunaQuery(fq.Exists(fq.Ref(fq.Collection(collectionName), refId)));
}

async function checkItemsExistByRefIds(collectionName, refIds) {
    const queries = refIds.map((refId) =>
        fq.Exists(fq.Ref(fq.Collection(collectionName), refId))
    );
    return faunaQuery(queries);
}

async function deleteItemByRefId(collectionName, refId) {
    return faunaQuery(fq.Delete(fq.Ref(fq.Collection(collectionName), refId)));
}

async function deleteItemsByRefIds(collectionName, refIds) {
    const queries = refIds.map((refId) =>
        fq.Delete(fq.Ref(fq.Collection(collectionName), refId))
    );
    return faunaQuery(queries);
}
module.exports = {
    /*********/
    faunaQuery,
    /*********/
    checkItemExistsByRefId,
    checkItemsExistByRefIds,
    debugLog,
    deleteItemByRefId,
    deleteItemsByRefIds,
    generateId,
    retrieveItemByRefId,
    retrieveItemsByRefIds,
    retrieveItemByRefIdIfExists,
};
