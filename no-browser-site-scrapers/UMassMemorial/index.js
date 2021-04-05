const { sites, providers } = require("./config");
const mychart = require("../../lib/MyChartAPI");

const departmentIDs = sites.map((site) => site.departmentID);

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
    const Departments = mychart.CommonFilters.Departments(departmentIDs);
    const Providers = mychart.CommonFilters.Providers(providers);
    const { DaysOfWeek, TimesOfDay } = mychart.CommonFilters;

    const filters = JSON.stringify({
        Providers,
        Departments,
        DaysOfWeek,
        TimesOfDay,
    });
    return `view=grouped&specList=15&vtList=5060&start=${startDateFormatted}&filters=${encodeURIComponent(
        filters
    )}`;
}
