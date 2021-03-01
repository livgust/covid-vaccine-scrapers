const {
    extendData,
    formatData,
    getFormattedUnavailableStores,
} = require("./../site-scrapers/Walgreens/dataFormatter");
const chai = require("chai");
const moment = require("moment");
const expect = chai.expect;

const now = moment().local();
const yesterday = moment().subtract(1, "days").local();
const tomorrow = moment().add(1, "days").local();

function removeTimestamps(results) {
    return results.map((entry) => {
        const { timestamp, ...rest } = entry;
        return rest;
    });
}

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

const exampleStoreList = [
    {
        storeNumber: "5241",
        store: {
            storeNumber: "5241",
            storeType: "01",
            address: {
                zip: "46383",
                locationName: null,
                city: "VALPARAISO",
                street: "252 MORTHLAND DR",
                intersection: "Northwest corner OF HWY 2 & HWY 30",
                postalCode: "6202",
                county: "PORTER",
                state: "IN",
            },
            name: "Walgreen Drug Store",
            brand: "Walgreens",
            storeBrand: "Walgreens",
        },
    },
    {
        storeNumber: "12812",
        store: {
            storeNumber: "12812",
            storeType: "01",
            address: {
                zip: "46307",
                locationName: null,
                city: "CROWN POINT",
                street: "1520 S COURT ST",
                intersection:
                    "Southeast corner OF MARSHALL STREET & 125TH AVENUE",
                postalCode: "4809",
                county: "LAKE",
                state: "IN",
            },
            name: "Walgreen Drug Store",
            brand: "Walgreens",
            storeBrand: "Walgreens",
        },
    },
    {
        storeNumber: "3680",
        store: {
            storeNumber: "3680",
            storeType: "01",
            address: {
                zip: "46383",
                locationName: null,
                city: "VALPARAISO",
                street: "1903 CALUMET AVE",
                intersection: "CALUMET AVENUE & GLENDALE",
                postalCode: "2703",
                county: "PORTER",
                state: "IN",
            },
            name: "Walgreen Drug Store",
            brand: "Walgreens",
            storeBrand: "Walgreens",
        },
    },
];

describe("formatData", () => {
    const { signUpLink, hasAvailability, availability, ...result } = formatData(
        [exampleEntry],
        fakeWebsite
    )[0];

    it("formats the name and address", () => {
        expect(removeTimestamps([result])).to.be.deep.equal([
            {
                name: "Walgreens (Los Angeles)",
                street: "3201 W 6th St",
                city: "Los Angeles",
                zip: "90020",
            },
        ]);
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
});

describe("extendData", () => {
    const allSites = [
        { street: "1010 Broadway", city: "Chelsea", zip: "02150" },
        { street: "107 High St", city: "Danvers", zip: "01923" },
    ];
    const availableSites = [
        {
            name: "Walgreens (Chelsea)",
            street: "1010 Broadway",
            city: "Chelsea",
            zip: "02150",
            hasAvailability: true,
            availability: {
                "1/1/2000": {
                    hasAvailability: true,
                    numberAvailableAppointments: 42,
                },
            },
        },
    ];
    it("formats all sites correctly", () => {
        expect(removeTimestamps(extendData([], allSites))).to.be.deep.equal([
            {
                name: "Walgreens (Chelsea)",
                street: "1010 Broadway",
                city: "Chelsea",
                zip: "02150",
                availability: {},
                hasAvailability: false,
            },
            {
                name: "Walgreens (Danvers)",
                street: "107 High St",
                city: "Danvers",
                zip: "01923",
                availability: {},
                hasAvailability: false,
            },
        ]);
    });
    it("doesn't add locations if results are there", () => {
        expect(
            removeTimestamps(extendData(availableSites, allSites))
        ).to.be.deep.equal([
            {
                name: "Walgreens (Chelsea)",
                street: "1010 Broadway",
                city: "Chelsea",
                zip: "02150",
                hasAvailability: true,
                availability: {
                    "1/1/2000": {
                        hasAvailability: true,
                        numberAvailableAppointments: 42,
                    },
                },
            },
            {
                name: "Walgreens (Danvers)",
                street: "107 High St",
                city: "Danvers",
                zip: "01923",
                availability: {},
                hasAvailability: false,
            },
        ]);
    });
});

describe("getFormattedUnavailableStores", () => {
    it("formats the stores correctly", () => {
        expect(
            getFormattedUnavailableStores({}, exampleStoreList)
        ).to.be.deep.equal([
            {
                name: "Walgreen Drug Store",
                city: "Valparaiso",
                street: "252 Morthland Dr",
                zip: "46383",
                hasAvailability: false,
                availability: {},
            },
            {
                name: "Walgreen Drug Store",
                city: "Crown Point",
                street: "1520 S Court St",
                zip: "46307",
                hasAvailability: false,
                availability: {},
            },
            {
                name: "Walgreen Drug Store",
                city: "Valparaiso",
                street: "1903 Calumet Ave",
                zip: "46383",
                hasAvailability: false,
                availability: {},
            },
        ]);
    });
});
