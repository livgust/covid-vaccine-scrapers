const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;
const moment = require("moment");

const fakeAvailabilityForMonth_withAvailability = {
    Success: true,
    Message: "Calendar successfully retrieved",
    Data: {
        Days: [
            { DayOfWeek: "Monday", DayNumber: 1, Available: false },
            { DayOfWeek: "Wednesday", DayNumber: 3, Available: true },
            { DayOfWeek: "Friday", DayNumber: 26, Available: true },
            { DayOfWeek: "Saturday", DayNumber: 27, Available: false },
        ],
    },
};
const fakeAvailabilityForMonth_withoutAvailability = {
    Success: true,
    Message: "Calendar successfully retrieved",
    Data: {
        Days: [
            { DayOfWeek: "Monday", DayNumber: 1, Available: false },
            { DayOfWeek: "Wednesday", DayNumber: 3, Available: false },
            { DayOfWeek: "Friday", DayNumber: 26, Available: false },
            { DayOfWeek: "Saturday", DayNumber: 27, Available: false },
        ],
    },
};
const fakeAvailabilityForDay_withAvailability = {
    Success: true,
    Message: "Day successfully retrieved",
    Data: {
        Rows: [
            {
                RowTitle: "9:15 am",
            },
            {
                RowTitle: "10:15 am",
            },
        ],
    },
};
const fakeAvailabilityForDay_withoutAvailability = {
    Success: true,
    Message: "Day successfully retrieved",
    Data: {
        Rows: [],
    },
};

const currMonth = parseInt(moment().format("M"));
describe("RxTouch Availability Scraper", function () {
    it("should return availability when Month and Day APIs return some", async () => {
        const rxTouch = require("../lib/RxTouch");
        const availabilityService = {
            async getAvailabilityForMonth() {
                return Promise.resolve(
                    fakeAvailabilityForMonth_withAvailability
                );
            },
            async getAvailabilityForDay() {
                return Promise.resolve(fakeAvailabilityForDay_withAvailability);
            },
        };
        return expect(
            rxTouch.GetAllAvailability(availabilityService, "02144")
        ).to.eventually.deep.equal({
            message:
                "Availability found. Search on signup website for zip 02144",
            availability: {
                [`${currMonth}/3/2021`]: {
                    hasAvailability: true,
                    numberAvailableAppointments: 2,
                    signUpLink: null,
                },
                [`${currMonth}/26/2021`]: {
                    hasAvailability: true,
                    numberAvailableAppointments: 2,
                    signUpLink: null,
                },
                [`${currMonth + 1}/3/2021`]: {
                    hasAvailability: true,
                    numberAvailableAppointments: 2,
                    signUpLink: null,
                },
                [`${currMonth + 1}/26/2021`]: {
                    hasAvailability: true,
                    numberAvailableAppointments: 2,
                    signUpLink: null,
                },
            },
        });
    });
    it("should return NO availability when neither Month nor Day APIs returns any", async () => {
        const rxTouch = require("../lib/RxTouch");
        const availabilityService = {
            async getAvailabilityForMonth() {
                return Promise.resolve(
                    fakeAvailabilityForMonth_withoutAvailability
                );
            },
            async getAvailabilityForDay() {
                return Promise.resolve(
                    fakeAvailabilityForDay_withoutAvailability
                );
            },
        };
        return expect(
            rxTouch.GetAllAvailability(availabilityService, "02144")
        ).to.eventually.deep.equal({
            message: "No available appointments (code 2).",
            availability: {},
        });
    });

    it("should return NO availability when Month API returns some but Day API doesnt return any", async () => {
        const rxTouch = require("../lib/RxTouch");
        const availabilityService = {
            async getAvailabilityForMonth() {
                return Promise.resolve(
                    fakeAvailabilityForMonth_withAvailability
                );
            },
            async getAvailabilityForDay() {
                return Promise.resolve(
                    fakeAvailabilityForDay_withoutAvailability
                );
            },
        };
        return expect(
            rxTouch.GetAllAvailability(availabilityService, "02144")
        ).to.eventually.deep.equal({
            message: "No available appointments (code 2).",
            availability: {},
        });
    });
});
