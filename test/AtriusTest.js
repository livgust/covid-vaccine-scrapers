const assert = require("assert");
const nock = require("nock");
const sinon = require("sinon");
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

describe("Atrius GetAvailabilities", async () => {
    it("should return no availabilities when there is a redirect", async () => {
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
        await expect(atrius())
            .to.eventually.deep.include({
                hasAvailability: false,
            })
            .and.nested.property("availability")
            .deep.equal({});
        nock.cleanAll();
    });

    it("should return availabilities when there are some.", async () => {
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
        const myChartApi = require("../lib/MyChartAPI");
        sinon
            .stub(myChartApi, "GetCookieAndVerificationToken")
            .callsFake(() => ["theCookie", "theVerificationToken"]);
        sinon
            .stub(myChartApi, "AddFutureWeeks")
            .callsFake(() => ({ 12701803: resultingAvailability }));
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
        const result = atrius();
        await expect(result).to.eventually.include(resultingAvailability);
        nock.cleanAll();
    });
});
