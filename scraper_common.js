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
const dbUtils = require("./lib/db-utils");
const moment = require("moment");

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
                returnValue
            );
            await logScraperRun(
                scraper.name,
                isSuccess,
                new Date() - startTime,
                startTime,
                numberAppointments
            );
            results.push(returnValue);
            // Coerce the results into the format we want.
            let returnValueArray = [];
            if (Array.isArray(returnValue)) {
                returnValueArray = returnValue;
            } else if (returnValue) {
                returnValueArray = [returnValue];
            }
            // Write the data to FaunaDB.
            if (WRITE_TO_FAUNA && process.env.FAUNA_DB) {
                try {
                    await Promise.all(
                        returnValueArray.map(async (res) => {
                            await dbUtils.writeScrapedData({
                                name: res.name,
                                street: res.street,
                                city: res.city,
                                zip: res.zip,
                                bookableAppointmentsFound: numberAppointments,
                                availability: res.availability,
                                hasAvailability: res.availability,
                                extraData: res.extraData,
                                timestamp: moment().utc().format(),
                                signUpLink: res.signUpLink,
                                restrictions: res.restrictions,
                                massVax: res.massVax,
                                siteTimestamp: res.siteTimestamp
                                    ? JSON.parse(
                                          JSON.stringify(res.siteTimestamp)
                                      )
                                    : null,
                            });
                        })
                    );
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

        const cachedResults = await fetch(
            "https://mzqsa4noec.execute-api.us-east-1.amazonaws.com/prod"
        )
            .then((res) => res.json())
            .then((unpack) => JSON.parse(unpack.body).results);

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

        const webData = JSON.stringify(responseJson);

        if (process.env.DEVELOPMENT) {
            const outFile = usePuppeteer ? "out.json" : "out_no_browser.json";
            console.log(
                "The data that would be published is in '" + outFile + "'"
            );
            //console.log("The following data would be published:");
            //console.dir(responseJson, { depth: null });
            file.write(outFile, webData);

            /* -- Don't record metrics in development --
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
            */
            return responseJson;
        } else {
            const uploadResponse = await s3.saveWebData(
                webData,
                responseJson.timestamp
            );
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
            return uploadResponse;
        }
    };
    await gatherData();
}

module.exports = { execute };
