const scraperData = require("./lib/db/scraper_data");
exports.handler = async () => {
    const data = await scraperData.getAppointmentsForAllLocations();

    const response = {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(data),
    };
    return response;
};
