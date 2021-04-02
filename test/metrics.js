const { getTotalNumberOfAppointments } = require("../lib/metrics");
const chai = require("chai");
const expect = chai.expect;

describe("metrics getTotalNumberOfAppointments", () => {
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
                hasAvailability: true,
                signUpLink: "www.example.com",
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
                    hasAvailability: true,
                    signUpLink: "www.example.com",
                },
                {
                    availability: {
                        "2021-01-01": { numberAvailableAppointments: 10 },
                        "2021-01-02": { numberAvailableAppointments: 20 },
                    },
                    hasAvailability: true,
                    signUpLink: "www.example.com",
                },
            ])
        ).to.be.equal(38);
    });

    it("ignores when no sign-up link is present", () => {
        expect(
            getTotalNumberOfAppointments([
                {
                    availability: {
                        "2021-01-01": { numberAvailableAppointments: 5 },
                        "2021-01-02": { numberAvailableAppointments: 3 },
                    },
                    hasAvailability: true,
                    signUpLink: null,
                },
            ])
        ).to.be.equal(0);
        expect(
            getTotalNumberOfAppointments([
                {
                    availability: {
                        "2021-01-01": {
                            numberAvailableAppointments: 5,
                            signUpLink: "www.example.com",
                        },
                        "2021-01-02": {
                            numberAvailableAppointments: 3,
                            signUpLink: null,
                        },
                    },
                    hasAvailability: true,
                },
            ])
        ).to.be.equal(5);
    });

    it("ignores when hasAvailability is false", () => {
        expect(
            getTotalNumberOfAppointments([
                {
                    availability: {
                        "2021-01-01": { numberAvailableAppointments: 5 },
                        "2021-01-02": { numberAvailableAppointments: 3 },
                    },
                    hasAvailability: false,
                    signUpLink: "www.example.com",
                },
            ])
        ).to.be.equal(0);
    });
});
