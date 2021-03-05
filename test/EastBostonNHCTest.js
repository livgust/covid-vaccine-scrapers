const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

const fakeLoginResponse = {
    token:
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiI2MDBmNDUyMTM5MDFkOTAwMTJkZWIxNzEiLCJleHAiOjE2MTQ5NzU4NDU1MDksInR5cGUiOiJzdGFmZiIsInJvbGVzIjpbIndpZGdldCJdfQ.BZXPZPawrK--QfvD1WDaJ8LKhOwP_yuUEo40q331daI",
};

const fakeAvailabilityResponse = {
    page: 1,
    size: 2,
    response: [
        {
            _id: "603fe04156700900a0285848",
            facility: {
                _id: "6011f3c1fa2b92009a1c0e2a",
                name: "COVID19 VACCINE SOUTH END",
                postcode: "02118",
            },
            date: "2021-03-08T22:20:00.000Z",
        },
        {
            _id: "603fe04156700900a0285848",
            facility: {
                _id: "6011f3c1fa2b92009a1c0e2a",
                name: "COVID19 VACCINE SOUTH END",
                postcode: "02118",
            },
            date: "2021-03-08T22:30:00.000Z",
        },
        {
            _id: "603fe04156700900a0285849",
            facility: {
                _id: "6011f3c1fa2b92009a1c0e2a",
                name: "COVID19 VACCINE SOUTH END",
                postcode: "02118",
            },
            date: "2021-03-09T22:40:00.000Z",
        },
        {
            _id: "603fe04156700900a0285849",
            facility: {
                _id: "6011f3c1fa2b92009a1c0e28",
                name: "COVID19 VACCINE REVERE",
                postcode: "02151",
            },
            date: "2021-03-08T22:40:00.000Z",
        },
    ],
};

describe("East Boston NHC Availability Scraper", function () {
    it("should return availability ", async () => {
        const eastBostonNHC = require("../site-scrapers/EastBostonNHC");
        console.log(eastBostonNHC);
        const availabilityService = {
            async getLoginResponse() {
                return Promise.resolve(fakeLoginResponse);
            },
            async getAvailabilityResponse() {
                return Promise.resolve(fakeAvailabilityResponse);
            },
        };
        return expect(
            eastBostonNHC.GetAllAvailability(availabilityService, "02144")
        ).to.eventually.deep.equal({
            "02118": {
                // index by zip of the facility? probably.
                availability: {
                    "2021-03-08": {
                        hasAvailability: true,
                        numberAvailableAppointments: 2,
                    },
                    "2021-03-09": {
                        hasAvailability: true,
                        numberAvailableAppointments: 1,
                    },
                },
            },
            "02151": {
                // index by zip of the facility? probably.
                availability: {
                    "2021-03-08": {
                        hasAvailability: true,
                        numberAvailableAppointments: 1,
                    },
                },
            },
        });
    });
});
