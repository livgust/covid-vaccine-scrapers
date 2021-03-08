const https = require("https");

const slackWebhookHost = "hooks.slack.com";

const channelConfig = {
    dev: {
        webhookPath: process.env.SLACKWEBHOOKDEVCHANNEL,
    },
    bot: {
        webhookPath: process.env.SLACKWEBHOOKBOTCHANNEL,
    },
};

/**
 * Send Slack message via webhook
 * @param {string} channel
 * @param {string} text
 */

function sendSlackMsg(channel, text) {
    const postData = JSON.stringify({
        text,
    });

    const options = {
        hostname: slackWebhookHost,
        port: 443,
        path: channelConfig[channel].webhookPath,
        rejectUnauthorized: false,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": postData.length,
        },
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let body = "";
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve("Sent");
                } else {
                    console.error(
                        `Error status code [${res.statusCode}] returned from schedule request: ${res.statusMessage}`
                    );
                    resolve("Error");
                }
            });
        });
        req.write(postData);
        req.on("error", (e) => {
            console.error("Error making scheduling request : " + e);
        });
        req.end();
    });
}

module.exports = {
    sendSlackMsg,
};
