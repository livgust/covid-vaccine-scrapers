const chai = require("chai");
const { random } = require("lodash");
chai.use(require("chai-as-promised"));
chai.use(require("chai-shallow-deep-equal"));
const expect = chai.expect;
const lodash = require("lodash");

describe("FaunaDB Utils", function () {
    const dbUtils = require("../lib/db-utils");
    this.timeout(5000);

    it("can create, retrieve, replace, and delete docs from Locations collection", async () => {
        const randomName = Math.random().toString(36).substring(7);
        const collectionName = "locations";
        const data = {
            name: `RandomName-${randomName}`,
            address: { street: "1 Main St", city: "Newton", zip: "02458" },
            signUpLink: "www.google.com",
        };
        const generatedId = await dbUtils.generateLocationId({
            name: data.name,
            steet: data.address.street,
            city: data.address.city,
            zip: data.address.zip,
        });
        console.log("got generatedId", generatedId);

        await expect(
            dbUtils.retrieveItemByRefId(collectionName, generatedId)
        ).to.eventually.be.rejectedWith("instance not found");

        await dbUtils.writeLocationByRefId({
            refId: generatedId,
            ...data,
        });

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
            data,
        });

        const modifiedData = {
            name: `NewRandomName-${randomName}`,
            address: { street: "1 Main St", city: "Newton", zip: "02458" },
            signUpLink: "www.google.com",
        };

        await dbUtils.replaceLocationByRefId({
            refId: generatedId,
            ...modifiedData,
        });

        const retrieveResult2 = await dbUtils.retrieveItemByRefId(
            collectionName,
            generatedId
        );
        expect(retrieveResult2).to.be.shallowDeepEqual({
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
            data: modifiedData,
        });

        await dbUtils.deleteItemByRefId(collectionName, generatedId);
        await expect(
            dbUtils.retrieveItemByRefId(collectionName, generatedId)
        ).to.eventually.be.rejectedWith("instance not found");
    });

    it("can perform the operations we need for adding data for a given scraper run", async () => {
        const randomName = Math.random().toString(36).substring(7);
        console.log("randomName is", randomName);
        const scraperOutput = {
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
            },
            hasAvailability: true,
            extraData: {
                "Vaccinations offered": "Pfizer-BioNTech COVID-19 Vaccine",
                "Age groups served": "Adults",
                "Services offered": "Vaccination",
                "Additional Information": "Pfizer vaccine",
                "Clinic Hours": "10:00 am - 03:00 pm",
            },
            timestamp: "2021-03-16T13:15:27.318Z",
            latitude: 41.6909399,
            longitude: -70.3373802,
            signUpLink: "fake-signup-link",
        };

        // Write the appopriate location (if it's not there), scaperRun, and appointment(s)
        await dbUtils.writeScrapedData(scraperOutput);

        // sleep while the DB writing happens...
        await new Promise((r) => setTimeout(r, 1000));

        const locationId = dbUtils.generateLocationId({
            name: scraperOutput.name,
            street: scraperOutput.street,
            city: scraperOutput.city,
            zip: scraperOutput.zip,
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
                name: scraperOutput.name,
                address: {
                    street: scraperOutput.street,
                    city: scraperOutput.city,
                    zip: scraperOutput.zip,
                },
                latitude: scraperOutput.latitude,
                longitude: scraperOutput.longitude,
                signUpLink: scraperOutput.signUpLink,
            },
        });
        // assert that the scraper run is there (check index)
        const retrieveScraperRunResult = await dbUtils.getScaperRunsByLocation(
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

        // aseert that the appointmentAvailability is there
        const retrieveAppointmentsResult = await dbUtils.getAppointmentsByScraperRun(
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
                extraData: {
                    "Vaccinations offered": "Pfizer-BioNTech COVID-19 Vaccine",
                    "Age groups served": "Adults",
                    "Services offered": "Vaccination",
                    "Additional Information": "Pfizer vaccine",
                    "Clinic Hours": "10:00 am - 03:00 pm",
                },
            },
            {
                date: "03/17/2021",
                numberAvailable: 1,
                signUpLink: "fake-signup-link",
                extraData: {
                    "Vaccinations offered": "Pfizer-BioNTech COVID-19 Vaccine",
                    "Age groups served": "Adults",
                    "Services offered": "Vaccination",
                    "Additional Information": "Pfizer vaccine",
                    "Clinic Hours": "10:00 am - 03:00 pm",
                },
            },
        ]);
        const appointmentRefIds = retrieveAppointmentsResult.data.map(
            (entry) => entry.ref.value.id
        );
        console.log(`appointmentRefIds`, appointmentRefIds);

        // clean up
        await dbUtils.deleteItemByRefId("locations", locationId);
        await dbUtils.deleteItemByRefId("scraperRuns", scraperRunRef);
        // delete all the appointments
        appointmentRefIds.map(async (id) => {
            await dbUtils.deleteItemByRefId("appointments", id);
        });
    });
});
