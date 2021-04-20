const moment = require("moment");

const entityName = "Boston Medical Center";

const signUpLink =
    "https://mychartscheduling.bmc.org/MyChartscheduling/covid19#/scheduling";

/** Site details are aquired from a request to the settingsUrl. Hence, no `site` constant in this config file. */
const settingsUrl = () =>
    `https://mychartscheduling.bmc.org/MyChartscheduling/scripts/guest/covid19-screening/custom/settings.js?updateDt=#${moment().unix()}`;

module.exports = {
    entityName,
    settingsUrl,
    signUpLink,
};
