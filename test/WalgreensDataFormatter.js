const dataFormatter = require("./../site-scrapers/Walgreens/dataFormatter");
const chai = require("chai");
const moment = require("moment");
const expect = chai.expect;

const now = moment().local();
const yesterday = moment().subtract(1, "days").local();
const tomorrow = moment().add(1, "days").local();

const fakeWebsite = "www.example.com/sign-up";
const exampleEntry = {
    locationId: "9148a7ed-9dd4-4062-9cb5-46277d9b5b3d",
    name: "Walgreen Drug Store",
    partnerLocationId: "5879",
    description: "",
    logoURL:
        "/images/adaptive/pharmacy/healthcenter/health-navigator/Walgreens_logo_2X.png",
    distance: 12.94,
    position: { latitude: 34.063943, longitude: -118.291847 },
    address: {
        line1: "3201 W 6TH ST",
        line2: "",
        city: "LOS ANGELES",
        state: "CA",
        country: "US",
        zip: "90020",
    },
    categories: [
        {
            code: "2",
            display: "Immunizations",
            services: [{ code: "99", display: "COVID-19 Vaccine" }],
        },
    ],
    orgId: "Organization/35860656-84da-43fd-b66f-47e81b483e3b",
    phone: [
        { type: "StorePrimary", number: "213-251-0179" },
        { type: "StoreSecondary", number: "" },
        { type: "Pharmacy", number: "213-251-0179" },
    ],
    fhirLocationId: "9148a7ed-9dd4-4062-9cb5-46277d9b5b3d",
    storenumber: "5879",
    appointmentAvailability: [
        {
            date: yesterday.format("YYYY-MM-DD"),
            day: yesterday.format("dddd"),
            slots: ["12:00 pm"],
        },
        {
            date: now.format("YYYY-MM-DD"),
            day: now.dddd,
            slots: [now.format("HH:mm a")],
        },
        {
            date: tomorrow.format("YYYY-MM-DD"),
            day: tomorrow.format("dddd"),
            slots: ["09:30 am", "09:45 am", "10:00 am"],
        },
    ],
};

const { signUpLink, hasAvailability, availability, ...result } = dataFormatter(
    [exampleEntry],
    fakeWebsite
)[0];

it("formats the name and address", () => {
    expect(result).to.be.deep.equal({
        name: "Walgreens",
        street: "3201 W 6th St",
        city: "Los Angeles",
        zip: "90020",
    });
});

it("filters out and formats availability", () => {
    const expectedAvailability = {};
    expectedAvailability[now.format("M/D/YYYY")] = {
        hasAvailability: false,
        numberAvailableAppointments: 0,
    };
    expectedAvailability[tomorrow.format("M/D/YYYY")] = {
        hasAvailability: true,
        numberAvailableAppointments: 3,
    };

    expect(hasAvailability).to.be.true;
    expect(availability).to.be.deep.equal(expectedAvailability);
});

it("passes the sign up link", () => {
    expect(signUpLink).to.be.equal(fakeWebsite);
});
