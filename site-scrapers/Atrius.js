const sites = require("../data/sites.json");
const mychart = require("./MyChartAPI.js");

module.exports = async function GetAvailableAppointments() {
    console.log("Atrius starting.");
    const webData = await ScrapeWebsiteData();
    console.log("Atrius done.");
    return {
        ...sites.Atrius,
        ...webData,
    };
};

async function ScrapeWebsiteData() {
    // We need to go through the flow and use a request verification token
    const [
        cookie,
        verificationToken,
    ] = await mychart.GetCookieAndVerificationToken(sites.Atrius.dphLink);

    // Setup the return object.
    return mychart.AddFutureWeeks(
        "myhealth.atriushealth.org",
        "/OpenScheduling/OpenScheduling/GetScheduleDays",
        cookie,
        verificationToken,
        10,
        PostDataCallback
    );
}

/**
 * This is the callback function
 */
function PostDataCallback(startDateFormatted) {
    return `view=grouped&specList=121&vtList=1424&start=${startDateFormatted}&filters=%7B%22Providers%22%3A%7B%7D%2C%22Departments%22%3A%7B%7D%2C%22DaysOfWeek%22%3A%7B%7D%2C%22TimesOfDay%22%3A%22both%22%7D`;
}
