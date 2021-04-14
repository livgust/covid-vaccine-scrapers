const sinon = require("sinon");
const pinpointWorkflow = require("../../alerts/pinpoint/new_subscriber");
const signUp = require("../../alerts/sign_up");
const chai = require("chai");
const expect = chai.expect;
const moment = require("moment");
const { faunaQuery } = require("../../lib/db/utils");

describe("getSubscription", () => {
    it("errors if you send both phone and email", async () => {
        let e;
        try {
            await signUp.getSubscription({
                phoneNumber: "8578675309",
                email: "email@test.com",
            });
        } catch (error) {
            e = error;
        }
        expect(e).to.be.instanceOf(Error);
    });
});
describe("addSubscription", () => {
    it("sets and retrieves a phone number subscription", async () => {
        sinon
            .stub(pinpointWorkflow, "validateNumberAndAddSubscriber")
            .returns(Promise.resolve());
        await signUp.addOrUpdateSubscription({
            phoneNumber: "8578675309",
            zip: "12345",
            radius: 100,
        });
        expect(
            await signUp.getSubscription({ phoneNumber: "8578675309" })
        ).to.deep.equal({
            phoneNumber: "8578675309",
            zip: "12345",
            radius: 100,
            active: false,
            cancelled: false,
        });
    });
    it("sets and retrieves an email subscription", async () => {
        await signUp.addOrUpdateSubscription({
            email: "test@example.com",
            zip: "12345",
            radius: 100,
        });
        expect(
            await signUp.getSubscription({ email: "test@example.com" })
        ).to.deep.equal({
            email: "test@example.com",
            zip: "12345",
            radius: 100,
            active: false,
            cancelled: false,
        });
    });
});

describe("activateSubscripition", () => {
    it("sets active to true", async () => {
        await signUp.addOrUpdateSubscription({
            email: "test@example.com",
            zip: "12345",
            radius: 100,
        });
        await signUp.activateSubscription({ email: "test@example.com" });
        expect(
            await signUp.getSubscription({ email: "test@example.com" })
        ).to.deep.equal({
            email: "test@example.com",
            zip: "12345",
            radius: 100,
            active: true,
            cancelled: false,
        });
    });
});

describe("cancelSubscripition", () => {
    it("sets cancelled to true", async () => {
        await signUp.addOrUpdateSubscription({
            email: "test@example.com",
            zip: "12345",
            radius: 100,
        });
        await signUp.cancelSubscription({ email: "test@example.com" });
        expect(
            await signUp.getSubscription({ email: "test@example.com" })
        ).to.deep.equal({
            email: "test@example.com",
            zip: "12345",
            radius: 100,
            active: false,
            cancelled: true,
        });
    });
});
