const chai = require("chai");
chai.use(require("chai-as-promised"));
chai.use(require("chai-shallow-deep-equal"));
const expect = chai.expect;

describe("FaunaDB Utils", function () {
    it("can create, retrieve, replace, and delete docs from LOCATIONS collection", async () => {
        const dbUtils = require("../lib/db-utils");

        const collectionName = "locations";
        const data = {
            name: "FakeLocationName",
            address: { street: "1 Main St", city: "Newton", zip: "02458" },
            signupLink: "www.google.com",
        };
        const generatedId = await dbUtils.generateId();

        await expect(
            dbUtils.retrieveItemByRefId(collectionName, generatedId)
        ).to.eventually.be.rejectedWith("instance not found");

        await dbUtils.writeLocationByRefId({
            id: generatedId,
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

        // modify the data
        const modifiedData = {
            name: "NewFakeLocationName",
            address: { street: "1 Main St", city: "Newton", zip: "02458" },
            signupLink: "www.google.com",
        };

        await dbUtils.replaceLocationByRefId({
            id: generatedId,
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


});
