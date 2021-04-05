const assert = require("assert");
const chai = require("chai");
const expect = chai.expect;

function signUpLinkValidity(entry) {
    if (entry.signUpLink) {
        return true;
    } else if (!entry.availability) {
        return false;
    } else {
        for (const availabilityEntry of Object.values(entry.availability)) {
            if (!availabilityEntry.signUpLink) {
                return false;
            }
        }
        return true;
    }
}

const keys = {
    availability: {
        conditional: (entry) => entry.totalAvailability || entry.availability,
        type: "object",
        subObject: {
            hasAvailability: { required: true, type: "boolean" },
            numberAvailableAppointments: { required: true, type: "number" },
            signUpLink: { conditional: signUpLinkValidity, type: "string" },
        },
    },
    city: { required: true, type: "string" },
    debug: { optional: true, type: ["string", "object"] },
    extraData: { optional: true, type: ["string", "object"] },
    hasAvailability: { required: true, type: "boolean" },
    latitude: { required: true, type: "number" },
    longitude: { required: true, type: "number" },
    massVax: { optional: true, type: "boolean" },
    name: { required: true, type: "string" },
    restrictions: { optional: true, type: "string" },
    signUpLink: { conditional: signUpLinkValidity, type: "string" },
    siteTimestamp: { conditional: true, type: ["string", "object"] },
    state: { optional: true, type: "string" },
    street: { optional: true, type: "string" },
    timestamp: { required: true, type: "object" }, // Date() is object type
    totalAvailability: {
        conditional: (entry) => entry.totalAvailability || entry.availability,
        type: "number",
    },
    website: { optional: true },
    zip: { optional: true, type: "string" },
};

function keyAndChildrenAreValid(object, key, shapeObject) {
    //verify the key is legal
    assert.ok(shapeObject[key], `${key} is not valid!`);

    //if there is an object within this key, evaluate it
    if (shapeObject[key].subObject) {
        const subObjects = Object.values(object[key]);
        for (const subObject of subObjects) {
            for (const subKey of Object.keys(subObject)) {
                //recursively look down the tree
                keyAndChildrenAreValid(
                    subObject,
                    subKey,
                    shapeObject[key].subObject
                );
            }
        }
    }
}

describe("shape of return object", async function () {
    this.timeout(3 * 60 * 1000); //3 minutes, shouldn't take that long though
    let results;
    before(async () => {
        const originalConsole = console.log;
        console.log = () => {};
        results = await require("../scraper").handler();
        const results_no_browser = await require("../scrapers_no_browser").handler();
        results = [...results, ...results_no_browser];
        console.log = originalConsole;
    });

    it("has no unauthorized keys", (done) => {
        const finalNumberTests = results.length;
        let testNumber = 0;
        for (const result of results) {
            console.log(result);
            for (const key of Object.keys(result)) {
                keyAndChildrenAreValid(result, key, keys);
            }
            testNumber++;
        }

        if (testNumber === finalNumberTests) {
            done();
        } else {
            throw new Error(
                `${testNumber} tests run, expected ${finalNumberTests}`
            );
        }
    });
});
