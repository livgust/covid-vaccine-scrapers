const entityName = "Mass General Brigham (MVH and Nantucket)";

const scheduleHost = "patientgateway.massgeneralbrigham.org";

const schedulePath = () => {
    return `/MyChart-PRD/OpenScheduling/OpenScheduling/GetOpeningsForProvider?noCache=${Math.random()}`;
};

const sites = [
    {
        public: {
            name: "Mass General Martha's Vineyard",
            street: "1 Hospital Road",
            city: "Oak Bluffs",
            zip: "02557",
            extraData:
                "Online signup is limited to the first dose of the Pfizer or Moderna vaccine",
            signUpLink: "https://covidvaccine.massgeneralbrigham.org",
        },
        private: {
            departmentID: "10110010104",
            providerId: "401790",
        },
    },
    {
        public: {
            name: "Mass General Brigham Nantucket",
            street: "22 New South Road",
            city: "Nantucket",
            zip: "02554",
            extraData:
                "Online signup is limited to the first dose of the Pfizer or Moderna vaccine",
            signUpLink: "https://covidvaccine.massgeneralbrigham.org",
        },
        private: {
            departmentID: "10120040001",
            providerId: "401797",
        },
    },
];

const startUrl =
    "https://patientgateway.massgeneralbrigham.org/mychart-prd/SignupAndSchedule/EmbeddedSchedule";

const vt = "555097";

module.exports = {
    entityName,
    startUrl,
    scheduleHost,
    schedulePath,
    sites,
    vt,
};
