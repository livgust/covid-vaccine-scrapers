/* mergeResults
 *
 * Merges cachedResults into currentResults. If secondsOfTolerance is set,
 * will only merge in cachedResults with a timestamp newer than
 * now - secondsOfTolerance.
 */
function mergeResults(currentResults, cachedResults, secondsOfTolerance) {
    if (!(cachedResults && cachedResults.length)) {
        return currentResults;
    } else {
        const combinedResults = [];
        const currentResultsMap = {};
        currentResults.forEach((result) => {
            combinedResults.push(result);
            currentResultsMap[generateKey(result)] = 1;
        });

        cachedResults.forEach((cachedResult) => {
            // ignore any cached results that don't have a timestamp
            if (
                cachedResult.timestamp &&
                !currentResultsMap[generateKey(cachedResult)]
            ) {
                if (secondsOfTolerance) {
                    const lowerTimeBound =
                        new Date() - secondsOfTolerance * 1000;
                    if (cachedResult.timestamp >= lowerTimeBound) {
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
            uniqueIdentifier += `${entry[key]
                .toLowerCase()
                .replace(/[^\w]/g, "")}|`;
        }
    });

    return uniqueIdentifier;
}

module.exports.mergeResults = mergeResults;
module.exports.generateKey = generateKey;
