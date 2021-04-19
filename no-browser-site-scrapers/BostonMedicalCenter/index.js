const { entityName, settingsUrl, signUpLink } = require("./config");
const mychart = require("../../lib/MyChartAPI");
const moment = require("moment");
const { default: fetch } = require("node-fetch");

module.exports = async function GetAvailableAppointments() {
    console.log(`${entityName} staring.`);
    const webData = await ScrapeWebsiteData();
    console.log(`${entityName} done.`);

    const results = Object.values(webData);
    for (const result of results) {
        result["signUpLink"] = signUpLink;
    }
    const timestamp = moment().format();

    return {
        parentLocationName: "Boston Medical Center",
        isChain: true,
        timestamp,
        individualLocationData: results,
    };
};

async function ScrapeWebsiteData() {
    const data = await getSiteData();

    // Request verification token to use in further access
    const [
        cookie,
        verificationToken,
    ] = await mychart.GetCookieAndVerificationToken(
        `https://mychartscheduling.bmc.org/mychartscheduling/SignupAndSchedule/EmbeddedSchedule?id=${data.providerIds.join(
            ","
        )}&dept=${data.departmentIds.join(",")}&vt=${data.vt}&lang=en-US`
    );

    return mychart.AddFutureWeeks(
        "mychartscheduling.bmc.org",
        `/MyChartscheduling/OpenScheduling/OpenScheduling/GetOpeningsForProvider?noCache=${Math.random()}`,
        cookie,
        verificationToken,
        10,
        mychart.CommonPostDataCallback(
            data.providerIds,
            data.departmentIds,
            data.vt
        )
    );
}

/**
 * Get all possible provider and respective department IDs, and the vt (visit type) for BMC.
 *
 * Kudos to the folks at VaccineTimes
 * (https://github.com/ginkgobioworks/vaccinetime/blob/main/lib/sites/my_chart.rb)
 * who somehow discovered this settings URL.
 *
 * @returns
 */
async function getSiteData() {
    const text = await fetch(`${settingsUrl()}`)
        .then((res) => res.text())
        .then((text) => {
            return text;
        })
        .catch((error) =>
            console.error(`failed to get BMC providers from setting: ${error}`)
        );

    /*
        Looking for content in the following:

        url: "https://mychartscheduling.bmc.org/mychartscheduling/SignupAndSchedule/EmbeddedSchedule?id=10033909,10033319,10033364,10033367,10033370,10033706,10033083,10033373&dept=10098252,10098245,10098242,10098243,10098244,10105138,10108801,10098241&vt=2008",
    */
    const relevantText = text.match(/EmbeddedSchedule.+/)[0];
    const ids = relevantText.match(/id=([\d,]+)&/)[1].split(",");
    const deptIds = relevantText.match(/dept=([\d,]+)&/)[1].split(",");
    const vt = relevantText.match(/vt=(\d+)/)[1];

    return { providerIds: ids, departmentIds: deptIds, vt: vt };
}
