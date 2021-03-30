const scraper = require("../no-browser-site-scrapers/ZocDoc/index");
const helper = require("../no-browser-site-scrapers/ZocDoc/zocdocBase");
const generator = require("../no-browser-site-scrapers/ZocDoc/zocdoc-config-generator");
const { expect } = require("chai");
const file = require("../lib/file");

const { someAvailability } = require("./ZocDoc/sample-availability");

const { locationData } = require("./ZocDoc/location-data");

/**
 * This test the config generator utility. Not a part of scraping but gathering
 * info from fetching provider data from ZocDoc. Automates site info creation.
 */
describe.skip("Config generator test", function () {
    it("should provide id, name and location for each site", async function () {
        const providerDetailsJson = locationData; // await generator.fetchProviderDetails();
        const providerDetails = generator.parseProviderDetails(
            providerDetailsJson
        );

        Object.values(providerDetails).forEach((provider) =>
            console.log(`${JSON.stringify(provider)}`)
        );

        expect(Object.entries(providerDetails).length).equals(7);
    });
});

describe("Provider availability test using scraper and canned data", function () {
    const testFetchService = {
        async fetchAvailability() {
            return someAvailability;
        },
    };
    it("should provide availability for each site", async function () {
        const results = await scraper(testFetchService);

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
        const hasAvailability = Object.values(results).map(
            (result) => result.hasAvailability
        );

        expect(hasAvailability).is.deep.equal(expected);

        console.log(`${JSON.stringify(results)}`);

        if (process.env.DEVELOPMENT) {
            file.write(
                `${process.cwd()}/out.json`,
                `${JSON.stringify(results, null, "   ")}`
            );
        }
    });
});

describe.skip("Testing zocdocBase with canned data", function () {
    it("should provide availability for each site", async function () {
        const providerAvailabilityJson = await helper.fetchAvailability();

        const providerAvailability = helper.parseAvailability(
            providerAvailabilityJson
        );

        Object.entries(providerAvailability).forEach((provider) =>
            console.log(`${JSON.stringify(provider)}`)
        );

        expect(Object.keys(providerAvailability).length).equals(8);
    });
});
