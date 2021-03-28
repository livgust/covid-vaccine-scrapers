const fs = require("fs");

let scrapers = [];

// args override directory list allowing single site runs, e.g. `node main.js LynnTech`
if (process.argv.length > 2) {
    for (let i = 2; i < process.argv.length; i++) {
        const scraper = require(`./${process.argv[i]}`);
        scrapers.push({
            run: scraper,
            name: process.argv[i],
        });
    }
} else {
    const ls = fs
        .readdirSync("./no-browser-site-scrapers", { withFileTypes: true })
        .filter((item) => item.isDirectory())
        .map((item) => item.name);

    ls.map((fileName) => {
        let scraper = require(`./${fileName}`);
        scrapers.push({ run: scraper, name: fileName });
    });
}

if (process.env.PROPRIETARY_SITE_SCRAPERS_PATH) {
    const otherScrapers = require(process.env.PROPRIETARY_SITE_SCRAPERS_PATH);
    scrapers.push(...otherScrapers);
}

module.exports = scrapers;
