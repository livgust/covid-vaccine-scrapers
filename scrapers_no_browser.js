const dotenv = require("dotenv");
//note: this only works locally; in Lambda we use environment variables set manually
dotenv.config();

const noBrowserScrapers = require("./no-browser-site-scrapers");
const scraperCommon = require("./scraper_common.js");

async function executeNoBrowserScrapers() {
    await scraperCommon.execute(false, noBrowserScrapers);
}

exports.handler = executeNoBrowserScrapers;

if (process.env.DEVELOPMENT) {
    (async () => {
        console.log("DEV MODE");
        await executeNoBrowserScrapers();
        process.exit();
    })();
}
