const dotenv = require("dotenv");
//note: this only works locally; in Lambda we use environment variables set manually
dotenv.config();

const scrapers = require("./site-scrapers");
const scraperCommon = require("./scraper_common.js");

async function executeScrapers() {
    return await scraperCommon.execute(true, scrapers);
}

exports.handler = executeScrapers;

if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
    (async () => {
        console.log("DEV MODE");
        await executeScrapers();
        process.exit();
    })();
}
