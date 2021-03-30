const scraper = require("../site-scrapers/ZocDoc/index");
const helper = require("../site-scrapers/ZocDoc/zocdocBase");
const generator = require("../site-scrapers/ZocDoc/zocdoc-config-generator");
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

        // Use this as the basis for config.js. You will need to manually add
        // signUpLink URLs, and add the Tufts MC site info.
        // writeFile("provider-details.json", providerDetails);
    });
});

describe("Provider availability test using scraper and canned data", function () {
    const testFetchService = {
        async fetchAvailability() {
            return someAvailability;
        },
    };
    it("should provide availability for each site", async function () {
        const results = await scraper(browser, testFetchService);

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

/*** utilty functions ***/

function writeFile(filename, results) {
    // During development, getting data such provider details (name, street, city, zip) is
    // useful for constructing the config.js data. To turn this on, add COLLECT_DATA=true
    // to your covid-vaccine-scrapers/.env file.
    if (process.env.COLLECT_DATA) {
        file.write(
            `${process.cwd()}/${filename}`,
            `${JSON.stringify(results, null, "   ")}`
        );
    }
}
