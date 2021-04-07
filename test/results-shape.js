const assert = require("assert");
const chai = require("chai");
const sinon = require("sinon");
const expect = chai.expect;
const getGeocode = require("../getGeocode");

let results;

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
        type: ["object"],
        subObject: {
            hasAvailability: { required: true, type: ["boolean"] },
            numberAvailableAppointments: { required: true, type: ["number"] },
            signUpLink: { conditional: signUpLinkValidity, type: ["string"] },
        },
    },
    city: { required: true, type: ["string"] },
    debug: { optional: true, type: ["string", "object"] },
    extraData: { optional: true, type: ["string", "object"] },
    hasAvailability: { required: true, type: ["boolean"] },
    latitude: { required: true, type: ["number"] },
    longitude: { required: true, type: ["number"] },
    massVax: { optional: true, type: ["boolean"] },
    name: { required: true, type: ["string"] },
    restrictions: { optional: true, type: ["string"] },
    signUpLink: { conditional: signUpLinkValidity, type: ["string"] },
    siteTimestamp: { conditional: true, type: ["string", "object"] },
    state: { optional: true, type: ["string"] },
    street: { optional: true, type: ["string"] },
    timestamp: { required: true, type: ["string", "object"] }, // Date() is object type
    totalAvailability: {
        conditional: (entry) => entry.totalAvailability || entry.availability,
        type: ["number"],
    },
    zip: { optional: true, type: ["string"] },
};

function keyAndChildrenAreValid(object, key, shapeObject) {
    //verify the key is legal
    assert.ok(
        shapeObject[key],
        `${key} is not valid! ${JSON.stringify(object)}`
    );

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

function requiredKeyAndChildrenArePresent(object, shapeObject, key) {
    //verify the key is legal
    if (shapeObject[key].required) {
        expect(key in object, `${key} is required but is missing!`).to.exist;
    }
    if (object[key]) {
        expect(
            shapeObject[key].type,
            `${key} is of unexpected type ${typeof object[
                key
            ]}! ${JSON.stringify(object)}`
        ).to.include.members([typeof object[key]]);
    }
    if (shapeObject[key].subObject && object[key]) {
        //if there is an object within this key, evaluate it
        const subObjectKeys = Object.keys(shapeObject[key].subObject);
        for (const subObjectKey of subObjectKeys) {
            //recursively look down the tree
            requiredKeyAndChildrenArePresent(
                object[key],
                shapeObject[key].subObject,
                subObjectKey
            );
        }
    }
}

describe("shape of return object", async function () {
    let finalNumberTests;
    before(async function () {
        const originalConsole = console.log;
        this.timeout(10 * 60 * 1000); //10 minutes, shouldn't take that long though
        console.log = () => {};
        sinon
            .stub(getGeocode, "getAllCoordinates")
            .callsFake((locations, ...rest) => {
                return locations.map((location) => ({
                    ...location,
                    latitude: 100,
                    longitude: -100,
                }));
            });
        results = await require("../scraper")
            .handler()
            .then((res) => res.results);
        const results_no_browser = await require("../scrapers_no_browser")
            .handler()
            .then((res) => res.results);
        results = [...results, ...results_no_browser];
        finalNumberTests = results.length;
        console.log = originalConsole;
    });

    it("has no unauthorized keys", (done) => {
        let testNumber = 0;
        for (const result of results) {
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

    it("isn't missing any required keys", (done) => {
        let testNumber = 0;
        for (const result of results) {
            for (const key in keys) {
                requiredKeyAndChildrenArePresent(result, keys, key);
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
