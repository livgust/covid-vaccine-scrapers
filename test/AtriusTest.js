const assert = require("assert");
const nock = require("nock");
const mock = require("mock-require");
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

describe("GetAvailabilities", () => {
    it("should return no availabilities when there is a redirect", () => {
        const atrius = require("./../no-browser-site-scrapers/Atrius");
        // mock out the redirect that occurs when there Atrius doesn't want to show any slots.
        nock("https://myhealth.atriushealth.org")
            .get("/fr/")
            .reply(301, "", { location: "No_Slots" });
        // run the test and assert that the result looks like:
        /*
          {
            "hasAvailability": false,
           "availability: {}
          }
        */
        return expect(atrius())
            .to.eventually.deep.include({
                hasAvailability: false,
            })
            .and.nested.property("availability")
            .deep.equal({});
    });

    it("should return availabilities when there are some.", (done) => {
        // mock that there is no redirect
        nock("https://myhealth.atriushealth.org")
            .get("/fr/")
            .reply(200, "OK response", { location: "/dph/" });

        const resultingAvailability = {
            hasAvailability: true,
            availability: {
                "2/21/2021": {
                    numberAvailableAppointments: 3,
                    hasAvailability: true,
                },
            },
        };

        // mock the mychart api
        mock("../lib/MyChartAPI.js", {
            GetCookieAndVerificationToken: (verifcationUrl) => {
                console.log("GetCookieAndVerificationTokenCalled");
                return ["theCookie", "theVerificationToken"];
            },
            AddFutureWeeks: (
                scheduleHost,
                schedulePath,
                cookie,
                verificationToken,
                weekCount,
                postDataCallback
            ) => {
                return resultingAvailability;
            },
        });
        // specify the require here after the mock was created.
        const atrius = require("./../no-browser-site-scrapers/Atrius");
        // run the test and assert that the result looks like:
        /*
          {
            "hasAvailability": true,
           "availability: {
                "2/21/2021": {
                    numberAvailableAppointments: 3,
                    hasAvailability: true,
                },
           }
          }
        */
        result = atrius();
        expect(result).to.eventually.include(resultingAvailability);
        done();
    });
});
