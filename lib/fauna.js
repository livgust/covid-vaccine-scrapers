const dotenv = require("dotenv");
const moment = require("moment");
const { map } = require("../site-scrapers");
dotenv.config();

const faunadb = require("faunadb"),
    q = faunadb.query;

var client = new faunadb.Client({ secret: process.env.FAUNADB });

async function faunaQuery(query) {
    try {
        return await client.query(query);
    } catch (error) {
        console.log(error);
    }
}

function listResults(response) {
    let results = {};
    if (!response.data.length) {
        console.log("No results");
    }

    response.data.map((x) => {
        if (x.data.locations) {
            let sumAllLocations = 0;
            x.data.locations.map((y) => {
                sumAllLocations += sumAvailability(y.availability);
            });
            results[x.ts] = sumAllLocations;
        } else {
            results[x.ts] = sumAvailability(x.data.availability);
        }
    });

    return results;
}

async function createDocumentForWebdata(webData) {
    return await faunaQuery(
        q.Create(q.Collection("WebData"), {
            data: webData,
        })
    );
}

async function createDocumentForWebdataBackfill(webData) {
    return await faunaQuery(
        q.Insert(
            q.Ref(q.Collection("WebData"), q.NewId()),
            q.Time("2021-03-01T00:00:00Z"),
            "create",
            {
                data: webData,
            }
        )
    );
}

async function getAvailabilityDataForSite(siteName) {
    const response = await faunaQuery(
        q.Map(
            q.Paginate(q.Match(q.Index("webdata_by_name"), siteName)),
            q.Lambda((x) => q.Get(x))
        )
    );
    const results = listResults(response);
    return results;
}

function sumAvailability(availability) {
    let sum = 0;
    for (const i in availability) {
        sum += availability[i].numAvailableAppointments;
    }
    return sum;
}

(async () => {
    const webData = {
        name: "Wegmans",
        availability: {},
    };

    webData.availability["2021-03-09"] = {
        hasAvailability: true,
        numAvailableAppointments: Math.floor(Math.random() * Math.floor(20)),
    };

    //const createResult = await createDocumentForWebdata(webData);
    const createResult = await createDocumentForWebdataBackfill(webData);

    // list availability counts for wegmans
    // select * from webdata where 'name' = 'wegmans'

    const results = await getAvailabilityDataForSite("Wegmans");
    for (const i in results) {
        console.log(
            moment(i / 1000)
                .utc()
                .format("YYYY-MM-DD HH:mm:ss") +
                " " +
                results[i]
        );
    }
    process.exit();
})();
