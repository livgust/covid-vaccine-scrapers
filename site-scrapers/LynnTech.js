const sites = require("../data/sites.json");
const mychart = require("../lib/MyChartAPI");

module.exports = async function GetAvailableAppointments() {
    console.log("LynnTech starting.");
    const webData = await ScrapeWebsiteData();
    console.log("LynnTech done.");
    return {
        ...sites.LynnTech,
        ...webData,
    };
};

const siteId = "13300632"
const vt = "1089";
const dept = "133001025";

async function ScrapeWebsiteData() {
    // We need to go through the flow and use a request verification token
    const [
        cookie,
        verificationToken,
    ] = await mychart.GetCookieAndVerificationToken(
        `https://mychartos.ochin.org/mychart/SignupAndSchedule/EmbeddedSchedule?id=${siteId}&vt=${vt}&dept=${dept}&view=plain&public=1&payor=-1,-2,-3,4655,4660,1292,4661,5369,5257,1624,4883&lang=english1089`
    );

    return mychart.AddFutureWeeks(
        "mychartos.ochin.org",
        "/mychart/OpenScheduling/OpenScheduling/GetOpeningsForProvider",
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
    return `id=${siteId}&vt=${vt}&dept=${dept}&view=plain&start=${startDateFormatted}&filters=%7B%22Providers%22%3A%7B%2213300632%22%3Atrue%7D%2C%22Departments%22%3A%7B%22133001025%22%3Atrue%7D%2C%22DaysOfWeek%22%3A%7B%220%22%3Atrue%2C%221%22%3Atrue%2C%222%22%3Atrue%2C%223%22%3Atrue%2C%224%22%3Atrue%2C%225%22%3Atrue%2C%226%22%3Atrue%7D%2C%22TimesOfDay%22%3A%22both%22%7D`;
}

