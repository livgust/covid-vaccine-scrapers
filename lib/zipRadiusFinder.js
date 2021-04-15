const maZips = require("../data/ma-zips.json");

// unit is miles
module.exports = function zipRadiusFinder({
    greaterThan,
    lessThan,
    originLoc,
}) {
    const resultZips = [];
    if (!(greaterThan || lessThan)) {
        throw new Error("one of greaterThan/lessThan must be set (or both).");
    }
    for (const [zip, loc] of Object.entries(maZips)) {
        const distance = getDistance(
            originLoc.latitude,
            originLoc.longitude,
            loc.latitude,
            loc.longitude
        );
        if (
            (!greaterThan || distance >= greaterThan) &&
            (!lessThan || distance < lessThan)
        ) {
            resultZips.push(zip);
        }
    }
    return resultZips;
};

/* from https://stackoverflow.com/a/21623206 */
function getDistance(lat1, lon1, lat2, lon2) {
    const p = 0.017453292519943295; // Math.PI / 180
    const c = Math.cos;
    const a =
        0.5 -
        c((lat2 - lat1) * p) / 2 +
        (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;

    return 7917.6 * Math.asin(Math.sqrt(a)); // 2 * R; R = 3958.8 mi
}
