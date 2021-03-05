const { sites } = require("./config");
const mychart = require("../../lib/MyChartAPI");

module.exports = async function GetAvailableAppointments() {
    console.log("BMC starting.");
    const webData = await ScrapeWebsiteData();
    console.log("BMC done.");
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
        "https://mychartscheduling.bmc.org/mychartscheduling/SignupAndSchedule/EmbeddedSchedule?id=10033319,10033364,10033367,10033370,10033373&dept=10098245,10098242,10098243,10098244,10098241&vt=2008&lang=en-US"
    );
    return mychart.AddFutureWeeks(
        "mychartscheduling.bmc.org",
        "/MyChartscheduling/OpenScheduling/OpenScheduling/GetOpeningsForProvider?noCache=0.4024598146273777",
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
    const deptFilter = {};
    for (const site of sites) {
        deptFilter[site.departmentID] = true;
    }
    const filters = `{"Providers":{"10033319":true,"10033364":true,"10033367":true,"10033370":true,"10033373":true},"Departments":${JSON.stringify(
        deptFilter
    )},"DaysOfWeek":{"0":true,"1":true,"2":true,"3":true,"4":true,"5":true,"6":true},"TimesOfDay":"both"}`;

    const deptList = sites.map((s) => s.departmentID).join(",");
    return `id=10033319%2C10033364%2C10033367%2C10033370%2C10033373&vt=2008&dept=${encodeURIComponent(
        deptList
    )}&view=grouped&start=${startDateFormatted}&filters=${encodeURIComponent(
        filters
    )}`;
}
