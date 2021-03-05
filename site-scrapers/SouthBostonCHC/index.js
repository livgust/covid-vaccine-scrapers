const { site } = require("./config");
const mychart = require("../../lib/MyChartAPI");

const siteId = "1900119";
const vt = "1089";
const dept = "150001007";

module.exports = async function GetAvailableAppointments() {
    console.log(`${site.name} starting.`);
    const webData = await ScrapeWebsiteData();
    console.log(`${site.name} done.`);
    return {
        ...site,
        ...webData[dept],
        timestamp: new Date(),
    };
};

async function ScrapeWebsiteData() {
    // We need to go through the flow and use a request verification token
    const [
        cookie,
        verificationToken,
    ] = await mychart.GetCookieAndVerificationToken(
        `https://mychartos.ochin.org/mychart/SignupAndSchedule/EmbeddedSchedule?id=${siteId}&dept=${dept}&vt=${vt}&payor=-1,-2,-3,4653,1624,4660,4655,1292,4881,5543,5979,2209,5257,1026,1001,2998,3360,3502,4896,2731`
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
 * This is the callback function.
 * The string was retrieved from the Form Data found in a GetOpeningsForProvider request.
 */
function PostDataCallback(startDateFormatted) {
    return `id=${siteId}&vt=${vt}&dept=${dept}&view=grouped&start=${startDateFormatted}&filters=%7B%22Providers%22%3A%7B%221900119%22%3Atrue%7D%2C%22Departments%22%3A%7B%22150001007%22%3Atrue%7D%2C%22DaysOfWeek%22%3A%7B%220%22%3Atrue%2C%221%22%3Atrue%2C%222%22%3Atrue%2C%223%22%3Atrue%2C%224%22%3Atrue%2C%225%22%3Atrue%2C%226%22%3Atrue%7D%2C%22TimesOfDay%22%3A%22both%22%7D`;
}
