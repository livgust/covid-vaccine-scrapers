/* validateResults
 *
 * Scans the results to validate the all required fields are present
 */
let validationFailures = 0;

function validateResults(results) {

    validationFailures = 0;
    results.forEach((result) => {

        // All locations must have a 'hasAvailability' boolean that is true or false
        if (!result.hasOwnProperty("hasAvailability")) {
            logFailure(result, "hasAvailability undefined");
        } else if (result.hasAvailability !== true && result.hasAvailability !== false) {
            logFailure(result, "hasAvailability should be true or false");
        }

        // all locations must have a timestamp indicating when the data was last scraped
        if (!result.hasOwnProperty("timestamp")) {
            logFailure(result, "timestamp undefined");
        }
    });

    if (validationFailures === 0) {
        console.log("\x1b[42m\x1b[1m PASS \x1b[0m");
    } else {
        console.log("\x1b[41m\x1b[1m FAIL \x1b[0m " + validationFailures + " failed");
    }
}

function logFailure(result, reason) {
    console.log("\x1b[41m\x1b[1m " + result.name + " :\x1b[0m " + reason);
    validationFailures += 1;
}

module.exports.validateResults = validateResults;
