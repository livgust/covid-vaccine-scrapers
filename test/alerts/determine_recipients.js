const sinon = require("sinon");
const chai = require("chai");
const expect = chai.expect;
const signUp = require("../../alerts/sign_up");
const pinpointWorkflow = require("../../alerts/pinpoint/new_subscriber");
const determineRecipients = require("../../alerts/determine_recipients");
const maZips = require("../../data/ma-zips.json");

async function addSubscription(phone, zip) {
    if (!pinpointWorkflow.validateNumberAndAddSubscriber.restore?.sinon) {
        sinon
            .stub(pinpointWorkflow, "validateNumberAndAddSubscriber")
            .returns(Promise.resolve());
    }
    return signUp
        .addOrUpdateSubscription({
            phoneNumber: phone || "8578675309",
            zip: zip || "01880",
            radius: 10,
        })
        .then(() =>
            signUp.activateSubscription({ phoneNumber: phone || "8578675309" })
        );
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
    afterEach(() => {
        sinon.restore();
    });

    it("finds easy recipient", async () => {
        await addSubscription();
        expect(
            (
                await determineRecipients.determineRecipients({
                    locations: [maZips["01880"]],
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

    it("works with multiple locations", async () => {
        await addSubscription("1234567890", "01880");
        await addSubscription("0123456789", "01238");
        expect(
            (
                await determineRecipients.determineRecipients({
                    locations: [maZips["01880"], maZips["01238"]],
                    numberAvailable: 1,
                })
            ).textRecipients
        ).to.include.deep.members([
            {
                phoneNumber: "1234567890",
                zip: "01880",
                radius: 10,
                active: true,
                cancelled: false,
            },
            {
                phoneNumber: "0123456789",
                zip: "01238",
                radius: 10,
                active: true,
                cancelled: false,
            },
        ]);
    });
});
