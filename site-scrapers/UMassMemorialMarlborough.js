const sites = require("../data/sites.json");
const https = require("https");
const html_parser = require("node-html-parser");
const mychart = require("./MyChartAPI");

module.exports = async function GetAvailableAppointments() {
    console.log("UMass Memorial Marlborough starting.");
    const webData = await ScrapeWebsiteData();
    console.log("UMass Memorial Marlborough done.");
    return {
        ...sites.UMassMemorialMarlborough,
        ...webData,
    };
};

async function ScrapeWebsiteData() {
    // We need to go through the flow and use a request verification token
    const [
        cookie,
        verificationToken,
    ] = await mychart.GetCookieAndVerificationToken(
        "https://mychartonline.umassmemorial.org/mychart/openscheduling?specialty=15&hidespecialtysection=1"
    );
    // Setup the return object.
    const results = { availability: {}, hasAvailability: false };

    // Setup the post data to answer the survey questions
    let startDate = new Date();
    startDate.setDate(startDate.getDate());
    const filters =
        '{"Providers":{"56394":true,"56395":true,"56396":true,"56475":true,"56476":true,"56526":true,"56527":true,"56528":true,"56529":true,"56530":true,"56531":true,"56532":true,"56533":true},"Departments":{"102001144":true,"104001144":true,"111029146":true},"DaysOfWeek":{"0":true,"1":true,"2":true,"3":true,"4":true,"5":true,"6":true},"TimesOfDay":"both"}';
    // The data can only be returned for one week. Check the calendar for 10 future weeks.
    for (const i of Array(10).keys()) {
        // Format the date as 'YYYY-MM-dd'
        let startDateFormatted = `${startDate.getFullYear()}-${(
            "0" +
            (startDate.getMonth() + 1)
        ).slice(-2)}-${("0" + startDate.getDate()).slice(-2)}`;

        let postData = `view=grouped&specList=15&vtList=5060&start=${startDateFormatted}&filters=${encodeURIComponent(
            filters
        )}`;
        let postResponse = await mychart.GetSchedule(
            cookie,
            verificationToken,
            "mychartonline.umassmemorial.org",
            "/MyChart/OpenScheduling/OpenScheduling/GetScheduleDays",
            postData
        );
        if (postResponse) {
            mychart.UpdateResults(results, postResponse);
        } else {
            console.error("Null response returned from scheduling request");
        }
        // Increment the date another week.
        startDate.setDate(startDate.getDate() + 7);
    }
    return results;
}
