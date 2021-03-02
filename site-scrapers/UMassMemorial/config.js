const signUpLink = "https://mychartonline.umassmemorial.org/mychart/openscheduling?specialty=15&hidespecialtysection=1"

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
        name: "UMass Memorial Healthcare",
        departmentID: "111029146",
        signUpLink,
    },
    {
        name: "UMMHC HealthAlliance Clinton Hospital Leominster Campus – Simonds Building Guild Conference Vaccine Clinic",
        departmentID: "104001144",
        signUpLink,
    },
];

module.exports = {
    sites,
};
