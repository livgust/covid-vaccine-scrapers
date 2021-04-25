const dbUtils = require("../lib/db/utils");
const faunadb = require("faunadb"),
    fq = faunadb.query;
const { sendTexts } = require("../alerts/send_texts_and_emails");

module.exports = run;

async function run() {
    // find people who were marked cancelled on/before 9 AM this morning
    // but were non-existent OR were not marked cancelled on/before 6 PM yesterday
    const allSubscribers = await dbUtils
        .faunaQuery(
            fq.Map(
                fq.Paginate(
                    fq.Match("subscriptionsByStatuses", [true, false]),
                    {
                        size: 5000, //10000,
                    }
                ),
                fq.Lambda(
                    "sub",
                    fq.Select(["data", "phoneNumber"], fq.Get(fq.Var("sub")))
                )
            )
        )
        .then((res) => res.data)
        .catch(console.error);
    console.log(`found ${allSubscribers.length} subscribers.`);
    const msg =
        "Happy Friday! This is a gentle reminder to unsubscribe by texting STOP if you " +
        "no longer need our notifications. Thank you!";
    await sendTexts(allSubscribers, msg);
}
