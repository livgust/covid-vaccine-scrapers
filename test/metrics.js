const { getTotalNumberOfAppointments } = require("../lib/metrics");
const chai = require("chai");
const expect = chai.expect;

describe("getTotalNumberOfAppointments", () => {
    it("works for null result", () => {
        expect(getTotalNumberOfAppointments(null)).to.be.equal(0);
    });

    it("works for single result with no date availability", () => {
        expect(
            getTotalNumberOfAppointments({ hasAvailability: true })
        ).to.be.equal(1);
    });

    it("works for single result with date availability", () => {
        expect(
            getTotalNumberOfAppointments({
                availability: {
                    "2021-01-01": { numberAvailableAppointments: 5 },
                    "2021-01-02": { numberAvailableAppointments: 3 },
                },
            })
        ).to.be.equal(8);
    });

    it("works for array with date availability", () => {
        expect(
            getTotalNumberOfAppointments([
                {
                    availability: {
                        "2021-01-01": { numberAvailableAppointments: 5 },
                        "2021-01-02": { numberAvailableAppointments: 3 },
                    },
                },
                {
                    availability: {
                        "2021-01-01": { numberAvailableAppointments: 10 },
                        "2021-01-02": { numberAvailableAppointments: 20 },
                    },
                },
            ])
        ).to.be.equal(38);
    });
});
