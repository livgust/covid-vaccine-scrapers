const { zip } = require("lodash");
const dbUtils = require("../lib/db/utils");
const faunadb = require("faunadb"),
    fq = faunadb.query;
const zipRadiusFinder = require("../lib/zipRadiusFinder");

module.exports = { determineRecipients, findSubscribersWithZips };

async function determineRecipients({ locations, numberAvailable }) {
    console.log(
        `finding recipients for ${JSON.stringify(
            locations,
            null,
            2
        )} with ${numberAvailable} slots.`
    );
    const radiusIncrements = [3, 5, 10, 15, 20, 30, 40, 50, 100, null];
    let numberRecipients = 0;
    const textRecipients = [];
    const emailRecipients = [];
    for (const radiusIndex in radiusIncrements) {
        for (const location of locations) {
            const zips = zipRadiusFinder({
                lessThan: radiusIncrements[radiusIndex],
                greaterThan: radiusIndex
                    ? radiusIncrements[radiusIndex - 1]
                    : null,
                originLoc: location,
            });
            let subscribers = await findSubscribersWithZips(zips);
            // First, filter out anybody with a radius tighter than the distance
            // to the site. NOTE that for this simplification to work, we must
            // ensure that our radiusIncrements be a superset of the radii we allow
            // users to enter when they subscribe.
            // Also filter out people that are already in our subscription list.
            console.log(`found ${subscribers.length} subscribers`);
            subscribers = subscribers.filter(
                (subscriber) =>
                    !parseInt(radiusIndex) ||
                    subscriber.radius > radiusIncrements[radiusIndex - 1] ||
                    (subscriber.phoneNumber &&
                        textRecipients.indexOf(
                            (rec) => rec.phoneNumber === subscriber.phoneNumber
                        ) > -1) ||
                    (subscriber.email &&
                        emailRecipients.indexOf(
                            (rec) => rec.email === subscriber.email
                        ) > -1)
            );
            console.log(`filtered down to ${subscribers.length} subscribers`);
            // Then, sort them out into text or email.
            subscribers.forEach((subscriber) => {
                if (subscriber.phoneNumber) {
                    textRecipients.push(subscriber);
                } else if (subscriber.email) {
                    emailRecipients.push(subscriber);
                } else {
                    console.error(
                        `found subscriber ${JSON.stringify(
                            subscriber
                        )} without phone # or email!`
                    );
                }
            });
            numberRecipients += subscribers.length;
        }
        if (numberRecipients >= 4 * numberAvailable) {
            console.log(`notifying ${numberRecipients} recipients.`);
            return {
                emailRecipients,
                textRecipients,
            };
        }
    }
    // if we go through all radii and still have found fewer subscribers than
    // twice the number of appointments, return everybody we found.
    console.log(`notifying ${numberRecipients} recipients.`);
    return { emailRecipients, textRecipients };
}

async function findSubscribersWithZips(zips) {
    console.log(`finding subscribers with the following ZIP codes: ${zips}`);
    if (!zips || !zips.length) {
        return [];
    }
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
