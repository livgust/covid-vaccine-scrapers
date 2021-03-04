const assert = require("assert");
const natickmall = require("./../site-scrapers/NatickMall");
const nock = require("nock");
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

describe("Transformations", () => {
    it("should return no availabilities when there is -1", () => {
        // mock out the http request that returns the token
        const token = "abc";
        nock("https://home.color.com")
            .get("/api/v1/get_onsite_claim?partner=natickmall")
            .reply(200, `{"token":"${token}"}`);

        // mock out the availability request
        const response = `{"results": [{
            "start": "2021-02-22T14:00:00+00:00",
            "end": "2021-02-22T14:04:00+00:00",
            "capacity": 1,
            "remaining_spaces":-1
        }]}`;
        nock("https://home.color.com")
            .get(
                `/api/v1/vaccination_appointments/availability?claim_token=${token}&collection_site=Natick%20Mall`
            )
            .reply(200, response);

        // run the test and assert that the result looks like:
        /*
          {
            "hasAvailability": false,
           "availability: {}
          }
        */
        return expect(natickmall())
            .to.eventually.deep.include({
                hasAvailability: false,
            })
            .and.nested.property("availability")
            .deep.equal({});
    });
    it("should return one availabilitiy when there is one", () => {
        // mock out the http request that returns the token
        const token = "xyz";
        nock("https://home.color.com")
            .get("/api/v1/get_onsite_claim?partner=natickmall")
            .reply(200, `{"token":"${token}"}`);

        // mock out the availability request
        const response = `{"results":[{
            "start": "2021-02-22T14:00:00+00:00",
            "end": "2021-02-22T14:04:00+00:00",
            "capacity": 1,
            "remaining_spaces":1
        }]}`;
        nock("https://home.color.com")
            .get(
                `/api/v1/vaccination_appointments/availability?claim_token=${token}&collection_site=Natick%20Mall`
            )
            .reply(200, response);

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
        return expect(natickmall()).to.eventually.deep.include({
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
        const token = "xyz";
        nock("https://home.color.com")
            .get("/api/v1/get_onsite_claim?partner=natickmall")
            .reply(200, `{"token":"${token}"}`);

        // mock out the availability request
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
        nock("https://home.color.com")
            .get(
                `/api/v1/vaccination_appointments/availability?claim_token=${token}&collection_site=Natick%20Mall`
            )
            .reply(200, response);

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
        return expect(natickmall()).to.eventually.deep.include({
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
