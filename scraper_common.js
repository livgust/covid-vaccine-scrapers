const dotenv = require("dotenv");
//note: this only works locally; in Lambda we use environment variables set manually
dotenv.config();

const chromium = require("chrome-aws-lambda");
const { addExtra } = require("puppeteer-extra");
const Puppeteer = addExtra(chromium.puppeteer);

const { getAllCoordinates } = require("./getGeocode");
const {
    logGlobalMetric,
    logScraperRun,
    getTotalNumberOfAppointments,
} = require("./lib/metrics");
const dataDefaulter = require("./data/dataDefaulter");
const fetch = require("node-fetch");
const file = require("./lib/file");
const Recaptcha = require("puppeteer-extra-plugin-recaptcha");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const s3 = require("./lib/s3");
const { writeScrapedData } = require("./lib/db/scraper_data");
const moment = require("moment");
const AWS = require("aws-sdk");
const { Lambda } = require("faunadb");
const alertsLambda = new AWS.Lambda();
const { scrapersToSkip } = require("./scraper_config");
const WRITE_TO_FAUNA = true;

async function execute(usePuppeteer, scrapers) {
    const globalStartTime = new Date();

    let browser = null;
    if (usePuppeteer) {
        Puppeteer.use(StealthPlugin());

        Puppeteer.use(
            Recaptcha({
                provider: { id: "2captcha", token: process.env.RECAPTCHATOKEN },
            })
        );

        browser = process.env.DEVELOPMENT
            ? await Puppeteer.launch({
                  executablePath: process.env.CHROMEPATH,
                  headless: true,
              })
            : await Puppeteer.launch({
                  args: chromium.args,
                  defaultViewport: chromium.defaultViewport,
                  executablePath: await chromium.executablePath,
                  headless: chromium.headless,
                  ignoreHTTPSErrors: true,
              });
    }

    const gatherData = async () => {
        const results = [];
        for (const scraper of scrapers) {
            if (scrapersToSkip.indexOf(scraper.name) !== -1) {
                console.log(
                    "Skipping... " + scraper.name + " (see scraper_config.js)"
                );
                continue;
            }

            const startTime = new Date();
            let isSuccess = true;
            const returnValue = await scraper.run(browser).catch((error) => {
                //print out the issue but don't fail, this way we still publish updates
                //for other locations even if this website's scrape doesn't work
                console.log(error);
                isSuccess = false;
                return null;
            });
            const numberAppointments = getTotalNumberOfAppointments(
                returnValue?.individualLocationData
            );
            await logScraperRun(
                scraper.name,
                isSuccess,
                new Date() - startTime,
                startTime,
                numberAppointments
            );

            // Add the parentLocation's timestamp to each individual location
            returnValue?.individualLocationData.map((loc) => {
                loc.timestamp = returnValue.timestamp;
            });

            // Save the individualLocationData for the out.json file.
            results.push(returnValue?.individualLocationData);

            // Coerce the results into the format we want.
            let returnValueArray = [];
            if (Array.isArray(returnValue?.individualLocationData)) {
                returnValueArray = returnValue.individualLocationData;
            } else if (returnValue?.individualLocationData) {
                returnValueArray = [returnValue.individualLocationData];
            }
            // Write the data to FaunaDB.
            if (WRITE_TO_FAUNA && process.env.FAUNA_DB) {
                try {
                    if (returnValue) {
                        console.log(JSON.stringify(returnValue));
                        await writeScrapedData(returnValue).then(
                            ({
                                parentLocationRefId,
                                parentScraperRunRefId,
                            }) => {
                                if (process.env.NODE_ENV === "production") {
                                    alertsLambda.invoke(
                                        {
                                            FunctionName:
                                                process.env.ALERTSFUNCTIONNAME,
                                            InvocationType: "Event",
                                            Payload: JSON.stringify({
                                                parentLocationRefId,
                                                parentScraperRunRefId,
                                            }),
                                        },
                                        () => {}
                                    );
                                } else {
                                    console.log(
                                        "would call alerting function with the following args:"
                                    );
                                    console.log({
                                        parentLocationRefId,
                                        parentScraperRunRefId,
                                    });
                                }
                            }
                        );
                    }
                } catch (e) {
                    console.error("Failed to write to Fauna, got error:", e);
                }
            }
        }
        if (usePuppeteer) {
            await browser.close();
        }
        let scrapedResultsArray = [];
        for (const result of results) {
            if (Array.isArray(result)) {
                scrapedResultsArray.push(...result);
            } else if (result) {
                //ignore nulls
                scrapedResultsArray.push(result);
            }
        }

        let cachedResults;
        if (process.env.NODE_ENV !== "test") {
            cachedResults = await fetch(
                "https://mzqsa4noec.execute-api.us-east-1.amazonaws.com/prod"
            )
                .then((res) => res.json())
                .then((unpack) => JSON.parse(unpack.body).results);
        }
        let finalResultsArray = [];
        if (process.argv.length <= 2) {
            // Only add default data if we're not testing individual scrapers.
            // We are not passing in the optional 3rd arg of mergeResults;
            // this means that there is no time limit on stale data being merged in.
            finalResultsArray = dataDefaulter.mergeResults(
                scrapedResultsArray,
                cachedResults
            );
        } else {
            finalResultsArray = scrapedResultsArray;
        }

        const responseJson = {
            // Version number of the file
            version: 1,

            // Timestamp for the archived data.json file.
            timestamp: s3.getTimestampForFile(),

            // Add geocoding for all locations
            results: await getAllCoordinates(finalResultsArray, cachedResults),
        };
        logGlobalMetric(
            usePuppeteer ? "SuccessfulRun" : "SuccessfulNoBrowserRun",
            1,
            new Date()
        );
        logGlobalMetric(
            usePuppeteer ? "Duration" : "NoBrowserDuration",
            new Date() - globalStartTime,
            new Date()
        );
        const webData = JSON.stringify(responseJson, null, 2);
        if (process.env.NODE_ENV !== "production") {
            const outFile = usePuppeteer ? "out.json" : "out_no_browser.json";
            console.log(
                "The data that would be published is in '" + outFile + "'"
            );
            file.write(outFile, webData);
            return responseJson;
        } else {
            const uploadResponse = await s3.saveWebData(
                webData,
                responseJson.timestamp
            );
            return uploadResponse;
        }
    };
    return await gatherData();
}

module.exports = { execute };
