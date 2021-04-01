const sinon = require("sinon");
const alerts = require("../alerts");
const dbUtils = require("../lib/db-utils");
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;
const { StepFunctions } = require("aws-sdk");
const moment = require("moment");
const { setInactiveAlert, getLastAlertStartTime } = require("../alerts");

async function createTestLocation() {
    const newLocationId = await dbUtils.generateId();
    const location = await dbUtils.writeLocationByRefId({
        refId: newLocationId,
        name: "Test Location",
        address: {},
    });
    return newLocationId;
}

async function createTestScraperRun(locationRef, bookableAppointmentsFound) {
    const newScraperRunId = await dbUtils.generateId();
    await dbUtils.writeScraperRunByRefId({
        refId: newScraperRunId,
        locationRefId: locationRef,
        bookableAppointmentsFound,
    });
    return newScraperRunId;
}

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
            bookableAppointmentsFound: 0,
        });
        for (const stub of actionStubs) {
            expect(stub.notCalled).to.be.true;
        }
    });
});

describe("setUpNewAlert", () => {
    it("creates a new alert", async () => {
        const locationRefId = await createTestLocation();
        const scraperRunRefId = await createTestScraperRun(locationRefId, 100);
        const alertId = await alerts.setUpNewAlert(
            locationRefId,
            scraperRunRefId
        );
        await expect(
            dbUtils
                .retrieveItemByRefId("appointmentAlerts", alertId)
                .then((res) => ({
                    locationRefId: res.data.locationRef.id,
                    firstScraperRunRefId: res.data.firstScraperRunRef.id,
                }))
        ).to.eventually.be.deep.equal({
            firstScraperRunRefId: scraperRunRefId,
            locationRefId,
        });
        await dbUtils.deleteItemByRefId("locations", locationRefId);
        await dbUtils.deleteItemByRefId("scraperRuns", scraperRunRefId);
        await dbUtils.deleteItemByRefId("appointmentAlerts", alertId);
    });
});

describe("getActiveAlertRefId", () => {
    it("retrieves the active alert for a given location when it exists", async () => {
        const locationRefId = await createTestLocation();
        const alertId = await alerts.setUpNewAlert(locationRefId, "12345");

        await expect(
            alerts.getActiveAlertRefId(locationRefId)
        ).to.eventually.equal(alertId);
        await dbUtils.deleteItemByRefId("locations", locationRefId);
        await dbUtils.deleteItemByRefId("appointmentAlerts", alertId);
    });
});

describe("activeAlertExists", () => {
    it("returns false if no alert is active", async () => {
        const nonExistentId = await dbUtils.generateId();

        await expect(alerts.activeAlertExists(nonExistentId)).to.eventually.be
            .false;
    });
    it("returns true if alert is active", async () => {
        const locationRefId = await createTestLocation();
        const alertId = await alerts.setUpNewAlert(locationRefId, "12345");

        await expect(alerts.activeAlertExists(locationRefId)).to.eventually.be
            .true;

        await dbUtils.deleteItemByRefId("locations", locationRefId);
        await dbUtils.deleteItemByRefId("appointmentAlerts", alertId);
    });
});

describe("setInactiveAlert", () => {
    it("throws error if no alert is active", async () => {
        const nonExistentId = await dbUtils.generateId();
        let error;
        try {
            await alerts.setInactiveAlert(nonExistentId, "123");
        } catch (e) {
            error = e;
        }
        expect(error).to.be.instanceOf(Error);
    });

    it("updates the alert with lastScraperRunRefId", async () => {
        const locationRefId = await createTestLocation();
        const alertId = await alerts.setUpNewAlert(locationRefId, "12345");
        const newScraperRunId = await dbUtils.generateId();
        const alertRefId = await setInactiveAlert(
            locationRefId,
            newScraperRunId
        );

        await expect(
            dbUtils
                .retrieveItemByRefId("appointmentAlerts", alertRefId)
                .then((res) => ({
                    locationRefId: res.data?.locationRef?.id,
                    firstScraperRunRefId: res.data?.firstScraperRunRef?.id,
                    lastScraperRunRefId: res.data?.lastScraperRunRef?.id,
                }))
        ).to.eventually.deep.equal({
            locationRefId,
            firstScraperRunRefId: "12345",
            lastScraperRunRefId: newScraperRunId,
        });
    });
});

describe("getLastAlertStartTime", () => {
    it("throws an error if there are no alerts", async () => {
        const nonExistentId = await dbUtils.generateId();
        let error;
        try {
            await alerts.getLastAlertStartTime(nonExistentId);
        } catch (e) {
            error = e;
        }
        expect(error).to.be.instanceOf(Error);
    });

    it("returns the latest timestamp if it exists", async () => {
        const locationRefId = await createTestLocation();
        const alertId = await alerts.setUpNewAlert(locationRefId, "12345");

        const expectedTimestamp = await dbUtils
            .retrieveItemByRefId("appointmentAlerts", alertId)
            .then((res) => res.ts);

        await expect(
            alerts
                .getLastAlertStartTime(locationRefId)
                .then((ts) => ts.format())
        ).to.eventually.equal(moment(expectedTimestamp / 1000).format());

        await dbUtils.deleteItemByRefId("locations", locationRefId);
        await dbUtils.deleteItemByRefId("appointmentAlerts", alertId);
    });
});
