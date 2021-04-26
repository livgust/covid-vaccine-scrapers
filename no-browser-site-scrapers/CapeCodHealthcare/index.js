const { site } = require("./config");
const mychart = require("../../lib/MyChartAPI");
const moment = require("moment");

const siteId = "15342";
const vt = "696";
const dept = "10102135";

module.exports = async function GetAvailableAppointments() {
    console.log(`CapeCodHealthcare starting.`);
    const webData = await ScrapeWebsiteData();
    console.log(`CapeCodHealthcare done.`);
    return {
        parentLocationName: "CapeCodHealthcare",
        timestamp: moment().format(),
        individualLocationData: [
            {
                ...site,
                ...webData[dept],
            },
        ],
    };
};

async function ScrapeWebsiteData() {
    // We need to go through the flow and use a request verification token
    const [
        cookie,
        verificationToken,
    ] = await mychart.GetCookieAndVerificationToken(
        `https://mychart-openscheduling.et1149.epichosted.com/MyChart/OpenScheduling/SignupAndSchedule/EmbeddedSchedule?id=${siteId}&vt=${vt}&dept=${dept}&view=plain&public=1&payor=-1,-2,-3,4655,4660,1292,4661,5369,5257,1624,4883&lang=english1089`
    );

    return mychart.AddFutureWeeks(
        "mychart-openscheduling.et1149.epichosted.com",
        "/mychart/OpenScheduling/OpenScheduling/GetOpeningsForProvider",
        cookie,
        verificationToken,
        10,
        mychart.CommonPostDataCallback([siteId], [dept], vt)
    );
}
