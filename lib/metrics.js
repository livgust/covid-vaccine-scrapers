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
async function logScraperRun(scraperName, isSuccess, duration, startTime) {
    return await Promise.all([
        logMetric(
            "ScraperRunSuccess",
            isSuccess ? 1 : 0,
            scraperName,
            startTime
        ),
        logMetric("ScraperRunDuration", duration, scraperName, startTime),
    ]);
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

module.exports = {
    logScraperRun,
};
