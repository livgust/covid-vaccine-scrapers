const sinon = require("sinon");
const chai = require("chai");
const expect = chai.expect;
const signUp = require("../../alerts/sign_up");
const pinpointWorkflow = require("../../alerts/pinpoint/new_subscriber");
const determineRecipients = require("../../alerts/determine_recipients");
const maZips = require("../../data/ma-zips.json");

async function addSubscription() {
    sinon
        .stub(pinpointWorkflow, "validateNumberAndAddSubscriber")
        .returns(Promise.resolve());
    return signUp
        .addOrUpdateSubscription({
            phoneNumber: "8578675309",
            zip: "01880",
            radius: 10,
        })
        .then(() => signUp.activateSubscription({ phoneNumber: "8578675309" }));
}

afterEach(() => {
    sinon.restore();
});

describe("findSubscribersWithZips", () => {
    it("finds a recipient with a given zip", async () => {
        await addSubscription();
        expect(
            await determineRecipients.findSubscribersWithZips(["01880"])
        ).to.include.deep.members([
            {
                phoneNumber: "8578675309",
                zip: "01880",
                radius: 10,
                active: true,
                cancelled: false,
            },
        ]);
    });
});

describe("determineRecipients", () => {
    it("finds easy recipient", async () => {
        await addSubscription();
        expect(
            (
                await determineRecipients.determineRecipients({
                    location: maZips["01880"],
                    numberAvailable: 1,
                })
            ).textRecipients
        ).to.include.deep.members([
            {
                phoneNumber: "8578675309",
                zip: "01880",
                radius: 10,
                active: true,
                cancelled: false,
            },
        ]);
    });
});
