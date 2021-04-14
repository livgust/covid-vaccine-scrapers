const AWS = require("aws-sdk");

if (process.env.NODE_ENV !== "production") {
    AWS.config.credentials = new AWS.SharedIniFileCredentials({
        profile: "macovidvaccines",
    });
    AWS.config.update({ region: "us-east-1" });
}

const pinpoint = new AWS.Pinpoint();

module.exports = {
    validateNumberAndAddSubscriber,
};

async function validateNumberAndAddSubscriber(phoneNumber) {
    let destinationNumber = phoneNumber;
    if (destinationNumber.length === 10) {
        destinationNumber = "+1" + destinationNumber;
    }
    var params = {
        NumberValidateRequest: {
            IsoCountryCode: "US",
            PhoneNumber: destinationNumber,
        },
    };
    return new Promise((resolve, reject) =>
        pinpoint.phoneNumberValidate(params, async function (err, data) {
            if (err) {
                console.error(
                    `phone number validation failed with error: ${err}`
                );
                reject(err);
            } else {
                if (data["NumberValidateResponse"]["PhoneTypeCode"] === 0) {
                    await createEndpoint(data);
                } else {
                    console.error(
                        `${destinationNumber} cannot receive text messages.`
                    );
                }
                resolve(data);
            }
        })
    );
}

async function createEndpoint(data) {
    var destinationNumber =
        data["NumberValidateResponse"]["CleansedPhoneNumberE164"];
    var endpointId = data["NumberValidateResponse"][
        "CleansedPhoneNumberE164"
    ].substring(1);

    var params = {
        ApplicationId: process.env.PINPOINT_APPLICATION_ID,
        // The Endpoint ID is equal to the cleansed phone number minus the leading
        // plus sign. This makes it easier to easily update the endpoint later.
        EndpointId: endpointId,
        EndpointRequest: {
            ChannelType: "SMS",
            Address: destinationNumber,
            OptOut: "NONE",
            Location: {
                PostalCode: data["NumberValidateResponse"]["ZipCode"],
                City: data["NumberValidateResponse"]["City"],
                Country: data["NumberValidateResponse"]["CountryCodeIso2"],
            },
            Demographic: {
                Timezone: data["NumberValidateResponse"]["Timezone"],
            },
        },
    };
    return new Promise((resolve, reject) =>
        pinpoint.updateEndpoint(params, async function (err, data) {
            if (err) {
                console.error(`endpoint could not be added: ${err}`);
                reject(err);
            } else {
                console.log("updateEndpoint res");
                console.dir(data, { depth: null });
                await sendConfirmation(endpointId);
                resolve(data);
            }
        })
    );
}

async function sendConfirmation(destinationNumber) {
    var params = {
        ApplicationId: process.env.PINPOINT_APPLICATION_ID,
        MessageRequest: {
            Addresses: {
                [destinationNumber]: {
                    ChannelType: "SMS",
                },
            },
            MessageConfiguration: {
                SMSMessage: {
                    Body:
                        "Reply YES to confirm enrollment in COVID vaccine availability updates from macovidvaccines.com. Standard messaging & data rates may apply.",
                    MessageType: "TRANSACTIONAL",
                    OriginationNumber: process.env.PINPOINT_ORIGINATION_NUMBER,
                },
            },
        },
    };

    return new Promise((resolve, reject) =>
        pinpoint.sendMessages(params, function (err, data) {
            // If something goes wrong, print an error message.
            if (err) {
                console.error(`could not send confirmation message: ${err}`);
                reject(err);
                // Otherwise, show the unique ID for the message.
            } else {
                resolve(
                    "Message sent! " +
                        data["MessageResponse"]["Result"][destinationNumber][
                            "StatusMessage"
                        ]
                );
            }
        })
    );
}
