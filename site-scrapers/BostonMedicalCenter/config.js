const signUpLink =
    "https://mychartscheduling.bmc.org/MyChartscheduling/covid19#/scheduling";

const sites = [
    {
        name: "Boston Medical Center",
        street: "85 East Concord St.",
        city: "Boston",
        zip: "02118",
        departmentID: "10098241",
        signUpLink,
    },
    {
        name:
            "Mattapan COVID-19 Vaccination Site @ Morning Star Baptist Church",
        street: "1257 Blue Hill Ave.",
        city: "Mattapan",
        zip: "02126",
        departmentID: "10098242",
        signUpLink,
    },
    {
        name: "Roslindale COVID-19 Vaccination Site",
        street: "17 Corinth St",
        city: "Roslindale",
        zip: "02131",
        departmentID: "10098243",
        signUpLink,
    },
    {
        name: "Hyde Park COVID-19 Vaccination Site @ Menino YMCA",
        street: "1137 River St.",
        city: "Hyde Park",
        zip: "02136",
        departmentID: "10098244",
        signUpLink,
    },
    {
        name: "Dorchester COVID-19 Vaccination Site @ Russell Auditoriume",
        street: "70 Talbot St.",
        city: "Dorchester",
        zip: "02124",
        departmentID: "10098245",
        signUpLink,
    },
];

providerIDs = ["10033319", "10033364", "10033367", "10033370", "10033373"];

module.exports = {
    sites,
    providerIDs,
};
