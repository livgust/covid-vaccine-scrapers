const dotenv = require("dotenv");
//note: this only works locally; in Lambda we use environment variables set manually
dotenv.config();

const chromium = require("chrome-aws-lambda");
const { addExtra } = require("puppeteer-extra");
const Puppeteer = addExtra(chromium.puppeteer);
const Recaptcha = require("puppeteer-extra-plugin-recaptcha");
const scrapers = require("./site-scrapers");
const fetch = require("node-fetch");
const dataDefaulter = require("./data/dataDefaulter");

//aws-sdk is only a dev dependency because Lambda already includes the package by default.
const AWS = require("aws-sdk");

async function execute() {
    //S3 bucket initialization
    const s3 = new AWS.S3({
        accessKeyId: process.env.AWSACCESSKEYID,
        secretAccessKey: process.env.AWSSECRETACCESSKEY,
    });

    const cachedResults = await fetch(
        "https://mzqsa4noec.execute-api.us-east-1.amazonaws.com/prod"
    )
        .then((res) => res.json())
        .then((unpack) => JSON.parse(unpack.body).results);

    Puppeteer.use(
        Recaptcha({
            provider: { id: "2captcha", token: process.env.RECAPTCHATOKEN },
        })
    );

    const browser = process.env.DEVELOPMENT
        ? await Puppeteer.launch({
              executablePath: process.env.CHROMEPATH,
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
            scrapers.map((scraper) =>
                scraper(browser).catch((error) => {
                    //print out the issue but don't fail, this way we still publish updates
                    //for other locations even if this website's scrape doesn't work
                    console.log(error);
                    return null;
                })
            )
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
            results: finalResultsArray,
        };

        if (process.env.DEVELOPMENT) {
            if (process.env.NODE_ENV !== "test") {
                console.log("The following data would be published:");
                console.dir(responseJson, { depth: null });
                fs = require("fs");
                await new Promise((resolve, reject) => {
                    fs.writeFile(
                        "out.json",
                        JSON.stringify(responseJson),
                        (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        }
                    );
                });
            }
            return finalResultsArray;
        } else {
            const params = {
                Bucket: process.env.AWSS3BUCKETNAME,
                Key: "data.json",
                Body: JSON.stringify(responseJson),
            };

            // Uploading files to the bucket
            const results = await new Promise((resolve, reject) => {
                s3.upload(params, function (err, data) {
                    if (err) {
                        reject(err);
                    }
                    console.log(`File uploaded successfully. ${data.Location}`);
                    resolve(data);
                });
            });
            // Timestamped upload
            var params2 = params;
            const now = new Date();
            const timestamp =
                now.toISOString().substring(0, 16).replace(":", "") + "Z";
            // timestamp form: "2021-02-12T1838Z" (we omit seconds for predictability)
            params2.Key = "data-" + timestamp + ".json";
            // Do the reupload
            const results2 = await new Promise((resolve, reject) => {
                s3.upload(params2, function (err, data) {
                    if (err) {
                        reject(err);
                    }
                    console.log(
                        `Timestamped file uploaded successfully. ${data.Location}`
                    );
                    resolve(data);
                });
            });
            return finalResultsArray;
        }
    };
    return await gatherData();
}

exports.handler = execute;

if (process.env.DEVELOPMENT && process.env.NODE_ENV !== "test") {
    (async () => {
        console.log("DEV MODE");
        await execute();
        process.exit();
    })();
}
