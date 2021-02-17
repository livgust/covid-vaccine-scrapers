const fs = require("fs");

let scrapers = [];

const ls = fs
    .readdirSync("./site-scrapers", { withFileTypes: true })
    .filter((item) => !item.isDirectory())
    .filter((item) => item.name !== "index.js")
    .map((item) => item.name);

ls.map((fileName) => {
    scraper = require(`./${fileName}`);
    scrapers.push(scraper);
});

if (process.argv.length > 2) {
    scrapers = []; // args override directory list allowing single site runs
    let scraper;
    for (let i = 2; i < process.argv.length; i++) {
        scraper = require(`./${process.argv[i]}.js`);
        scrapers.push(scraper);
    }
}

if (process.env.PROPRIETARY_SITE_SCRAPERS_PATH) {
    const otherScrapers = require(process.env.PROPRIETARY_SITE_SCRAPERS_PATH);
    scrapers.push(...otherScrapers);
}

module.exports = scrapers;
