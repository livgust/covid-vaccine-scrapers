const sites = require("../data/sites.json");
const mychart = require("./MyChartAPI");

module.exports = async function GetAvailableAppointments() {
    console.log("UmmassMercantile starting.");
    const webData = await ScrapeWebsiteData();
    console.log("UmassMercantile done.");
    return {
        ...sites.UmassMercantile,
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

        // const postData = `view=grouped&specList=15&vtList=5060&start=2021-02-21&filters=%7B%22Providers%22%3A%7B%2256394%22%3Atrue%2C%2256395%22%3Atrue%2C%2256396%22%3Atrue%2C%2256475%22%3Atrue%2C%2256476%22%3Atrue%2C%2256526%22%3Atrue%2C%2256527%22%3Atrue%2C%2256528%22%3Atrue%2C%2256529%22%3Atrue%2C%2256530%22%3Atrue%2C%2256531%22%3Atrue%2C%2256532%22%3Atrue%2C%2256533%22%3Atrue%7D%2C%22Departments%22%3A%7B%22102001144%22%3Atrue%2C%22104001144%22%3Atrue%2C%22111029146%22%3Atrue%7D%2C%22DaysOfWeek%22%3A%7B%220%22%3Atrue%2C%221%22%3Atrue%2C%222%22%3Atrue%2C%223%22%3Atrue%2C%224%22%3Atrue%2C%225%22%3Atrue%2C%226%22%3Atrue%7D%2C%22TimesOfDay%22%3A%22both%22%7D`
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
