const assert = require("assert");
const nock = require("nock");
const mock = require("mock-require");
const chai = require("chai");
chai.use(require("chai-subset"));
const expect = chai.expect;

describe("GetAvailabilities", () => {
    it("should return availabilities when there are availabilities", async () => {
        const scraper = require("../no-browser-site-scrapers/PriceChopper");

        const apiResponse = [
            {
                address1: "555 Hubbard Ave",
                city: "Pittsfield",
                visibleTimeSlots: [{ time: "2021-03-05T10:00Z" }],
            },
        ];

        const resultingAvailability = [
            {
                hasAvailability: true,
                availability: {
                    "3/5/2021": {
                        hasAvailability: true,
                        numberAvailableAppointments: 1,
                    },
                },
            },
        ];

        nock("https://scrcxp.pdhi.com")
            .persist()
            .get(/ScreeningEvent/)
            .reply(200, JSON.stringify(apiResponse));

        // run the test and assert that the result containss availability:
        const result = await scraper();
        return expect(result).to.containSubset(resultingAvailability);
    }).timeout(60000);
});
