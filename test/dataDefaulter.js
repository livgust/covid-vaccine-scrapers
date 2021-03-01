const assert = require("assert");
const dataDefaulter = require("./../data/dataDefaulter");
const moment = require("moment");

// NOTE: Timestamps don't really matter in these tests, as long as they exist.

const realisticTestData = [
    {
        name: "Atrius Health",
        street: "100 Second Avenue ",
        city: "Needham",
        zip: "02494",
        website: "https://myhealth.atriushealth.org/fr/",
        dphLink: "https://myhealth.atriushealth.org/DPH",
        signUpLink: "https://myhealth.atriushealth.org/fr/",
        availability: {},
        hasAvailability: false,
        timestamp: moment().local(),
    },
    {
        id: 24181,
        name: "DoubleTree Hotel - Danvers",
        street: "50 Ferncroft Rd.",
        city: "Danvers",
        zip: "01923",
        signUpLink: "https://curative.com/sites/24181",
        hasAvailability: true,
        availability: {
            "02/27/2021": {
                numberAvailableAppointments: 1,
                hasAvailability: true,
            },
            "02/28/2021": {
                numberAvailableAppointments: 0,
                hasAvailability: false,
            },
        },
        timestamp: moment().local(),
    },
];

const realisticDefaultData = [
    {
        id: 24181,
        name: "DoubleTree Hotel - Danvers",
        street: "50 Ferncroft Rd.",
        city: "Danvers",
        zip: "01923",
        signUpLink: "https://curative.com/sites/24181",
        hasAvailability: false,
        availability: {
            "02/18/2021": {
                numberAvailableAppointments: 0,
                hasAvailability: false,
            },
            "02/19/2021": {
                numberAvailableAppointments: 0,
                hasAvailability: false,
            },
        },
        timestamp: moment().local(),
    },
    {
        name: "Family Practice Group",
        street: "11 Water Street, Suite 1-A",
        city: "Arlington",
        zip: "02476",
        website: "https://bookfpg.timetap.com/#/",
        signUpLink: "https://bookfpg.timetap.com/#/",
        hasAvailability: false,
        timestamp: moment().local(),
    },
];

describe("Simple behavior", () => {
    it("should return scraped results when no cache values are present", () => {
        assert.deepStrictEqual(
            dataDefaulter.mergeResults(realisticTestData, []),
            realisticTestData
        );
    });
    it("should return cached results when no scraped results are present", () => {
        assert.deepStrictEqual(
            dataDefaulter.mergeResults([], realisticDefaultData),
            realisticDefaultData
        );
    });
});

describe("Conditionally inserting defaults", () => {
    const finalResults = dataDefaulter.mergeResults(
        realisticTestData,
        realisticDefaultData
    );
    it("has the correct number of entries", () => {
        // Atrius, Danvers, and then default Family Practice Group
        assert.strictEqual(finalResults.length, 3);
    });
    it("does not replace data with cache", () => {
        // Danvers stays the same
        assert.deepStrictEqual(finalResults[1], realisticTestData[1]);
    });

    it("adds default data where an entry doesn't exist", () => {
        // Family Practice Group is added to the results array
        assert.deepStrictEqual(finalResults[2], realisticDefaultData[1]);
    });
});

describe("Tolerance for stale data", () => {
    const secondsOfTolerance = 60;
    it("does not include stale data if specified", () => {
        const timestampedDefault = {
            ...realisticDefaultData[0],
            timestamp: new Date() - (secondsOfTolerance + 1) * 1000,
        };
        assert.deepStrictEqual(
            dataDefaulter.mergeResults(
                [],
                [timestampedDefault],
                secondsOfTolerance
            ),
            []
        );
    });

    it("includes recent data within the tolerance timeframe", () => {
        const timestampedDefault = {
            ...realisticDefaultData[0],
            timestamp: new Date() - (secondsOfTolerance - 1) * 1000,
        };
        assert.deepStrictEqual(
            dataDefaulter.mergeResults(
                [],
                [timestampedDefault],
                secondsOfTolerance
            ),
            [timestampedDefault]
        );
    });
});

describe("Key generator", () => {
    it("generates the expected key", () => {
        assert.strictEqual(
            dataDefaulter.generateKey(realisticTestData[1]),
            "doubletreehoteldanvers|50ferncroftrd|danvers|01923|"
        );
    });
});
