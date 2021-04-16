const faunadb = require("faunadb"),
    fq = faunadb.query;
const dbUtils = require("../lib/db/utils");
const pinpointWorkflow = require("./pinpoint/new_subscriber");

const signUp = {
    activateSubscription,
    addOrUpdateSubscription,
    cancelSubscription,
    getSubscription,
    handler,
};

module.exports = signUp;

async function handler(req) {
    console.log(JSON.stringify(req));
    let error = null;
    const res = await signUp
        .addOrUpdateSubscription(JSON.parse(req.body))
        .catch((err) => {
            console.error(err);
            error = err;
        });
    return {
        statusCode: error ? 500 : 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(error ? error : { success: 1 }),
    };
}

async function addOrUpdateSubscription({ phoneNumber, email, zip, radius }) {
    const data = {
        phoneNumber,
        email,
        zip,
        radius,
        active: false,
        cancelled: false,
    };
    if (phoneNumber && email) {
        throw new Error("phone number and email both set!");
    }
    if (phoneNumber) {
        return dbUtils
            .faunaQuery(
                fq.If(
                    fq.Exists(
                        fq.Match("subscriptionByPhoneNumber", phoneNumber)
                    ),
                    fq.Update(
                        fq.Select(
                            "ref",
                            fq.Get(
                                fq.Match(
                                    "subscriptionByPhoneNumber",
                                    phoneNumber
                                )
                            )
                        ),
                        {
                            data,
                        }
                    ),
                    fq.Create(fq.Collection("subscriptions"), { data })
                )
            )
            .then(() =>
                pinpointWorkflow.validateNumberAndAddSubscriber(phoneNumber)
            );
    } else if (email) {
        return dbUtils.faunaQuery(
            fq.If(
                fq.Exists(fq.Match("subscriptionByEmail", email)),
                fq.Update(
                    fq.Select(
                        "ref",
                        fq.Get(fq.Match("subscriptionByEmail", email))
                    ),
                    {
                        data,
                    }
                ),
                fq.Create(fq.Collection("subscriptions"), { data })
            )
        );
    } else {
        throw new Error("Neither email nor phone number were set!");
    }
}

async function cancelSubscription({ phoneNumber, email }) {
    if (phoneNumber && email) {
        throw new Error("both phone number and email defined!");
    } else if (phoneNumber) {
        return dbUtils.faunaQuery(
            fq.Update(
                fq.Select(
                    "ref",
                    fq.Get(fq.Match("subscriptionByPhoneNumber", phoneNumber))
                ),
                { data: { cancelled: true } }
            )
        );
    } else if (email) {
        return dbUtils.faunaQuery(
            fq.Update(
                fq.Select(
                    "ref",
                    fq.Get(fq.Match("subscriptionByEmail", email))
                ),
                { data: { cancelled: true } }
            )
        );
    } else {
        throw new Error("no phone or email set!");
    }
}

async function activateSubscription({ phoneNumber, email }) {
    if (phoneNumber && email) {
        throw new Error("both phone number and email defined!");
    } else if (phoneNumber) {
        return dbUtils.faunaQuery(
            fq.Update(
                fq.Select(
                    "ref",
                    fq.Get(fq.Match("subscriptionByPhoneNumber", phoneNumber))
                ),
                { data: { active: true } }
            )
        );
    } else if (email) {
        return dbUtils.faunaQuery(
            fq.Update(
                fq.Select(
                    "ref",
                    fq.Get(fq.Match("subscriptionByEmail", email))
                ),
                { data: { active: true } }
            )
        );
    } else {
        throw new Error("no phone or email set!");
    }
}

async function getSubscription({ phoneNumber, email }) {
    if (phoneNumber && email) {
        throw new Error("both phone number and email defined!");
    } else if (phoneNumber) {
        return dbUtils.faunaQuery(
            fq.If(
                fq.Exists(fq.Match("subscriptionByPhoneNumber", phoneNumber)),
                fq.Select(
                    "data",
                    fq.Get(fq.Match("subscriptionByPhoneNumber", phoneNumber))
                ),
                null
            )
        );
    } else if (email) {
        return dbUtils.faunaQuery(
            fq.If(
                fq.Exists(fq.Match("subscriptionByEmail", email)),
                fq.Select(
                    "data",
                    fq.Get(fq.Match("subscriptionByEmail", email))
                ),
                null
            )
        );
    } else {
        throw new Error("no phone or email set!");
    }
}
