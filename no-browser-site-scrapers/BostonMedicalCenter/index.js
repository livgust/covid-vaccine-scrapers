const { sites, providerIDs } = require("./config");
const mychart = require("../../lib/MyChartAPI");
const moment = require("moment");

const departmentIDs = sites.map((site) => site.departmentID);
const vt = "2008";

module.exports = async function GetAvailableAppointments() {
    console.log("BMC starting.");
    const webData = await ScrapeWebsiteData();
    console.log("BMC done.");
    const results = [];
    const timestamp = moment().format();

    for (const site of sites) {
        const { departmentID, ...restSite } = site;
        results.push({
            ...webData[site.departmentID],
            ...restSite,
        });
    }
    return {
        parentLocationName: "Boston Medical Center",
        isChain: true,
        timestamp,
        individualLocationData: results,
    };
};

async function ScrapeWebsiteData() {
    // We need to go through the flow and use a request verification token
    const [
        cookie,
        verificationToken,
    ] = await mychart.GetCookieAndVerificationToken(
        `https://mychartscheduling.bmc.org/mychartscheduling/SignupAndSchedule/EmbeddedSchedule?id=${providerIDs.join(
            ","
        )}&dept=${departmentIDs.join(",")}&vt=${vt}&lang=en-US`
    );

    return mychart.AddFutureWeeks(
        "mychartscheduling.bmc.org",
        `/MyChartscheduling/OpenScheduling/OpenScheduling/GetOpeningsForProvider?noCache=${Math.random()}`,
        cookie,
        verificationToken,
        10,
        mychart.CommonPostDataCallback(providerIDs, departmentIDs, vt)
    );
}
