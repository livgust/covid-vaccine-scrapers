const { site } = require("./config");
const mychart = require("../../lib/MyChartAPI");
const moment = require("moment");

const siteId = "3210339";
const vt = "1089";
const dept = "222004005";

module.exports = async function GetAvailableAppointments() {
    console.log(`HarborHealth starting.`);
    const webData = await ScrapeWebsiteData();
    console.log(`HarborHealth done.`);
    return {
        parentLocationName: "HarborHealth",
        timestamp: moment().format(),
        individualLocationData: [
            {
                ...webData[dept],
                /* adding site last because myChart is returning address
                 * of the provider instead of the address of the clinic
                 */
                ...site,
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
        `https://mychartos.ochin.org/mychart/SignupAndSchedule/EmbeddedSchedule?id=${siteId}&vt=${vt}&dept=${dept}&view=plain&public=1&payor=-1,-2,-3,4655,4660,1292,4661,5369,5257,1624,4883&lang=english1089`
    );

    return mychart.AddFutureWeeks(
        "mychartos.ochin.org",
        "/mychart/OpenScheduling/OpenScheduling/GetOpeningsForProvider",
        cookie,
        verificationToken,
        10,
        mychart.CommonPostDataCallback([siteId], [dept], vt)
    );
}
