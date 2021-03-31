const { CloudWatch } = require("aws-sdk");

const config = {
    credentials: {
        accessKeyId: process.env.AWSACCESSKEYID,
        secretAccessKey: process.env.AWSSECRETACCESSKEY,
    },
    region: "us-east-1",
};

const client = new CloudWatch(
    process.env.NODE_ENV === "production" ? null : config //only need config in dev environment
);

//duration is in ms
async function logScraperRun(
    scraperName,
    isSuccess,
    duration,
    startTime,
    numberAppointments
) {
    return await Promise.all([
        logMetric(
            "ScraperRunSuccess",
            isSuccess ? 1 : 0,
            scraperName,
            startTime
        ),
        logMetric("ScraperRunDuration", duration, scraperName, startTime),
        isSuccess
            ? logMetric(
                  "ScraperRunAppointmentNumber",
                  numberAppointments,
                  scraperName,
                  startTime
              )
            : Promise.resolve(),
    ]);
}

async function logGlobalMetric(metricName, value, timestamp) {
    const params = {
        MetricData: [
            {
                MetricName: metricName, //string
                Value: value, //number
                Dimensions: [
                    {
                        Name: "Environment",
                        Value:
                            process.env.NODE_ENV === "production"
                                ? "prod"
                                : "dev",
                    },
                ],
                StorageResolution: 1, //high-res metric
                Timestamp: timestamp || new Date(), //Date
            },
        ], //MetricDatum
        Namespace: "MA-Covid-Vaccine-Scrapers", //string
    };
    return await new Promise((resolve, reject) =>
        client.putMetricData(params, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    ).catch((e) => {
        console.error(`COULD NOT SEND METRIC ${metricName}! Error: ${e}`);
        console.error(e);
    });
}

async function logMetric(metricName, value, scraperName, timestamp) {
    const params = {
        MetricData: [
            {
                MetricName: metricName, //string
                Value: value, //number
                Dimensions: [
                    {
                        Name: "ScraperName",
                        Value: scraperName,
                    },
                    {
                        Name: "Environment",
                        Value:
                            process.env.NODE_ENV === "production"
                                ? "prod"
                                : "dev",
                    },
                ],
                StorageResolution: 1, //high-res metric
                Timestamp: timestamp || new Date(), //Date
            },
        ], //MetricDatum
        Namespace: "MA-Covid-Vaccine-Scrapers", //string
    };
    return await new Promise((resolve, reject) =>
        client.putMetricData(params, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    ).catch((e) => {
        console.error(
            `COULD NOT SEND METRIC ${metricName} for scraper ${scraperName}! Error: ${e}`
        );
        console.error(e);
    });
}

function getTotalNumberOfAppointments(scraperResult) {
    let totalNumberAppointments = 0;
    const numberAppointments = (item) => {
        let ret = 0;
        if (
            item?.hasAvailability &&
            item?.availability &&
            Object.keys(item.availability).length
        ) {
            ret = Object.values(item.availability).reduce(
                (cum, cur) =>
                    cum +
                    (cur.signUpLink || item.signUpLink //don't count locations without sign-up links as "available"
                        ? cur.numberAvailableAppointments || 0
                        : 0),
                0
            );
        } else if (item?.hasAvailability) {
            ret = 1;
        }
        return ret;
    };
    if (Array.isArray(scraperResult)) {
        totalNumberAppointments = scraperResult.reduce(
            (cum, cur) => cum + numberAppointments(cur),
            0
        );
    } else {
        totalNumberAppointments = numberAppointments(scraperResult);
    }
    return totalNumberAppointments;
}

module.exports = {
    logGlobalMetric,
    logScraperRun,
    getTotalNumberOfAppointments,
};
