const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");
const getGeocode = require("../../getGeocode");
const dbUtils = require("../../lib/db/utils");
const scraperUtils = require("../../lib/db/scraper_data");
const moment = require("moment");
const { writeAppointmentsByRefId } = require("../../lib/db/scraper_data");

describe("writeScrapedData", async () => {
    it("maps data correctly to the write functions", async () => {
        const exampleTimestamp = moment().format();
        const exampleData = {
            parentLocationName: "Publix",
            timestamp: exampleTimestamp,
            individualLocationData: [
                {
                    name: "Publix #123",
                    street: "100 Spring Hill Dr",
                    city: "Spring Hill",
                    zip: "34607",
                    availability: {
                        "4/5/21": {
                            hasAvailability: true,
                            numberAvailableAppointments: 42,
                        },
                    },
                    hasAvailability: true,
                    extraData: "blah blah blah",
                    restrictions: "Floridians only",
                    massVax: false,
                    signUpLink: "publix.com",
                },
            ],
        };
        const generateLocationIdStub = sinon
            .stub(scraperUtils, "generateLocationId")
            .returns("123");
        const generateIdStub = sinon.stub(dbUtils, "generateId").returns("234");
        sinon.stub(dbUtils, "checkItemExistsByRefId").returns(false);
        sinon.stub(getGeocode, "getGeocode").returns(null);
        const writeLocationByRefIdStub = sinon.stub(
            scraperUtils,
            "writeLocationByRefId"
        );
        const writeScraperRunByRefIdStub = sinon.stub(
            scraperUtils,
            "writeScraperRunByRefId"
        );
        const writeAppointmentsByRefIdStub = sinon.stub(
            scraperUtils,
            "writeAppointmentsByRefId"
        );

        await scraperUtils.writeScrapedData(exampleData);

        expect(generateLocationIdStub.lastCall.args).to.deep.equal([
            {
                name: "Publix #123",
                street: "100 Spring Hill Dr",
                city: "Spring Hill",
                zip: "34607",
            },
        ]);
        expect(writeLocationByRefIdStub.lastCall.args).to.deep.equal([
            {
                refId: "123",
                name: "Publix #123",
                address: {
                    street: "100 Spring Hill Dr",
                    city: "Spring Hill",
                    zip: "34607",
                },
                signUpLink: "publix.com",
                latitude: undefined,
                longitude: undefined,
                extraData: "blah blah blah",
                restrictions: "Floridians only",
                massVax: false,
            },
        ]);
        expect(writeScraperRunByRefIdStub.lastCall.args).to.deep.equal([
            {
                refId: "234",
                locationRefId: "123",
                timestamp: exampleTimestamp,
                siteTimestamp: undefined,
            },
        ]);
        expect(writeAppointmentsByRefIdStub.lastCall.args).to.deep.equal([
            {
                refId: "234",
                scraperRunRefId: "234",
                date: "4/5/21",
                numberAvailable: 42,
                signUpLink: undefined,
            },
        ]);
    });
});
