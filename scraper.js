const dotenv = require("dotenv");
//note: this only works locally; in Lambda we use environment variables set manually
dotenv.config();

const chromium = require("chrome-aws-lambda");
const { addExtra } = require("puppeteer-extra");
const Puppeteer = addExtra(chromium.puppeteer);

const { getAllCoordinates } = require("./getGeocode");
const {
    logScraperRun,
    getTotalNumberOfAppointments,
} = require("./lib/metrics");
const dataDefaulter = require("./data/dataDefaulter");
const fetch = require("node-fetch");
const file = require("./lib/file");
const Recaptcha = require("puppeteer-extra-plugin-recaptcha");
const scrapers = require("./site-scrapers");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const s3 = require("./lib/s3");

async function execute() {
    const cachedResults = await fetch(
        "https://mzqsa4noec.execute-api.us-east-1.amazonaws.com/prod"
    )
        .then((res) => res.json())
        .then((unpack) => JSON.parse(unpack.body).results);

    Puppeteer.use(StealthPlugin());

    Puppeteer.use(
        Recaptcha({
            provider: { id: "2captcha", token: process.env.RECAPTCHATOKEN },
        })
    );

    let clientIpAddress = null;

    fetch("https://ifconfig.me/ip")
        .then((res) => res.text())
        .then((body) => (clientIpAddress = body));

    const browser = process.env.DEVELOPMENT
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

    const gatherData = async () => {
        const results = await Promise.all(
            scrapers.map((scraper) => {
                const startTime = new Date();
                let isSuccess = true;
                return scraper
                    .run(browser)
                    .catch((error) => {
                        //print out the issue but don't fail, this way we still publish updates
                        //for other locations even if this website's scrape doesn't work
                        console.log(error);
                        isSuccess = false;
                        return null;
                    })
                    .then(async (result) => {
                        const numberAppointments = getTotalNumberOfAppointments(
                            result
                        );
                        // TODO - call FaunaDB util method here!
                        await logScraperRun(
                            scraper.name,
                            isSuccess,
                            new Date() - startTime,
                            startTime,
                            numberAppointments
                        );
                        return result;
                    });
            })
        );
        browser.close();
        let scrapedResultsArray = [];
        for (const result of results) {
            if (Array.isArray(result)) {
                scrapedResultsArray.push(...result);
            } else if (result) {
                //ignore nulls
                scrapedResultsArray.push(result);
            }
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

            debug: {
                clientIpAddress,
            },

            // Timestamp for the archived data.json file.
            timestamp: s3.getTimestampForFile(),

            // Add geocoding for all locations
            results: await getAllCoordinates(finalResultsArray, cachedResults),
        };

        const webData = JSON.stringify(responseJson);

        if (process.env.DEVELOPMENT) {
            //console.log("The following data would be published:");
            //console.dir(responseJson, { depth: null });
            file.write("out.json", webData);
            return responseJson;
        } else {
            const uploadResponse = await s3.saveWebData(
                webData,
                responseJson.timestamp
            );
            return uploadResponse;
        }
    };
    await gatherData();
}

exports.handler = execute;

if (process.env.DEVELOPMENT) {
    (async () => {
        console.log("DEV MODE");
        await execute();
        process.exit();
    })();
}
