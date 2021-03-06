const signUpLink =
    "https://mychartonline.umassmemorial.org/mychart/openscheduling?specialty=15&hidespecialtysection=1";

const sites = [
    {
        name: "UMass Memorial Marlborough",
        street: "157 Union Street",
        city: "Marlborough",
        zip: "01752",
        departmentID: "111029148",
        signUpLink,
    },
    {
        name: "UMass Memorial Mercantile Center",
        street: "201 Commercial St.",
        city: "Worcester",
        zip: "01608",
        departmentID: "111029146",
        signUpLink,
    },
    {
        name: "UMMHC HealthAlliance Clinton Hospital Leominster Campus",
        departmentID: "104001144",
        signUpLink,
    },
];

const providers = [
    "56394",
    "56395",
    "56396",
    "56475",
    "56476",
    "56526",
    "56527",
    "56528",
    "56529",
    "56530",
    "56531",
    "56532",
    "56533",
];

module.exports = {
    sites,
    providers,
};
