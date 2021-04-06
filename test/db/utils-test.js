const chai = require("chai");
chai.use(require("chai-as-promised"));
chai.use(require("chai-shallow-deep-equal"));
chai.use(require("deep-equal-in-any-order"));
const expect = chai.expect;
const lodash = require("lodash");

describe("FaunaDB Utils", function () {
    const dbUtils = require("../../lib/db/utils");
    const scraperTransactions = require("../../lib/db/scraper_data");
    it("can create, retrieve, and delete docs from Locations collection (once doc at a time)", async () => {
        const randomName = Math.random().toString(36).substring(7);
        const collectionName = "locations";
        const location = {
            name: `RandomName-${randomName}`,
            address: { street: "1 Main St", city: "Newton", zip: "02458" },
            signUpLink: "www.google.com",
        };
        const generatedId = scraperTransactions.generateLocationId({
            name: location.name,
            steet: location.address.street,
            city: location.address.city,
            zip: location.address.zip,
        });

        await expect(
            dbUtils.retrieveItemByRefId(collectionName, generatedId)
        ).to.eventually.be.rejectedWith("instance not found");

        await expect(
            dbUtils.checkItemExistsByRefId(collectionName, generatedId)
        ).to.eventually.be.false;

        await scraperTransactions.writeLocationByRefId({
            refId: generatedId,
            ...location,
        });

        await expect(
            dbUtils.checkItemExistsByRefId(collectionName, generatedId)
        ).to.eventually.be.true;

        const retrieveResult = await dbUtils.retrieveItemByRefId(
            collectionName,
            generatedId
        );
        expect(retrieveResult).to.be.shallowDeepEqual({
            ref: {
                value: {
                    collection: {
                        value: {
                            collection: {
                                value: {
                                    id: "collections",
                                },
                            },
                            id: "locations",
                        },
                    },
                    id: generatedId,
                },
            },
            data: location,
        });

        await dbUtils.deleteItemByRefId(collectionName, generatedId);
        await expect(
            dbUtils.retrieveItemByRefId(collectionName, generatedId)
        ).to.eventually.be.rejectedWith("instance not found");
    }).timeout(3000);

    it("can create, retrieve, and delete docs from Locations collection (in batches)", async () => {
        const collectionName = "locations";
        const locations = [
            {
                name: `RandomName-${Math.random().toString(36).substring(7)}`,
                street: "1 Main St",
                city: "Newton",
                zip: "02458",
                signUpLink: "www.google.com",
            },
            {
                name: `RandomName-${Math.random().toString(36).substring(7)}`,
                street: "2 Main St",
                city: "Newton",
                zip: "02458",
                signUpLink: "www.google.com",
            },
        ];
        const locationsWithRefIds = scraperTransactions.addGeneratedIdsToLocations(
            locations
        );
        const locationRefIds = locationsWithRefIds.map((loc) => loc.refId);

        await expect(
            dbUtils.retrieveItemsByRefIds(collectionName, locationRefIds)
        ).to.eventually.be.rejectedWith("instance not found");

        await expect(
            dbUtils.checkItemsExistByRefIds(collectionName, locationRefIds)
        ).to.eventually.deep.equal([false, false]);

        await scraperTransactions.writeLocationsByRefIds(locationsWithRefIds);

        await expect(
            dbUtils.checkItemsExistByRefIds(collectionName, locationRefIds)
        ).to.eventually.deep.equal([true, true]);

        const retrieveResult = await dbUtils.retrieveItemsByRefIds(
            collectionName,
            locationRefIds
        );
        const filteredResults = retrieveResult.map(
            (entry) => lodash.omit(entry, ["ts", "ref"]) // remove the timestamp and reference, too complicated to check against
        );
        expect(filteredResults).to.have.deep.members([
            {
                data: {
                    name: locations[0].name,
                    address: {
                        street: locations[0].street,
                        city: locations[0].city,
                        zip: locations[0].zip,
                    },
                    signUpLink: locations[0].signUpLink,
                },
            },
            {
                data: {
                    name: locations[1].name,
                    address: {
                        street: locations[1].street,
                        city: locations[1].city,
                        zip: locations[1].zip,
                    },
                    signUpLink: locations[1].signUpLink,
                },
            },
        ]);

        await dbUtils.deleteItemsByRefIds(collectionName, locationRefIds);
        await expect(
            dbUtils.checkItemsExistByRefIds(collectionName, locationRefIds)
        ).to.eventually.deep.equal([false, false]);
    }).timeout(3000);

    it("given one scraper's output, can create, retrieve, and delete docs from Locations, ScraperRuns, and Appointments collections", async () => {
        const randomName = Math.random().toString(36).substring(7);
        const scraperOutput = {
            parentLocationName: "Parent Location",
            timestamp: "2021-03-16T13:15:27.318Z",
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
                        },
                        "03/18/2021": true,
                        "03/19/2021": false,
                        "03/20/2021": {
                            hasAvailability: true,
                            numberAvailableAppointments: 0,
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
        };

        // Write the appopriate location (if it's not already there), scaperRun, and appointment(s)
        await scraperTransactions.writeScrapedData(scraperOutput);

        // sleep while the DB writing happens...
        await new Promise((r) => setTimeout(r, 1000));

        const locationId = scraperTransactions.generateLocationId({
            name: scraperOutput.individualLocationData[0].name,
            street: scraperOutput.individualLocationData[0].street,
            city: scraperOutput.individualLocationData[0].city,
            zip: scraperOutput.individualLocationData[0].zip,
        });
        const retrieveLocationResult = await dbUtils.retrieveItemByRefId(
            "locations",
            locationId
        );
        expect(retrieveLocationResult).to.be.shallowDeepEqual({
            ref: {
                value: {
                    collection: {
                        value: {
                            collection: {
                                value: {
                                    id: "collections",
                                },
                            },
                            id: "locations",
                        },
                    },
                    id: locationId,
                },
            },
            data: {
                name: scraperOutput.individualLocationData[0].name,
                address: {
                    street: scraperOutput.individualLocationData[0].street,
                    city: scraperOutput.individualLocationData[0].city,
                    zip: scraperOutput.individualLocationData[0].zip,
                },
                signUpLink: scraperOutput.individualLocationData[0].signUpLink,
                extraData: scraperOutput.individualLocationData[0].extraData,
            },
        });
        // assert that the scraper run is there (check index)
        const retrieveScraperRunResult = await scraperTransactions.getScraperRunsByLocation(
            locationId
        );
        expect(retrieveScraperRunResult).to.be.shallowDeepEqual({
            data: [
                {
                    ref: {
                        value: {
                            collection: {
                                value: {
                                    id: "scraperRuns",
                                    collection: {
                                        value: { id: "collections" },
                                    },
                                },
                            },
                        },
                    },
                    data: {
                        locationRef: {
                            value: {
                                id: locationId,
                                collection: {
                                    value: {
                                        id: "locations",
                                        collection: {
                                            value: { id: "collections" },
                                        },
                                    },
                                },
                            },
                        },
                        timestamp: "2021-03-16T13:15:27.318Z",
                    },
                },
            ],
        });

        const scraperRunRef = retrieveScraperRunResult.data[0].ref.value.id;

        // assert that the appointmentAvailability is there
        const retrieveAppointmentsResult = await scraperTransactions.getAppointmentsByScraperRun(
            scraperRunRef
        );

        const filteredResults = retrieveAppointmentsResult.data.map(
            (entry) => lodash.omit(entry.data, ["scraperRunRef"]) // this was too complicated to check against.
        );

        expect(filteredResults).to.have.deep.members([
            {
                date: "03/16/2021",
                numberAvailable: 2,
                signUpLink: "fake-signup-link-2",
            },
            {
                date: "03/17/2021",
                numberAvailable: 1,
            },
            {
                date: "03/18/2021",
            },
        ]);
        const appointmentRefIds = retrieveAppointmentsResult.data.map(
            (entry) => entry.ref.value.id
        );

        // clean up - delete it all
        await dbUtils.deleteItemByRefId("locations", locationId);
        await dbUtils.deleteItemByRefId("scraperRuns", scraperRunRef);
        appointmentRefIds.map(async (id) => {
            await dbUtils.deleteItemByRefId("appointments", id);
        });
    }).timeout(5000);

    it.skip("can get the availability for all locations' most recent scraper runs", async () => {
        await scraperTransactions.getAppointmentsForAllLocations();
        // the logic isn't here yet.
    });
});
