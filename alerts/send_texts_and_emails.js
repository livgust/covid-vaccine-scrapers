const AWS = require("aws-sdk");
const determineRecipients = require("./determine_recipients");
const dotenv = require("dotenv");
dotenv.config();

if (process.env.NODE_ENV !== "production") {
    AWS.config.credentials = new AWS.SharedIniFileCredentials({
        profile: "macovidvaccines",
    });
    AWS.config.update({ region: "us-east-1" });
}

const pinpoint = new AWS.Pinpoint();

module.exports = {
    handler,
    sendTexts,
};

async function handler({ location, numberAppointmentsFound, message }) {
    const subscribers = await determineRecipients.determineRecipients({
        location,
        numberAvailable: numberAppointmentsFound,
    });
    return sendTexts(
        subscribers.textRecipients.map((subscriber) => subscriber.phoneNumber),
        message
    );
}

async function sendTexts(phoneNumbers, message) {
    return new Promise((resolve, reject) =>
        pinpoint.sendMessages(
            {
                ApplicationId: process.env.PINPOINT_APPLICATION_ID,
                MessageRequest: {
                    Addresses: phoneNumbers.reduce((obj, curNum) => {
                        obj[`+1${curNum}`] = { ChannelType: "SMS" };
                        return obj;
                    }, {}),
                    MessageConfiguration: {
                        SMSMessage: {
                            Body: message,
                            MessageType: "PROMOTIONAL",
                            OriginationNumber:
                                process.env.PINPOINT_ORIGINATION_NUMBER,
                        },
                    },
                },
            },
            (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            }
        )
    );
}
