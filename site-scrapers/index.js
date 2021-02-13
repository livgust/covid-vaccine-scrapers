const FamilyPracticeGroup = require("./FamilyPracticeGroup.js");
const MAImmunizations = require("./MAImmunizations.js");
const UMassAmherst = require("./UMassAmherst.js");
const Hannaford = require("./Hannaford.js");
const Harrington = require("./Harrington.js");
const Curative = require("./Curative.js");
const PriceChopper = require("./PriceChopper.js");

let scrapers = [
    FamilyPracticeGroup,
    MAImmunizations,
    UMassAmherst,
    Hannaford,
    Harrington,
    Curative,
    PriceChopper,
];

if (process.env.PROPRIETARY_SITE_SCRAPERS_PATH) {
    const otherScrapers = require(process.env.PROPRIETARY_SITE_SCRAPERS_PATH);
    scrapers.push(...otherScrapers);
}

module.exports = scrapers;
