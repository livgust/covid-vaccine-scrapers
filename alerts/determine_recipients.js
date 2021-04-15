const dbUtils = require("../lib/db/utils");
const faunadb = require("faunadb"),
    fq = faunadb.query;
const zipRadiusFinder = require("../lib/zipRadiusFinder");

module.exports = { determineRecipients, findSubscribersWithZips };

async function determineRecipients({ location, numberAvailable }) {
    const radiusIncrements = [3, 5, 10, 15, 20, 30, 40, 50, 100, null];
    let numberRecipients = 0;
    const textRecipients = [];
    const emailRecipients = [];
    for (const radiusIndex in radiusIncrements) {
        const zips = zipRadiusFinder({
            lessThan: radiusIncrements[radiusIndex],
            greaterThan: radiusIndex ? radiusIncrements[radiusIndex - 1] : null,
            originLoc: location,
        });
        let subscribers = await findSubscribersWithZips(zips);
        // First, filter out anybody with a radius tighter than the distance
        // to the site. NOTE that for this simplification to work, we must
        // ensure that our radiusIncrements be a superset of the radii we allow
        // users to enter when they subscribe.
        subscribers = subscribers.filter(
            (subscriber) =>
                !parseInt(radiusIndex) ||
                subscriber.radius >= radiusIncrements[radiusIndex - 1]
        );
        // Then, sort them out into text or email.
        subscribers.forEach((subscriber) => {
            if (subscriber.phoneNumber) {
                textRecipients.push(subscriber);
            } else if (subscriber.email) {
                emailRecipients.push(subscriber);
            } else {
                throw new Error(
                    `found subscriber ${JSON.stringify(
                        subscriber
                    )} without phone # or email!`
                );
            }
        });
        numberRecipients += subscribers.length;
        if (numberRecipients >= 2 * numberAvailable) {
            return {
                emailRecipients,
                textRecipients,
            };
        }
    }
    // if we go through all radii and still have found fewer subscribers than
    // twice the number of appointments, return everybody we found.
    return { emailRecipients, textRecipients };
}

async function findSubscribersWithZips(zips) {
    return dbUtils.faunaQuery(
        fq.Select(
            "data",
            fq.Map(
                fq.Paginate(
                    fq.Union(
                        ...zips.map((zip) =>
                            fq.Match(
                                fq.Index("subscriptionsByZipWithStatuses"),
                                [zip, true, false] // active subscriptions with a zip
                            )
                        )
                    ),
                    { size: 5000 }
                ),
                fq.Lambda((x) => fq.Select("data", fq.Get(x)))
            )
        )
    );
}
