const chai = require("chai");
const expect = chai.expect;

const fakeLoginResponse = {
    token:
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiI2MDBmNDUyMTM5MDFkOTAwMTJkZWIxNzEiLCJleHAiOjE2MTQ5NzU4NDU1MDksInR5cGUiOiJzdGFmZiIsInJvbGVzIjpbIndpZGdldCJdfQ.BZXPZPawrK--QfvD1WDaJ8LKhOwP_yuUEo40q331daI",
};

const fakeAvailabilityResponse = {
    page: 1,
    size: 4,
    response: [
        {
            facility: {
                _id: "6011f3c1fa2b92009a1c0e2a",
                name: "COVID19 VACCINE SOUTH END",
                postcode: "02118",
            },
            date: "2021-03-08T22:20:00.000Z",
        },
        {
            facility: {
                _id: "6011f3c1fa2b92009a1c0e2a",
                name: "COVID19 VACCINE SOUTH END",
                postcode: "02118",
            },
            date: "2021-03-08T22:30:00.000Z",
        },
        {
            facility: {
                _id: "6011f3c1fa2b92009a1c0e2a",
                name: "COVID19 VACCINE SOUTH END",
                postcode: "02118",
            },
            date: "2021-03-09T22:40:00.000Z",
        },
        {
            facility: {
                _id: "6011f3c1fa2b92009a1c0e28",
                name: "COVID19 VACCINE REVERE",
                postcode: "02151",
            },
            date: "2021-03-08T22:40:00.000Z",
        },
    ],
};

function removeTimestamps(results) {
    return results.map((entry) => {
        const { timestamp, ...rest } = entry;
        return rest;
    });
}

describe("East Boston NHC Availability Scraper", function () {
    it("should return availability", async () => {
        const eastBostonNHC = require("../site-scrapers/EastBostonNHC");
        const availabilityService = {
            async getLoginResponse() {
                return Promise.resolve(fakeLoginResponse);
            },
            async getAvailabilityResponse() {
                return Promise.resolve(fakeAvailabilityResponse);
            },
        };
        const results = removeTimestamps(
            await eastBostonNHC(null, availabilityService)
        );

        return expect(results).to.deep.equal([
            {
                name: "East Boston Neighborhood Health Center (Revere - 02151)",
                hasAvailability: true,
                availability: {
                    "2021-03-08": {
                        hasAvailability: true,
                        numberAvailableAppointments: 1,
                    },
                },
                signUpLink:
                    "https://patient.lumahealth.io/survey?patientFormTemplate=601d6aec4f308f00128eb4cd&user=600f45213901d90012deb171",
                extraData:
                    "Open to residents of the following neighborhoods: Chelsea (02150), East Boston (02128), Everett (02149), Revere (02151), South End (02118), Winthrop (02152)",
                street: "10 Garofalo St",
                city: "Revere",
                zip: "02151",
            },
            {
                name:
                    "East Boston Neighborhood Health Center (Chelsea - 02150)",
                hasAvailability: false,
                availability: {},
                signUpLink:
                    "https://patient.lumahealth.io/survey?patientFormTemplate=601d6aec4f308f00128eb4cd&user=600f45213901d90012deb171",
                extraData:
                    "Open to residents of the following neighborhoods: Chelsea (02150), East Boston (02128), Everett (02149), Revere (02151), South End (02118), Winthrop (02152)",
                street: "318 Broadway",
                city: "Chelsea",
                zip: "02150",
            },
            {
                name: "East Boston Neighborhood Health Center (Boston - 02128)",
                hasAvailability: false,
                availability: {},
                signUpLink:
                    "https://patient.lumahealth.io/survey?patientFormTemplate=601d6aec4f308f00128eb4cd&user=600f45213901d90012deb171",
                extraData:
                    "Open to residents of the following neighborhoods: Chelsea (02150), East Boston (02128), Everett (02149), Revere (02151), South End (02118), Winthrop (02152)",
                street: "120 Liverpool St",
                city: "Boston",
                zip: "02128",
            },
            {
                name: "East Boston Neighborhood Health Center (Boston - 02118)",
                hasAvailability: true,
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
                signUpLink:
                    "https://patient.lumahealth.io/survey?patientFormTemplate=601d6aec4f308f00128eb4cd&user=600f45213901d90012deb171",
                extraData:
                    "Open to residents of the following neighborhoods: Chelsea (02150), East Boston (02128), Everett (02149), Revere (02151), South End (02118), Winthrop (02152)",
                street: "1601 Washington St",
                city: "Boston",
                zip: "02118",
            },
        ]);
    });
});
