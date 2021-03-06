const { sites } = require("./config");
const mychart = require("../../lib/MyChartAPI");

module.exports = async function GetAvailableAppointments() {
    console.log("UMassMemorial starting.");
    const webData = await ScrapeWebsiteData();
    console.log("UMassMemorial done.");
    const results = [];
    const timestamp = new Date();

    for (const site of sites) {
        results.push({
            ...webData[site.departmentID],
            ...site,
            timestamp,
        });
    }
    return results;
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
 * mychart.AddFutureWeeks calls this function to get the data it should POST to the API.
 */
function PostDataCallback(startDateFormatted) {
    const deptFilter = {};
    for (const site of sites) {
        deptFilter[site.departmentID] = true;
    }
    const filters = `{"Providers":{"56394":true,"56395":true,"56396":true,"56475":true,"56476":true,"56526":true,"56527":true,"56528":true,"56529":true,"56530":true,"56531":true,"56532":true,"56533":true},"Departments":${JSON.stringify(
        deptFilter
    )},"DaysOfWeek":{"0":true,"1":true,"2":true,"3":true,"4":true,"5":true,"6":true},"TimesOfDay":"both"}`;
    return `view=grouped&specList=15&vtList=5060&start=${startDateFormatted}&filters=${encodeURIComponent(
        filters
    )}`;
}
