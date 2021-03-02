const mychart = require("../lib/MyChartAPI");

const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

const exampleWithAvailability = {
    AllDays: {
        "SD_10033367_10098243_2008_20210403_en-US": {
            Date: "/Date(1617422400000)/",
            DateISO: "2021-04-03",
            DisplayDate: "Saturday April 3, 2021",
            ProviderID: "10033367",
            DepartmentID: "10098243",
            VisitTypeID: "2008",
            VisitTypeName: "COVID-19 Vaccine 1st",
            VisitTypeFromDaysOffset: null,
            VisitTypeToDaysOffset: null,
            VisitTypeInfo: {
                Name: "COVID-19 VACCINE 1",
                DisplayName: "COVID-19 Vaccine 1st",
                ID: "2008",
                IDType: "EXTERNAL",
                FromDaysOffset: null,
                ToDaysOffset: null,
                PatientInstructions: [],
                IsAdvanced: true,
                GroupByDepartment: true,
                IsTelemedicine: false,
                IsExcludedFromWizard: true,
            },
            Slots: [
                {
                    StartTime: "/Date(1614278400000)/",
                    AppointmentTime: "/Date(1614278400000)/",
                    StartTimeISO: "13:40:00",
                    AppointmentTimeISO: "13:40:00",
                    ArrivalTimeISO: "13:40:00",
                    FormattedStartTimeLong: "1:40 PM",
                    SlotIndex: "0",
                    FormattedStartTimeShort: "1:40 PM",
                    FormattedArrivalTimeLong: null,
                    DayKey: "SD_10033367_10098243_2008_20210403_en-US",
                    DurationInMinutes: 0,
                    SlotProviderId: "",
                    CanShowAppointmentTime: true,
                },
            ],
        },
    },
    AllDepartments: {
        10098241: {
            Name: "Boston Medical Center @ 85 East Concord",
            FormattedAddress: ["85 East Concord St.", "Boston MA 02118-2526"],
            Address: {
                Street: ["85 East Concord St."],
                City: "Boston",
                StateName: "Massachusetts",
                StateValue: 22,
                PostalCode: "02118-2526",
                CountyName: "",
                CountyValue: 0,
                CountryName: "",
                CountryValue: 0,
                HouseNumber: "",
                DistrictName: "",
                DistrictValue: 0,
                IDs: null,
            },
            Latitude: "",
            Longitude: "",
            LocationInstructions: [],
            PhoneForScheduling: "",
            Phone: "",
            FromDaysOffset: null,
            ToDaysOffset: null,
            ID: "10098241",
            HomepageUrl: "",
            PhotoUrl: "",
            DepartmentVisitTypeOverrides: [
                {
                    DepartmentID: "10098241",
                    VisitTypeID: "2008",
                    FromDaysOffset: null,
                    ToDaysOffset: null,
                },
            ],
        },
        10098242: {
            Name:
                "Mattapan COVID-19 Vaccination Site @ Morning Star Baptist Church",
            FormattedAddress: ["1257 Blue Hill Ave.", "MATTAPAN MA 02126"],
            Address: {
                Street: ["1257 Blue Hill Ave."],
                City: "MATTAPAN",
                StateName: "Massachusetts",
                StateValue: 22,
                PostalCode: "02126",
                CountyName: "SUFFOLK",
                CountyValue: 1658,
                CountryName: "United States of America",
                CountryValue: 1,
                HouseNumber: "",
                DistrictName: "",
                DistrictValue: 0,
                IDs: null,
            },
            Latitude: "",
            Longitude: "",
            LocationInstructions: [],
            PhoneForScheduling: "",
            Phone: "",
            FromDaysOffset: null,
            ToDaysOffset: null,
            ID: "10098242",
            HomepageUrl: "",
            PhotoUrl: "",
            DepartmentVisitTypeOverrides: [
                {
                    DepartmentID: "10098242",
                    VisitTypeID: "2008",
                    FromDaysOffset: null,
                    ToDaysOffset: null,
                },
            ],
        },
        10098243: {
            Name: "Roslindale COVID-19 Vaccination Site @ 17 Corinth Street",
            FormattedAddress: ["17 Corinth St", "ROSLINDALE MA 02131"],
            Address: {
                Street: ["17 Corinth St"],
                City: "ROSLINDALE",
                StateName: "Massachusetts",
                StateValue: 22,
                PostalCode: "02131",
                CountyName: "SUFFOLK",
                CountyValue: 1658,
                CountryName: "United States of America",
                CountryValue: 1,
                HouseNumber: "",
                DistrictName: "",
                DistrictValue: 0,
                IDs: null,
            },
            Latitude: "",
            Longitude: "",
            LocationInstructions: [],
            PhoneForScheduling: "",
            Phone: "",
            FromDaysOffset: null,
            ToDaysOffset: null,
            ID: "10098243",
            HomepageUrl: "",
            PhotoUrl: "",
            DepartmentVisitTypeOverrides: [
                {
                    DepartmentID: "10098243",
                    VisitTypeID: "2008",
                    FromDaysOffset: null,
                    ToDaysOffset: null,
                },
            ],
        },
        10098244: {
            Name: "Hyde Park COVID-19 Vaccination Site @ Menino YMCA",
            FormattedAddress: ["1137 River St.", "HYDE PARK MA 02136"],
            Address: {
                Street: ["1137 River St."],
                City: "HYDE PARK",
                StateName: "Massachusetts",
                StateValue: 22,
                PostalCode: "02136",
                CountyName: "SUFFOLK",
                CountyValue: 1658,
                CountryName: "United States of America",
                CountryValue: 1,
                HouseNumber: "",
                DistrictName: "",
                DistrictValue: 0,
                IDs: null,
            },
            Latitude: "",
            Longitude: "",
            LocationInstructions: [],
            PhoneForScheduling: "",
            Phone: "",
            FromDaysOffset: null,
            ToDaysOffset: null,
            ID: "10098244",
            HomepageUrl: "",
            PhotoUrl: "",
            DepartmentVisitTypeOverrides: [
                {
                    DepartmentID: "10098244",
                    VisitTypeID: "2008",
                    FromDaysOffset: null,
                    ToDaysOffset: null,
                },
            ],
        },
        10098245: {
            Name: "Dorchester COVID-19 Vaccination Site @ Russell Auditorium",
            FormattedAddress: ["70 Talbot St.", "DORCHESTER MA 02124"],
            Address: {
                Street: ["70 Talbot St."],
                City: "DORCHESTER",
                StateName: "Massachusetts",
                StateValue: 22,
                PostalCode: "02124",
                CountyName: "SUFFOLK",
                CountyValue: 1658,
                CountryName: "United States of America",
                CountryValue: 1,
                HouseNumber: "",
                DistrictName: "",
                DistrictValue: 0,
                IDs: null,
            },
            Latitude: "",
            Longitude: "",
            LocationInstructions: [],
            PhoneForScheduling: "",
            Phone: "",
            FromDaysOffset: null,
            ToDaysOffset: null,
            ID: "10098245",
            HomepageUrl: "",
            PhotoUrl: "",
            DepartmentVisitTypeOverrides: [
                {
                    DepartmentID: "10098245",
                    VisitTypeID: "2008",
                    FromDaysOffset: null,
                    ToDaysOffset: null,
                },
            ],
        },
    },
    AllProviders: {
        10033319: {
            DisplayName: "EAST CONCORD COVID VACCINE - RN1",
            NameLastFirst: "EAST CONCORD COVID VACCINE - RN1",
            ID: "10033319",
            PhotoUrl: "",
            HomePageUrl: "",
            InfoUrl: "",
            AboutMeText: "",
            DisplayHTML: "",
        },
        10033364: {
            DisplayName: "BMC MATTAPAN COVID VACCINE RN 1",
            NameLastFirst: "BMC MATTAPAN COVID VACCINE RN 1",
            ID: "10033364",
            PhotoUrl: "",
            HomePageUrl: "",
            InfoUrl: "",
            AboutMeText: "",
            DisplayHTML: "",
        },
        10033367: {
            DisplayName: "BMC ROSLINDALE COVID VACCINE RN 1",
            NameLastFirst: "BMC ROSLINDALE COVID VACCINE RN 1",
            ID: "10033367",
            PhotoUrl: "",
            HomePageUrl: "",
            InfoUrl: "",
            AboutMeText: "",
            DisplayHTML: "",
        },
        10033370: {
            DisplayName: "BMC HYDE PARK COVID VACCINE RN 1",
            NameLastFirst: "BMC HYDE PARK COVID VACCINE RN 1",
            ID: "10033370",
            PhotoUrl: "",
            HomePageUrl: "",
            InfoUrl: "",
            AboutMeText: "",
            DisplayHTML: "",
        },
        10033373: {
            DisplayName: "BMC CODMAN SQ COVID VACCINE RN 1",
            NameLastFirst: "BMC CODMAN SQ COVID VACCINE RN 1",
            ID: "10033373",
            PhotoUrl: "",
            HomePageUrl: "",
            InfoUrl: "",
            AboutMeText: "",
            DisplayHTML: "",
        },
    },
    ByDateThenProviderCollated: {
        "2021-04-03": {
            DateKey: "637530048000000000",
            FormattedDate: "Saturday April 3, 2021",
            ProvidersAndHours: {
                10098243: {
                    ProviderID: "10098243",
                    HoursAndSlots: {},
                    DepartmentAndSlots: {
                        10098243: {
                            DepartmentID: "10098243",
                            HoursAndSlots: {
                                13: {
                                    Slots: [
                                        {
                                            StartTime: "/Date(1614278400000)/",
                                            AppointmentTime:
                                                "/Date(1614278400000)/",
                                            StartTimeISO: "13:40:00",
                                            AppointmentTimeISO: "13:40:00",
                                            ArrivalTimeISO: "13:40:00",
                                            FormattedStartTimeLong: "1:40 PM",
                                            SlotIndex: "0",
                                            FormattedStartTimeShort: "1:40 PM",
                                            FormattedArrivalTimeLong: null,
                                            DayKey:
                                                "SD_10033367_10098243_2008_20210403_en-US",
                                            DurationInMinutes: 0,
                                            SlotProviderId: "",
                                            CanShowAppointmentTime: true,
                                        },
                                    ],
                                    AmPm: "pm",
                                },
                            },
                        },
                    },
                },
            },
            DayOfWeek: 6,
        },
    },
    ProviderInfoHtml: null,
    EarliestDate: "2021-04-01",
    LatestDate: "2021-04-08",
    Specialty: null,
    VisitType: "2008",
    ErrorCode: null,
    VisitTypeInfo: {
        Name: "COVID-19 VACCINE 1",
        DisplayName: "COVID-19 Vaccine 1st",
        ID: "2008",
        IDType: "EXTERNAL",
        FromDaysOffset: null,
        ToDaysOffset: null,
        PatientInstructions: [],
        IsAdvanced: true,
        GroupByDepartment: true,
        IsTelemedicine: false,
        IsExcludedFromWizard: true,
    },
};

const exampleWithError = {
    AllDays: null,
    AllDepartments: null,
    AllProviders: null,
    ByDateThenProviderCollated: null,
    ProviderInfoHtml: null,
    EarliestDate: null,
    LatestDate: null,
    Specialty: null,
    VisitType: null,
    ErrorCode: 'StartDateTooFarInFuture',
    VisitTypeInfo: null
};

describe("AddSiteInfo", () => {
    it("should add site info and default data to results object", () => {
        results = {};
        siteKey = Object.keys(exampleWithAvailability.AllDepartments)[0];
        siteInfo = exampleWithAvailability.AllDepartments[siteKey];
        
        mychart.AddSiteInfo(results, {default: 'default'}, siteKey, siteInfo)
        
        // should have key for department ID
        expect(results).to.have.property(siteKey);
        
        // should add default values
        expect(results[siteKey].default).to.equal('default');
        
        // should add name and address
        expect(results[siteKey].name).to.equal(siteInfo.Name)
        expect(results[siteKey].street).to.equal(siteInfo.Address.Street.join(" "))
        expect(results[siteKey].city).to.equal(siteInfo.Address.City)
        expect(results[siteKey].zip).to.equal(siteInfo.Address.PostalCode)
    });
});

describe("UpdateResults", () => {
    it("should add site info and default data to results object", () => {
        results = {};        
        mychart.UpdateResults(results, exampleWithAvailability)

        for (const [key, info] of Object.entries(results)) {
            if (key == 10098243) {
                // this is the only site that has availability
                expect(info.hasAvailability).to.equal(true);
                expect(Object.keys(info.availability).length).to.equal(1);
                expect(Object.values(info.availability)[0]).to.deep.equal({
                    numberAvailableAppointments: 1,
                    hasAvailability: true,
                });
            } else {
                expect(info.hasAvailability).to.equal(false);
                expect(info.availability).to.deep.equal({});
            }
        }
    });
    it("should handle null values", () => {
        results = {};        
        mychart.UpdateResults(results, exampleWithError)
        expect(results).to.deep.equal({});
    });
});