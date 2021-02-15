
let scrapers = [];

if(process.argv.length > 2){
    let scraper;
    for(let i = 2; i < process.argv.length; i++){
        scraper = require(`./${process.argv[i]}.js`);
        scrapers.push(scraper);
    }
}

if (process.env.SCRAPERS) {
    const scrapersList = process.env.SCRAPERS.split(' ');
    scrapersList.map((id) => {
        let scraper = require(`./${id}.js`);
        scrapers.push(scraper);
    });
}

if (process.env.PROPRIETARY_SITE_SCRAPERS_PATH) {
    const otherScrapers = require(process.env.PROPRIETARY_SITE_SCRAPERS_PATH);
    scrapers.push(...otherScrapers);
}

module.exports = scrapers;
