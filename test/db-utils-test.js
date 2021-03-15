const chai = require("chai");
chai.use(require("chai-as-promised"));
chai.use(require("chai-shallow-deep-equal"));
const expect = chai.expect;

describe("FaunaDB Utils", function () {
    it("can create, retrieve, and delete locations", async () => {
        const dbUtils = require("../lib/db-utils");

        const data = {
            name: "FakeLocationName",
            address: { street: "1 Main St", city: "Newton", zip: "02458" },
            signupLink: "www.google.com",
        };
        const generatedId = await dbUtils.generateId();

        await expect(
            dbUtils.retrieveLocationByRefId(generatedId)
        ).to.eventually.be.rejectedWith("instance not found");

        await dbUtils.writeLocationByRefId({
            id: generatedId,
            ...data,
        });

        const retrieveResult = await dbUtils.retrieveLocationByRefId(
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

        await dbUtils.deleteLocationByRefId(generatedId);
        await expect(
            dbUtils.retrieveLocationByRefId(generatedId)
        ).to.eventually.be.rejectedWith("instance not found");
    });
});
