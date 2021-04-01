const sinon = require("sinon");
const alerts = require("../alerts");
const { expect } = require("chai");
const { StepFunctions } = require("aws-sdk");
const moment = require("moment");

describe("alerts behavior", () => {
    afterEach(() => {
        sinon.restore();
    });

    it("does not make a new alert if an active alert exists", () => {
        sinon.stub(alerts, "activeAlertExists").returns(true);
        sinon.stub(alerts, "maybeContinueAlerting");
        sinon.stub(alerts, "setInactiveAlert");
        const setUpNewAlertStub = sinon.stub(alerts, "setUpNewAlert");

        alerts.handler({
            locationRef: "123",
            scraperRunRef: "456",
            bookableAppointmentsFound: 100,
        });
        expect(setUpNewAlertStub.notCalled).to.be.true;
    });

    it("ends an alert if 0 appointments found and there's an active alert", () => {
        sinon.stub(alerts, "activeAlertExists").returns(true);
        const setInactiveAlertStub = sinon.stub(alerts, "setInactiveAlert");

        alerts.handler({
            locationRef: "123",
            scraperRunRef: "456",
            bookableAppointmentsFound: 0,
        });
        expect(setInactiveAlertStub.called).to.be.true;
    });

    it("does continued alerting if an active alert exists", () => {
        sinon.stub(alerts, "activeAlertExists").returns(true);
        const maybeContinueAlertingStub = sinon.stub(
            alerts,
            "maybeContinueAlerting"
        );

        alerts.handler({
            locationRef: "123",
            scraperRunRef: "456",
            bookableAppointmentsFound: 100,
        });
        expect(maybeContinueAlertingStub.called).to.be.true;
    });

    it("starts a new alert if we see appointments and no alert is active", () => {
        sinon.stub(alerts, "activeAlertExists").returns(false);
        sinon.stub(alerts, "REPEAT_ALERT_TIME").returns(0);
        sinon.stub(alerts, "APPOINTMENT_NUMBER_THRESHOLD").returns(0);
        sinon
            .stub(alerts, "getLastAlertStartTime")
            .returns(moment().subtract(1, "minute"));
        const setUpNewAlertStub = sinon.stub(alerts, "setUpNewAlert");

        alerts.handler({
            locationRef: "123",
            scraperRunRef: "456",
            bookableAppointmentsFound: 100,
        });

        expect(setUpNewAlertStub.called).to.be.true;
    });

    it("does nothing if no appts found and no active alert", () => {
        sinon.stub(alerts, "activeAlertExists").returns(false);
        const actionStubs = [
            sinon.stub(alerts, "maybeContinueAlerting"),
            sinon.stub(alerts, "setInactiveAlert"),
            sinon.stub(alerts, "setUpNewAlert"),
        ];

        alerts.handler({
            locationRef: "123",
            scraperRunRef: "456",
            bookableAppointmentsFound: 100,
        });
        for (const stub of actionStubs) {
            expect(stub.notCalled).to.be.true;
        }
    });
});
