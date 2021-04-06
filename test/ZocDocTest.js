const scraper = require("../no-browser-site-scrapers/ZocDoc/index");
const helper = require("../no-browser-site-scrapers/ZocDoc/zocdocBase");
const generator = require("../no-browser-site-scrapers/ZocDoc/zocdoc-config-generator");
const { expect } = require("chai");
const moment = require("moment");
const file = require("../lib/file");
const config = require("../no-browser-site-scrapers/ZocDoc/config");

const { someAvailability } = require("./ZocDoc/sample-availability");

const { locationData } = require("./ZocDoc/location-data");

/**
 * This test the config generator utility. Not a part of scraping but gathering
 * info from fetching provider data from ZocDoc. Automates site info creation.
 */
describe("ZocDoc Config generator test", function () {
    it("should provide id, name and location for each site", async function () {
        const providerDetailsJson = locationData; // await generator.fetchProviderDetails();
        const providerDetails = generator.parseProviderDetails(
            providerDetailsJson
        );

        // Object.values(providerDetails).forEach((provider) =>
        //     console.log(`${JSON.stringify(provider)}`)
        // );

        expect(Object.entries(providerDetails).length).equals(7);
    });
});

describe("ZocDoc Provider availability test using scraper and canned data", function () {
    const testFetchService = {
        async fetchAvailability() {
            return someAvailability;
        },
    };
    const beforeTime = moment();

    it("should provide availability for each site, and the results objects structure should conform", async function () {
        const results = await scraper(false, testFetchService);

        const expected = [
            true,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
        ];
        const hasAvailability = Object.values(
            results.individualLocationData
        ).map((result) => result.hasAvailability);
        const afterTime = moment();

        expect(hasAvailability).is.deep.equal(expected);

        /*
        Structure conformance expectations:

        - All the timestamps are expected to be between before
            and after when the scraper was executed
        - Each site's results object must have a property named "hasAvailability"
         */
        results.individualLocationData.forEach((result) => {
            expect(moment(result.timestamp).isBetween(beforeTime, afterTime));
            expect(result.hasAvailability).is.not.undefined;
        });

        // console.log(`${JSON.stringify(results)}`);

        if (process.env.DEVELOPMENT) {
            file.write(
                `${process.cwd()}/out_no_browser.json`,
                `${JSON.stringify(results, null, "   ")}`
            );
        }
    });
});

describe("ZocDoc Testing zocdocBase with live data", function () {
    it("should provide availability for each site listed in config.js", async function () {
        const providerAvailabilityJson = await helper.fetchAvailability();

        const providerAvailability = helper.parseAvailability(
            providerAvailabilityJson
        );

        // Object.entries(providerAvailability).forEach((provider) =>
        //     console.log(`${JSON.stringify(provider)}`)
        // );

        expect(Object.keys(providerAvailability).length).equals(
            Object.keys(config.sites).length
        );
    });
});
