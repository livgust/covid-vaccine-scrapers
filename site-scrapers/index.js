const FamilyPracticeGroup = require("./FamilyPracticeGroup.js");
const MAImmunizations = require("./MAImmunizations.js");
const UMassAmherst = require("./UMassAmherst.js");

let scrapers = [FamilyPracticeGroup, MAImmunizations, UMassAmherst];

if (process.env.PROPRIETARY_SITE_SCRAPERS_PATH) {
	const otherScrapers = require(process.env.PROPRIETARY_SITE_SCRAPERS_PATH);
	scrapers.push(...otherScrapers);
}

module.exports = scrapers;
