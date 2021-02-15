const sites = require("../data/sites.json");

const noAppointmentMatchString = "no locations with available appointments";

module.exports = async function GetAvailableAppointments(browser) {
    console.log("Hannaford starting.");
    const webData = await ScrapeWebsiteData(browser);
    console.log("Hannaford done.");
    return sites.Hannaford.locations.map((loc, i) => {
        const newLoc = { ...loc };
        const response = webData[i];
        return {
            name: `Hannaford (${loc.city})`,
            hasAvailability: response.indexOf(noAppointmentMatchString) == -1,
            extraData: response.length
                ? response.substring(1, response.length - 1)
                : response, //take out extra quotes
            signUpLink: sites.Hannaford.website,
            ...loc,
        };
    });
};

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    const results = [];
    for (let [i, loc] of sites.Hannaford.locations.entries()) {
        await page.goto(sites.Hannaford.website);
        await page.solveRecaptchas().then(({ solved }) => {
            if (solved.length) {
                return page.waitForNavigation();
            } else {
                return;
            }
        });

        //if (!results[i]) {
        await page.evaluate(
            () => (document.getElementById("zip-input").value = "")
        );
        await page.type("#zip-input", loc.zip);
        const [searchResponse, ...rest] = await Promise.all([
            Promise.race([
                page.waitForResponse(
                    "https://hannafordsched.rxtouch.com/rbssched/program/covid19/Patient/CheckZipCode"
                ),
                page.waitForNavigation(),
            ]),
            page.click("#btnGo"),
        ]);

        let result = '';
        try {
            result = (await searchResponse.buffer()).toString();
        } catch (e) {
            //console.log("buffer failed, probably because the page changed during the 'waitForResponse'");
        }

        //if there's something available, log it with a unique name so we can check it out l8r g8r
        if (result.indexOf(noAppointmentMatchString) == -1) {
            // let today = new Date();
            // today =
            //     today.getFullYear() +
            //     "-" +
            //     (today.getMonth() + 1) +
            //     "-" +
            //     today.getDate();
            // const filename =
            //     "hannaford-zip-" + loc.zip + "-date-" + today + ".png";
            // await page.screenshot({ path: filename });
            //await page.waitForSelector("#address");
            await page.waitForSelector('#address:not(:empty)');
            // the same facility could be returned for multiple zips
            // if the same facility is returned we don't need to get the same schedule data again

            //const handle = await page.evaluateHandle(() => ({window, document}));
            let facilityId = await page.evaluate(() => window.$.calendar.facilityId);
            let address = await page.evaluate(() => window.$("#address").html().trim());

            console.log(address.trim());
            if(address == loc.street){
                result = " appointments found ";
            } else {
                result = noAppointmentMatchString;
            }



        }
        results[i] = result;


        //} // end if results


    }

    return results;
}
