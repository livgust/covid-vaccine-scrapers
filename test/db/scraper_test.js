const chai = require("chai");
chai.use(require("chai-as-promised"));
chai.use(require("chai-shallow-deep-equal"));
chai.use(require("deep-equal-in-any-order"));
const expect = chai.expect;
const sinon = require("sinon");
const getGeocode = require("../../getGeocode");
const dbUtils = require("../../lib/db/utils");
const scraperUtils = require("../../lib/db/scraper_data");
const moment = require("moment");
const faunadb = require("faunadb"),
    fq = faunadb.query;

describe("writeScrapedData", async () => {
    after(() => sinon.restore());
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
        sinon.stub(dbUtils, "checkItemExistsByRefId").returns(false);
        sinon.stub(dbUtils, "generateId").returns("234");
        sinon.stub(getGeocode, "getGeocode").returns(null);
        const createOrGetParentLocationStub = sinon
            .stub(scraperUtils, "createOrGetParentLocationRefId")
            .returns(Promise.resolve("100"));
        const writeParentScraperRunStub = sinon
            .stub(scraperUtils, "writeParentScraperRun")
            .returns(Promise.resolve("200"));
        const writeLocationsByRefIdsStub = sinon
            .stub(scraperUtils, "writeLocationsByRefIds")
            .returns(Promise.resolve());
        const writeScraperRunsByRefIdsStub = sinon
            .stub(scraperUtils, "writeScraperRunsByRefIds")
            .returns(Promise.resolve());
        const writeAppointmentsEntriesStub = sinon
            .stub(scraperUtils, "writeAppointmentsEntries")
            .returns(Promise.resolve());

        await scraperUtils.writeScrapedData(exampleData);

        expect(createOrGetParentLocationStub.lastCall.args).to.deep.equal([
            { name: "Publix", isChain: undefined },
        ]);

        expect(writeParentScraperRunStub.lastCall.args).to.deep.equal([
            { parentLocationRefId: "100", timestamp: exampleTimestamp },
        ]);

        expect(generateLocationIdStub.lastCall.args).to.deep.equal([
            {
                name: "Publix #123",
                street: "100 Spring Hill Dr",
                city: "Spring Hill",
                zip: "34607",
            },
        ]);
        expect(writeLocationsByRefIdsStub.lastCall.args).to.deep.equal([
            [
                {
                    parentLocationRefId: "100",
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
            ],
        ]);
        expect(writeScraperRunsByRefIdsStub.lastCall.args).to.deep.equal([
            [
                {
                    refId: "234",
                    parentScraperRunRefId: "200",
                    locationRefId: "123",
                    timestamp: exampleTimestamp,
                    siteTimestamp: undefined,
                },
            ],
        ]);
        expect(writeAppointmentsEntriesStub.lastCall.args).to.deep.equal([
            [
                {
                    scraperRunRefId: "234",
                    date: "4/5/21",
                    numberAvailable: 42,
                    availabilityWithNoNumbers: false,
                    signUpLink: undefined,
                    extraData: undefined,
                },
            ],
        ]);
    });
});

describe("createOrGetParentLocation", () => {
    it("creates parent location if it doesn't exist", async () => {
        const parentLocationName = "Test Location 123";

        //make sure it doesn't exist
        await dbUtils.faunaQuery(
            fq.Map(
                fq.Paginate(
                    fq.Match("parentLocationsByName", parentLocationName)
                ),
                fq.Lambda("x", fq.Delete(fq.Var("x")))
            )
        );

        const parentLocationRefId = await scraperUtils.createOrGetParentLocationRefId(
            {
                name: parentLocationName,
                isChain: true,
            }
        );

        expect(parentLocationRefId, "an entry is created and an ID is returned")
            .to.exist;

        await expect(
            scraperUtils.createOrGetParentLocationRefId({
                name: parentLocationName,
                isChain: true,
            }),
            "the same entry is returned"
        ).to.eventually.equal(parentLocationRefId);
    });
});

describe("writeParentScraperRun", () => {
    it("writes successfully", async () => {
        const timestamp = moment().format();
        const refId = await scraperUtils.writeParentScraperRun({
            parentLocationRefId: "123",
            timestamp,
        });

        const scraperRun = await dbUtils.retrieveItemByRefId(
            "parentScraperRuns",
            refId
        );
        expect(scraperRun.data.parentLocationRef.id).to.equal("123");
        expect(moment(scraperRun.data.timestamp.value).format()).to.equal(
            timestamp
        );
        await dbUtils.deleteItemByRefId("parentScraperRuns", refId);
    });
});

describe("getLocationsByParentLocation", () => {
    it("retrieves successfully", async () => {
        if (await dbUtils.checkItemsExistByRefIds("locations", ["123"])[0]) {
            await dbUtils.deleteItemByRefId("locations", "123");
        }
        const parentLocationRefId = await scraperUtils.createOrGetParentLocationRefId(
            {
                name: "Publix",
            }
        );
        const locationRefId = await scraperUtils.writeLocationsByRefIds([
            {
                parentLocationRefId,
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
        const response = await scraperUtils.getLocationsByParentLocation(
            parentLocationRefId
        );
        expect(response.length).to.equal(1);
        expect(response[0].ref.id).to.equal("123");
        await dbUtils.deleteItemByRefId("parentLocations", parentLocationRefId);
        await dbUtils.deleteItemByRefId("locations", "123");
    });
});

describe("getScraperRunsByParentScraperRun", () => {
    it("retrieves successfully", async () => {
        const scraperRunRefId = await dbUtils.generateId();
        const parentScraperRunRefId = await scraperUtils.writeParentScraperRun({
            parentLocationRefId: "100",
            timestamp: moment().format(),
        });
        const res = await scraperUtils.writeScraperRunsByRefIds([
            {
                parentScraperRunRefId,
                refId: scraperRunRefId,
                locationRefId: "456",
                timestamp: moment().format(),
            },
        ]);
        const response = await scraperUtils.getScraperRunsByParentScraperRun(
            parentScraperRunRefId
        );
        expect(response.length).to.equal(1);
        expect(response[0].ref.id).to.equal(scraperRunRefId);
        await dbUtils.deleteItemByRefId(
            "parentScraperRuns",
            parentScraperRunRefId
        );
        await dbUtils.deleteItemByRefId("scraperRuns", scraperRunRefId);
    });
});

describe("getScraperRunsAndAppointmentsByParentScraperRun", () => {
    it("retrieves successfully", async () => {
        const parentScraperRunRefId = await scraperUtils.writeParentScraperRun({
            parentLocationRefId: "100",
            timestamp: moment().format(),
        });
        const scraperRunRefIds = [
            await dbUtils.generateId(),
            await dbUtils.generateId(),
        ];
        await scraperUtils.writeScraperRunsByRefIds([
            {
                parentScraperRunRefId,
                refId: scraperRunRefIds[0],
                locationRefId: "123",
                timestamp: moment().format(),
            },
            {
                parentScraperRunRefId,
                refId: scraperRunRefIds[1],
                locationRefId: "123",
                timestamp: moment().format(),
            },
        ]);
        const appointmentEntries = (
            await scraperUtils.writeAppointmentsEntries([
                {
                    scraperRunRefId: scraperRunRefIds[0],
                    date: "1/1/21",
                    numberAvailable: 100,
                    signUpLink: "example.com",
                },
                {
                    scraperRunRefId: scraperRunRefIds[0],
                    date: "1/2/21",
                    numberAvailable: 200,
                    signUpLink: "example.com",
                },
            ])
        ).map((entry) => entry.ref.id);

        expect(
            (
                await scraperUtils.getScraperRunsAndAppointmentsByParentScraperRun(
                    parentScraperRunRefId
                )
            ).map((entry) => {
                return {
                    scraperRun: {
                        refId: entry.scraperRun.ref.id,
                        data: {
                            locationRefId: entry.scraperRun.data.locationRef.id,
                            parentScraperRunRefId:
                                entry.scraperRun.data.parentScraperRunRef.id,
                        },
                    },
                    appointments: entry.appointments
                        .map((appt) => ({
                            refId: appt.ref.id,
                            data: {
                                scraperRunRefId: appt.data.scraperRunRef.id,
                            },
                        }))
                        .sort((a, b) => a.refId - b.refId),
                };
            })
        ).to.deep.include.members([
            {
                scraperRun: {
                    refId: scraperRunRefIds[0],
                    data: {
                        locationRefId: "123",
                        parentScraperRunRefId,
                    },
                },
                appointments: [
                    {
                        refId: appointmentEntries[0],
                        data: { scraperRunRefId: scraperRunRefIds[0] },
                    },
                    {
                        refId: appointmentEntries[1],
                        data: { scraperRunRefId: scraperRunRefIds[0] },
                    },
                ].sort((a, b) => a.refId - b.refId),
            },
            {
                scraperRun: {
                    refId: scraperRunRefIds[1],
                    data: {
                        locationRefId: "123",
                        parentScraperRunRefId,
                    },
                },
                appointments: [],
            },
        ]);
        await dbUtils.deleteItemByRefId(
            "parentScraperRuns",
            parentScraperRunRefId
        );
        await dbUtils.deleteItemsByRefIds("scraperRuns", scraperRunRefIds);
        await dbUtils.deleteItemsByRefIds("appointments", appointmentEntries);
    });
});

describe("spits out what we write", () => {
    it("writes & reads", async () => {
        const randomName = Math.random().toString(36).substring(7);
        const timestamp = moment().format();
        await scraperUtils.writeScrapedData({
            parentLocationName: "Parent Location",
            timestamp,
            individualLocationData: [
                {
                    name: `RandomName-${randomName}`,
                    street: "2240 Iyannough Road",
                    city: "West Barnstable",
                    zip: "02668",
                    availability: {
                        "03/16/2021": {
                            hasAvailability: true,
                            numberAvailableAppointments: 2,
                            signUpLink: "fake-signup-link-2",
                        },
                        "03/17/2021": {
                            hasAvailability: true,
                            numberAvailableAppointments: 1,
                            signUpLink: null,
                            extraData: "blah",
                        },
                        "03/20/2021": {
                            hasAvailability: true,
                        },
                        "03/21/2021": {
                            hasAvailability: false,
                        },
                    },
                    hasAvailability: true,
                    extraData: {
                        "Vaccinations offered":
                            "Pfizer-BioNTech COVID-19 Vaccine",
                        "Age groups served": "Adults",
                        "Services offered": "Vaccination",
                        "Additional Information": "Pfizer vaccine",
                        "Clinic Hours": "10:00 am - 03:00 pm",
                    },
                    signUpLink: "fake-signup-link",
                },
            ],
        });
        const res = await scraperUtils.getAppointmentsForAllLocations();
        expect(
            res.results.find((res) => res.name === `RandomName-${randomName}`)
        ).to.shallowDeepEqual({
            name: `RandomName-${randomName}`,
            street: "2240 Iyannough Road",
            city: "West Barnstable",
            zip: "02668",
            availability: {
                "03/16/2021": {
                    hasAvailability: true,
                    numberAvailableAppointments: 2,
                    signUpLink: "fake-signup-link-2",
                },
                "03/17/2021": {
                    hasAvailability: true,
                    numberAvailableAppointments: 1,
                    extraData: "blah",
                },
                "03/20/2021": {
                    hasAvailability: true,
                },
            },
            hasAvailability: true,
            extraData: {
                "Vaccinations offered": "Pfizer-BioNTech COVID-19 Vaccine",
                "Age groups served": "Adults",
                "Services offered": "Vaccination",
                "Additional Information": "Pfizer vaccine",
                "Clinic Hours": "10:00 am - 03:00 pm",
            },
            signUpLink: "fake-signup-link",
        });
    });
});
