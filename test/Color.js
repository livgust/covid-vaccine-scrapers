const assert = require("assert");
const { formatResponse } = require("./../site-scrapers/Color");
const chai = require("chai");
const expect = chai.expect;

describe("Transformations", () => {
    it("should return no availabilities when there is -1", () => {
        // mock out the availability request
        const response = `{"results": [{
            "start": "2021-02-22T14:00:00+00:00",
            "end": "2021-02-22T14:04:00+00:00",
            "capacity": 1,
            "remaining_spaces":-1
        }]}`;
        expect(formatResponse(response))
            .to.deep.include({
                hasAvailability: false,
            })
            .and.nested.property("availability")
            .deep.equal({});
    });
    it("should return one availabilitiy when there is one", () => {
        // mock out the http request that returns the token
        const response = `{"results":[{
            "start": "2021-02-22T14:00:00+00:00",
            "end": "2021-02-22T14:04:00+00:00",
            "capacity": 1,
            "remaining_spaces":1
        }]}`;
        // run the test
        /**
         * Expect the result to look like:
         * {
         *   "hasAvailability": true,
         *   "availability": {
         *      "2/22/2021": {
         *          hasAvailability: true,
         *          numberAvailableAppointments: 1
         *      ]
         *   }
         * }
         */
        expect(formatResponse(response)).to.deep.include({
            hasAvailability: true,
            availability: {
                "2/22/2021": {
                    hasAvailability: true,
                    numberAvailableAppointments: 1,
                },
            },
        });
    });
    it("should return multiple date availabilities", () => {
        // mock out the http request that returns the token
        const response = `{"results":[{
            "start": "2021-02-22T14:00:00+00:00",
            "end": "2021-02-22T14:04:00+00:00",
            "capacity": 1,
            "remaining_spaces":1
        },
        {
            "start": "2021-02-22T14:04:00+00:00",
            "end": "2021-02-22T14:08:00+00:00",
            "capacity": 1,
            "remaining_spaces":1
        },
        {
            "start": "2021-02-23T14:04:00+00:00",
            "end": "2021-02-23T14:08:00+00:00",
            "capacity": 1,
            "remaining_spaces":1
        }]}`;
        // run the test
        /**
         * Expect the result to look like:
         * {
         *   "hasAvailability": true,
         *   "availability": {
         *      "2/22/2021": {
         *          hasAvailability: true,
         *          numberAvailableAppointments: 2
         *      },
         *      "2/23/2021": {
         *          hasAvailability: true,
         *          numberAvailableAppointments: 1
         *      },
         * }
         */
        expect(formatResponse(response)).to.deep.include({
            hasAvailability: true,
            availability: {
                "2/22/2021": {
                    hasAvailability: true,
                    numberAvailableAppointments: 2,
                },
                "2/23/2021": {
                    hasAvailability: true,
                    numberAvailableAppointments: 1,
                },
            },
        });
    });
});
