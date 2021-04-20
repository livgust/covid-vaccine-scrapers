const AWS = require("aws-sdk");
const signUp = require("../sign_up");

if (process.env.NODE_ENV !== "production") {
    AWS.config.credentials = new AWS.SharedIniFileCredentials({
        profile: "macovidvaccines",
    });
    AWS.config.update({ region: "us-east-1" });
}

const pinpoint = new AWS.Pinpoint();

module.exports = { handler: eventRouter };

async function eventRouter(event) {
    console.log(`Received event ${JSON.stringify(event)}`);
    var timestamp = event.Records[0].Sns.Timestamp;
    var message = JSON.parse(event.Records[0].Sns.Message);
    var formattedOriginationNumber =
        message.originationNumber.indexOf("+1") === 0
            ? message.originationNumber.substring(2)
            : message.originationNumber;
    var response = message.messageBody.toLowerCase();

    if (response.includes("yes")) {
        // CONFIRMATION
        return signUp
            .activateSubscription({ phoneNumber: formattedOriginationNumber })
            .then(
                () =>
                    new Promise((resolve, reject) => {
                        var params = {
                            ApplicationId: process.env.PINPOINT_APPLICATION_ID,
                            MessageRequest: {
                                Addresses: {
                                    [message.originationNumber]: {
                                        ChannelType: "SMS",
                                    },
                                },
                                MessageConfiguration: {
                                    SMSMessage: {
                                        Body:
                                            "You are now enrolled. Reply STOP to stop at any time, " +
                                            "HELP for more information, or visit macovidvaccines.com " +
                                            "to update your subscription.",
                                        MessageType: "TRANSACTIONAL",
                                        OriginationNumber:
                                            process.env
                                                .PINPOINT_ORIGINATION_NUMBER,
                                    },
                                },
                            },
                        };
                        return pinpoint.sendMessages(
                            params,
                            function (err, data) {
                                // If something goes wrong, print an error message.
                                if (err) {
                                    console.error(
                                        `could not send enrollment text: ${err}`
                                    );
                                    reject(err);
                                    // Otherwise, show the unique ID for the message.
                                } else {
                                    resolve(
                                        "Message sent! " +
                                            data["MessageResponse"]["Result"][
                                                message.originationNumber
                                            ]["StatusMessage"]
                                    );
                                }
                            }
                        );
                    })
            );
    } else if (response.includes("stop")) {
        // UN-ENROLL
        return signUp
            .cancelSubscription({ phoneNumber: formattedOriginationNumber })
            .then(
                () =>
                    new Promise((resolve, reject) => {
                        var params = {
                            ApplicationId: process.env.PINPOINT_APPLICATION_ID,
                            MessageRequest: {
                                Addresses: {
                                    [message.originationNumber]: {
                                        ChannelType: "SMS",
                                    },
                                },
                                MessageConfiguration: {
                                    SMSMessage: {
                                        Body:
                                            "You will no longer receive alerts from macovidvaccines.com. If you would like to re-enroll, visit our website. Thank you!",
                                        MessageType: "TRANSACTIONAL",
                                        OriginationNumber:
                                            process.env
                                                .PINPOINT_ORIGINATION_NUMBER,
                                    },
                                },
                            },
                        };
                        return pinpoint.sendMessages(
                            params,
                            function (err, data) {
                                // If something goes wrong, print an error message.
                                if (err) {
                                    console.error(
                                        `could not send opt-out message: ${err}`
                                    );
                                    reject(err);
                                    // Otherwise, show the unique ID for the message.
                                } else {
                                    resolve(
                                        "Message sent! " +
                                            data["MessageResponse"]["Result"][
                                                message.originationNumber
                                            ]["StatusMessage"]
                                    );
                                }
                            }
                        );
                    })
            );
    } else if (response.includes("help")) {
        // HELP
        return new Promise((resolve, reject) => {
            var params = {
                ApplicationId: process.env.PINPOINT_APPLICATION_ID,
                MessageRequest: {
                    Addresses: {
                        [message.originationNumber]: {
                            ChannelType: "SMS",
                        },
                    },
                    MessageConfiguration: {
                        SMSMessage: {
                            Body:
                                "This number sends COVID vaccine appointment alerts from macovidvaccines.com. " +
                                "To enroll, visit our website. To stop enrollment, reply STOP. " +
                                "To update your subscription, create a new subscription on our website with your same phone number.",
                            MessageType: "TRANSACTIONAL",
                            OriginationNumber:
                                process.env.PINPOINT_ORIGINATION_NUMBER,
                        },
                    },
                },
            };
            return pinpoint.sendMessages(params, function (err, data) {
                // If something goes wrong, print an error message.
                if (err) {
                    console.error(`could not send help message: ${err}`);
                    reject(err);
                    // Otherwise, show the unique ID for the message.
                } else {
                    resolve(
                        "Message sent! " +
                            data["MessageResponse"]["Result"][
                                message.originationNumber
                            ]["StatusMessage"]
                    );
                }
            });
        });
    }
    return;
}
