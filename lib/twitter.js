const Twitter = require("twit");
const dotenv = require("dotenv");
dotenv.config();
let client;

const USE_TWITTER = false; // TODO: once we push this to prod and it looks good we'll start posting to Twitter :grimace:

if (process.env.NODE_ENV === "production" && USE_TWITTER) {
    client = new Twitter({
        consumer_key: process.env.TWITTER_API_KEY,
        consumer_secret: process.env.TWITTER_API_SECRET,
        access_token: process.env.TWITTER_ACCESS_TOKEN_KEY,
        access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
} else {
    console.log(
        'SETTING UP FAKE TWITTER CLIENT - If you intended this to be real, set NODE_ENV to "production".'
    );
    client = {
        post: (method, args) => {
            console.log(
                `Twitter client was called with ${
                    JSON.stringify[(method, args)]
                }, but it is set up as a test object so it did nothing.`
            );
        },
    };
}

async function sendTweet(message) {
    if (message.length > 280) {
        throw new Error("Tweet too long! It needs to be under 280 characters.");
    }
    return client.post("statuses/update", { status: message });
}

module.exports = { sendTweet };
