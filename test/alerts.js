const sinon = require("sinon");
const alerts = require("../alerts");
const scraperData = require("../lib/db/scraper_data");
const dbUtils = require("../lib/db/utils");
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;
const moment = require("moment");

let newLocationIds = [];
let scraperRunIds = [];

async function createTestLocation() {
    const newLocationId = await dbUtils.generateId();
    const location = await scraperData.writeLocationsByRefIds([
        {
            parentLocationRefId: "123",
            refId: newLocationId,
            name: "Test Location",
            address: {},
        },
    ]);
    newLocationIds.push(newLocationId);
    return newLocationId;
}

async function createTestScraperRun(locationRef, bookableAppointmentsFound) {
    const scraperRunId = await dbUtils.generateId();
    await scraperData.writeScraperRunsByRefIds([
        {
            refId: scraperRunId,
            locationRefId: locationRef,
            parentScraperRunRefId: "234",
            bookableAppointmentsFound,
        },
    ]);
    scraperRunIds.push(scraperRunId);
    return scraperRunId;
}

async function cleanup() {
    await Promise.all([
        dbUtils.deleteItemsByRefIds("locations", newLocationIds),
        dbUtils.deleteItemsByRefIds("scraperRuns", scraperRunIds),
    ]);
    newLocationIds = [];
    scraperRunIds = [];
    return;
}

afterEach(async () => {
    sinon.restore();
    await cleanup();
});

describe("handleIndividualAlert behavior", () => {
    afterEach(async () => {
        sinon.restore();
        await cleanup();
    });

    it("does not make a new alert if an active alert exists", async () => {
        sinon.stub(alerts, "activeAlertExists").returns(true);
        sinon.stub(alerts, "maybeContinueAlerting");
        sinon.stub(alerts, "setInactiveAlert");
        const setUpNewAlertStub = sinon.stub(alerts, "setUpNewAlert");

        await alerts.handleIndividualAlert({
            locationRef: "123",
            scraperRunRef: "456",
            bookableAppointmentsFound: 100,
        });
        expect(setUpNewAlertStub.notCalled).to.be.true;
    });

    it("ends an alert if 0 appointments found and there's an active alert", async () => {
        sinon.stub(alerts, "activeAlertExists").returns(true);
        const setInactiveAlertStub = sinon.stub(alerts, "setInactiveAlert");

        await alerts.handleIndividualAlert({
            locationRefId: "123",
            scraperRunRefId: "456",
            bookableAppointmentsFound: 0,
        });
        expect(setInactiveAlertStub.called).to.be.true;
    });

    it("does continued alerting if an active alert exists", async () => {
        sinon.stub(alerts, "activeAlertExists").returns(true);
        const maybeContinueAlertingStub = sinon.stub(
            alerts,
            "maybeContinueAlerting"
        );

        await alerts.handleIndividualAlert({
            locationRefId: "123",
            scraperRunRefId: "456",
            bookableAppointmentsFound: 100,
        });
        expect(maybeContinueAlertingStub.called).to.be.true;
    });

    it("starts a new alert if we see appointments and no alert is active", async () => {
        sinon.stub(alerts, "activeAlertExists").returns(false);
        sinon.stub(alerts, "REPEAT_ALERT_TIME").returns(0);
        sinon.stub(alerts, "APPOINTMENT_NUMBER_THRESHOLD").returns(0);
        sinon.stub(alerts, "runImmediateAlerts").returns(Promise.resolve());
        sinon
            .stub(alerts, "getLastAlertStartTime")
            .returns(moment().subtract(1, "minute"));
        const setUpNewAlertStub = sinon.stub(alerts, "setUpNewAlert");

        await alerts.handleIndividualAlert({
            locationRefId: "123",
            scraperRunRefId: "456",
            bookableAppointmentsFound: 100,
        });

        expect(setUpNewAlertStub.called).to.be.true;
    });

    it("does nothing if no appts found and no active alert", async () => {
        sinon.stub(alerts, "activeAlertExists").returns(false);
        const actionStubs = [
            sinon.stub(alerts, "maybeContinueAlerting"),
            sinon.stub(alerts, "setInactiveAlert"),
            sinon.stub(alerts, "setUpNewAlert"),
        ];

        await alerts.handleIndividualAlert({
            locationRefId: "123",
            scraperRunRefId: "456",
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
        const alertRefId = await alerts.setInactiveAlert(
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

        await dbUtils.deleteItemByRefId("appointmentAlerts", alertId);
    });
});

describe("mergeData", () => {
    it("links locations with scraperRuns", () => {
        expect(
            alerts.mergeData({
                locations: [
                    {
                        ref: { id: "123" },
                    },
                ],
                scraperRunsAndAppointments: [
                    {
                        scraperRun: {
                            ref: { id: "456" },
                            data: {
                                locationRef: { id: "123" },
                            },
                        },
                        appointments: [{ ref: { id: "1" } }],
                    },
                    {
                        scraperRun: {
                            ref: { id: "789" },
                            data: {
                                locationRef: { id: "124" },
                            },
                        },
                        appointments: [],
                    },
                ],
                parentScraperRunRefId: "500", // not used here
            })
        ).to.deep.equal([
            {
                location: {
                    ref: { id: "123" }, // this structure mimics how we access the ID from the Fauna object
                },
                scraperRun: {
                    ref: { id: "456" },
                    data: {
                        locationRef: { id: "123" },
                    },
                },
                appointments: [{ ref: { id: "1" } }],
            },
        ]);
    });
    it("returns no scraper runs if no link", () => {
        expect(
            alerts.mergeData({
                locations: [
                    {
                        ref: { id: "123" },
                    },
                ],
                scraperRunsAndAppointments: [
                    {
                        scraperRun: {
                            ref: { id: "456" },
                            data: {
                                locationRef: { id: "124" }, //doesn't link to that loc
                            },
                        },
                        appointments: [],
                    },
                ],
                parentScraperRunRefId: "500",
            })
        ).to.deep.equal([
            {
                location: {
                    ref: { id: "123" },
                },
                scraperRun: undefined,
                appointments: undefined,
            },
        ]);
    });
});

describe("aggregateAvailability", () => {
    it("returns generic availability if we have one entry with no listed appts available", () => {
        expect(alerts.aggregateAvailability([{ data: {} }])).to.deep.equal({
            bookableAppointmentsFound: null,
            availabilityWithNoNumbers: true,
        });
    });
    it("returns no availability if no appointments are present", () => {
        expect(alerts.aggregateAvailability([])).to.deep.equal({
            bookableAppointmentsFound: 0,
            availabilityWithNoNumbers: false,
        });
    });
    it("accumulates availability otherwise", () => {
        expect(
            alerts.aggregateAvailability([
                { data: { numberAvailable: 1 } },
                { data: { numberAvailable: 9 } },
                { data: { numberAvailable: 3 } },
            ])
        ).to.deep.equal({
            bookableAppointmentsFound: 13,
            availabilityWithNoNumbers: false,
        });
    });
});

describe("handleGroupAlerts", () => {
    afterEach(async () => {
        sinon.restore();
        await cleanup();
    });

    it("does nothing if the location is not a chain", async () => {
        const setUpNewAlertStub = sinon
            .stub(alerts, "setUpNewAlert")
            .returns(Promise.resolve());
        await alerts.handleGroupAlerts({
            parentLocation: { ref: { id: "123" }, data: { isChain: false } },
            parentScraperRunRefId: "doesntmatter",
            locations: [],
        });

        expect(setUpNewAlertStub.notCalled).to.be.true;
    });

    it("does nothing if there is no active alert and no availability", async () => {
        sinon.stub(alerts, "activeAlertExists").returns(Promise.resolve(false));
        const setUpNewAlertStub = sinon
            .stub(alerts, "setUpNewAlert")
            .returns(Promise.resolve());
        const setInactiveAlertStub = sinon
            .stub(alerts, "setInactiveAlert")
            .returns(Promise.resolve());

        await alerts.handleGroupAlerts({
            parentLocation: { ref: { id: "123" }, data: { isChain: true } },
            parentScraperRunRefId: "doesntmatter",
            locations: [],
        });

        expect(setUpNewAlertStub.notCalled).to.be.true;
        expect(setInactiveAlertStub.notCalled).to.be.true;
    });

    it("starts new alert if no recent or active alert exists and there is availability", async () => {
        sinon.stub(alerts, "activeAlertExists").returns(Promise.resolve(false));
        sinon
            .stub(alerts, "getLastAlertStartTime")
            .returns(
                Promise.resolve(
                    moment().subtract(2 * alerts.REPEAT_ALERT_TIME(), "minutes")
                )
            );
        const setUpNewAlertStub = sinon
            .stub(alerts, "setUpNewAlert")
            .returns(Promise.resolve());
        const setInactiveAlertStub = sinon
            .stub(alerts, "setInactiveAlert")
            .returns(Promise.resolve());

        await alerts.handleGroupAlerts({
            parentLocation: { ref: { id: "123" }, data: { isChain: true } },
            parentScraperRunRefId: "doesntmatter",
            locations: [
                {
                    location: { address: { city: "Haverhill" } },
                    appointments: [
                        {
                            numberAvailable: alerts.APPOINTMENT_NUMBER_THRESHOLD(),
                        },
                    ],
                },
                {
                    location: { address: { city: "Cambridge" } },
                    appointments: [
                        {
                            numberAvailable: alerts.APPOINTMENT_NUMBER_THRESHOLD(),
                        },
                    ],
                },
            ],
        });
        expect(setUpNewAlertStub.lastCall?.args).to.deep.equal([
            "123",
            "doesntmatter",
            2 * alerts.APPOINTMENT_NUMBER_THRESHOLD(),
            false,
        ]);
        expect(setInactiveAlertStub.notCalled).to.be.true;
    });

    it("doesn't start a new alert if it's been a short time since the last", async () => {
        sinon.stub(alerts, "activeAlertExists").returns(Promise.resolve(false));
        sinon
            .stub(alerts, "getLastAlertStartTime")
            .returns(
                Promise.resolve(
                    moment().subtract(alerts.REPEAT_ALERT_TIME() / 2, "minutes")
                )
            );
        const setUpNewAlertStub = sinon
            .stub(alerts, "setUpNewAlert")
            .returns(Promise.resolve());
        const setInactiveAlertStub = sinon
            .stub(alerts, "setInactiveAlert")
            .returns(Promise.resolve());

        await alerts.handleGroupAlerts({
            parentLocation: { ref: { id: "123" }, data: { isChain: true } },
            parentScraperRunRefId: "doesntmatter",
            locations: [
                {
                    location: { address: { city: "Haverhill" } },
                    appointments: [
                        {
                            numberAvailable: alerts.APPOINTMENT_NUMBER_THRESHOLD(),
                        },
                    ],
                },
                {
                    location: { address: { city: "Cambridge" } },
                    appointments: [
                        {
                            numberAvailable: alerts.APPOINTMENT_NUMBER_THRESHOLD(),
                        },
                    ],
                },
            ],
        });
        expect(setUpNewAlertStub.notCalled).to.be.true;
        expect(setInactiveAlertStub.notCalled).to.be.true;
    });

    it("ends an alert if there is an active alert and no current availability", async () => {
        sinon.stub(alerts, "activeAlertExists").returns(Promise.resolve(true));
        const setUpNewAlertStub = sinon
            .stub(alerts, "setUpNewAlert")
            .returns(Promise.resolve());
        const setInactiveAlertStub = sinon
            .stub(alerts, "setInactiveAlert")
            .returns(Promise.resolve());

        await alerts.handleGroupAlerts({
            parentLocation: {
                ref: { id: "123" },
                data: { isChain: true },
            },
            parentScraperRunRefId: "doesntmatter",
            locations: [
                {
                    location: { address: { city: "Haverhill" } },
                    appointments: [],
                },
                {
                    location: { address: { city: "Cambridge" } },
                    appointments: [],
                },
            ],
        });
        expect(setUpNewAlertStub.notCalled).to.be.true;
        expect(setInactiveAlertStub.lastCall?.args).to.deep.equal([
            "123",
            "doesntmatter",
        ]);
    });
});
