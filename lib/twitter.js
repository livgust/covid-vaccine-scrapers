const Twitter = require("twit");
const dotenv = require("dotenv");
dotenv.config();

const client = new Twitter({
    consumer_key: process.env.TWITTER_API_KEY,
    consumer_secret: process.env.TWITTER_API_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

async function sendTweet(message) {
    if (message.length > 280) {
        throw new Error("Tweet too long! It needs to be under 280 characters.");
    }
    if (process.env.NODE_ENV !== "production") {
        console.log(`would tweet message "${message}"`);
        return;
    } else {
        return client.post("statuses/update", { status: message });
    }
}

module.exports = { sendTweet };
