const sites = require("../data/sites.json");
const mychart = require("./MyChartAPI");

module.exports = async function GetAvailableAppointments() {
    console.log("UmassMercantile starting.");
    const webData = await ScrapeWebsiteData();
    console.log("UmassMercantile done.");
    return {
        ...sites.UmassMercantile,
        ...webData,
    };
};

async function ScrapeWebsiteData() {
    // We need to go through the flow and use a request verification token
    const [
        cookie,
        verificationToken,
    ] = await mychart.GetCookieAndVerificationToken(
        "https://mychartonline.umassmemorial.org/mychart/openscheduling?specialty=15&hidespecialtysection=1"
    );
    return mychart.AddFutureWeeks(
        "mychartonline.umassmemorial.org",
        "/MyChart/OpenScheduling/OpenScheduling/GetScheduleDays",
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
    const filters =
        '{"Providers":{"56394":true,"56395":true,"56396":true,"56475":true,"56476":true,"56526":true,"56527":true,"56528":true,"56529":true,"56530":true,"56531":true,"56532":true,"56533":true},"Departments":{"102001144":true,"104001144":true,"111029146":true},"DaysOfWeek":{"0":true,"1":true,"2":true,"3":true,"4":true,"5":true,"6":true},"TimesOfDay":"both"}';
    return `view=grouped&specList=15&vtList=5060&start=${startDateFormatted}&filters=${encodeURIComponent(
        filters
    )}`;
}
