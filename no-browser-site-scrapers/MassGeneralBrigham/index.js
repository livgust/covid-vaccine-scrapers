const { entityName, startUrl, schedulePath, sites, vt } = require("./config");
const mychart = require("../../lib/MyChartAPI");
const moment = require("moment");

module.exports = async function GetAvailableAppointments() {
    console.log(`${entityName} starting.`);
    const webData = await ScrapeWebsiteData();
    console.log(`${entityName} done.`);
    const results = [];
    const timestamp = moment().format();

    for (const site of sites) {
        results.push({
            ...webData[site.private.departmentID],
            ...site.public,
        });
    }
    return {
        parentLocationName: `${entityName}`,
        isChain: true,
        timestamp,
        individualLocationData: results,
    };
};

async function ScrapeWebsiteData() {
    const providerIDs = sites.flatMap((item) => item.private.providerId);
    const departmentIDs = sites.flatMap((item) => item.private.departmentID);

    // Request verification token which is needed to proceed onto fetching calendars
    const [
        cookie,
        verificationToken,
    ] = await mychart.GetCookieAndVerificationToken(
        `${startUrl}?id=${providerIDs.join(",")}&dept=${departmentIDs.join(
            ","
        )}&vt=${vt}&lang=en-US`
    );

    return mychart.AddFutureWeeks(
        "patientgateway.massgeneralbrigham.org",
        `${schedulePath()}`,
        cookie,
        verificationToken,
        10,
        mychart.CommonPostDataCallback(providerIDs, departmentIDs, vt)
    );
}
