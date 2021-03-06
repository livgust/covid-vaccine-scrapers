const https = require("https");
const { site } = require("./config");
const mychart = require("../../lib/MyChartAPI.js");

const dept = "12701803";

module.exports = async function GetAvailableAppointments() {
    console.log("Atrius starting.");
    const webData = await ScrapeWebsiteData();
    console.log("Atrius done.");
    return {
        ...site,
        ...webData,
        timestamp: new Date(),
    };
};

function urlRedirect(url, options) {
    return new Promise((resolve) => {
        let response = "";
        https.get(url, options, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
                response = res.headers ? res.headers.location : null;
                resolve(response);
            });
        });
    });
}

async function ScrapeWebsiteData() {
    const checkSlots = await urlRedirect(site.website, {});
    if (checkSlots && checkSlots.match("No_Slots")) {
        console.log(
            `Atrius redirecting to no slots, ${checkSlots}, assuming failure!`
        );
        return {
            hasAvailability: false,
            availability: {}, //this line is optional
        };
    }

    // We need to go through the flow and use a request verification token
    const [
        cookie,
        verificationToken,
    ] = await mychart.GetCookieAndVerificationToken(site.dphLink);

    // Setup the return object.
    const results = mychart.AddFutureWeeks(
        "myhealth.atriushealth.org",
        "/OpenScheduling/OpenScheduling/GetScheduleDays",
        cookie,
        verificationToken,
        10,
        PostDataCallback
    );
    // object returned from AddFutureWeeks maps dept ID -> availability info
    // here, we want to just return availability info for relevant dept.
    return results[dept];
}

/**
 * mychart.AddFutureWeeks calls this function to get the data it should POST to the API.
 */
function PostDataCallback(startDateFormatted) {
    const { TimesOfDay } = mychart.CommonFilters;
    return `view=grouped&specList=121&vtList=1424&start=${startDateFormatted}&filters=${encodeURIComponent(
        JSON.stringify({
            Providers: {},
            Departments: {},
            DaysOfWeek: {},
            TimesOfDay,
        })
    )}`;
}
