const dbUtils = require("../lib/db/utils");
const faunadb = require("faunadb"),
    fq = faunadb.query;
const { sendTexts } = require("../alerts/send_texts_and_emails");

module.exports = run;

async function run() {
    // find people who were marked cancelled on/before 9 AM this morning
    // but were non-existent OR were not marked cancelled on/before 6 PM yesterday
    const start_ts = fq.Time("2021-04-19T22:00:00Z");
    const end_ts = fq.Time("2021-04-20T13:00:00Z");
    const cancelledSubscribers = await dbUtils
        .faunaQuery(
            fq.Map(
                fq.Filter(
                    fq.Paginate(fq.Documents(fq.Collection("subscriptions")), {
                        size: 5000,
                    }),
                    fq.Lambda(
                        "sub",
                        fq.And(
                            fq.And(
                                fq.Exists(fq.Var("sub"), end_ts),
                                fq.Equals(
                                    true,
                                    fq.Select(
                                        ["data", "cancelled"],
                                        fq.Get(fq.Var("sub"), end_ts)
                                    )
                                )
                            ),
                            fq.Or(
                                fq.Not(fq.Exists(fq.Var("sub"), start_ts)),
                                fq.Equals(
                                    false,
                                    fq.Select(
                                        ["data", "cancelled"],
                                        fq.Get(fq.Var("sub"), start_ts)
                                    )
                                )
                            )
                        )
                    )
                ),
                fq.Lambda("x", fq.Get(fq.Var("x")))
            )
        )
        .catch(console.error);
    console.log(`found ${cancelledSubscribers.data.length} candidates.`);
    const nums = cancelledSubscribers.data
        .map((sub) => sub.data.phoneNumber)
        .sort();
    const msg =
        "This morning we fixed an issue where replying HELP unsubscribed people from alerts. " +
        "We are contacting you because you may have been affected. " +
        "To re-enroll in alerts, fill out the form again on macovidvaccines.com. " +
        "If you intended to unsubscribe, no action is necessary and we will not contact you again. " +
        "We apologize for the inconvenience!";
    await sendTexts(nums, msg);
}
