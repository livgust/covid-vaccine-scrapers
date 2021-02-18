function addDefaultsToResults(
    scrapedResults,
    cachedResults,
    secondsOfTolerance
) {
    if (!(cachedResults && cachedResults.length)) {
        return scrapedResults;
    } else {
        const combinedResults = [];
        const scrapeGrouping = {};
        scrapedResults.forEach((result) => {
            combinedResults.push(result);
            scrapeGrouping[generateKey(result)] = 1;
        });

        cachedResults.forEach((cachedResult) => {
            if (!scrapeGrouping[generateKey(cachedResult)]) {
                if (secondsOfTolerance) {
                    const lowerTimeBound =
                        new Date() - secondsOfTolerance * 1000;
                    if (
                        cachedResult.timestamp &&
                        cachedResult.timestamp >= lowerTimeBound
                    ) {
                        combinedResults.push(cachedResult);
                    }
                } else {
                    combinedResults.push(cachedResult);
                }
            }
        });

        return combinedResults;
    }
}

function generateKey(entry) {
    let uniqueIdentifier = "";
    ["name", "street", "city", "zip"].forEach((key) => {
        if (entry[key]) {
            uniqueIdentifier += `${entry[key]};`;
        }
    });
    //make lower case and replace ".", "-", "," and " " so we don't get TOO picky
    uniqueIdentifier = uniqueIdentifier.toLowerCase().replace(/[\.,-\s]/g, "");

    return uniqueIdentifier;
}

module.exports.addDefaultsToResults = addDefaultsToResults;
module.exports.generateKey = generateKey;
