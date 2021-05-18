const entityName =
    "Mass General Brigham (Metro, Martha's Vineyard, and Nantucket)";

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
    {
        public: {
            name: "Brigham Covid Vaccine Clinic - Brookside",
            street: "3297 Washington St",
            city: "Jamaica Plain",
            zip: "02130",
            extraData:
                "Online signup is limited to the first dose of the Pfizer or Moderna vaccine",
            signUpLink: "https://covidvaccine.massgeneralbrigham.org",
        },
        private: { departmentID: "10030030022", providerId: "501309" },
    },
    {
        public: {
            name: "Brigham Covid Vaccine Clinic - Hale",
            street: "60 Fenwood Rd, 1st Fl",
            city: "Boston",
            zip: "02115",
            extraData:
                "Online signup is limited to the first dose of the Pfizer or Moderna vaccine",
            signUpLink: "https://covidvaccine.massgeneralbrigham.org",
        },
        private: { departmentID: "10030011259", providerId: "501298" },
    },
    {
        public: {
            name: "Cooley Dickinson Medical Group COVID Vaccine Clinic Atwood",
            street: "22 Atwood Dr",
            city: "Northampton",
            zip: "01060",
            extraData:
                "Online signup is limited to the first dose of the Pfizer or Moderna vaccine",
            signUpLink: "https://covidvaccine.massgeneralbrigham.org",
        },
        private: { departmentID: "10150060027", providerId: "401795" },
    },
    {
        public: {
            name:
                "Mass General Brigham COVID Vaccine Clinic Assembly Row - Somerville",
            street: "399 Revolution Dr",
            city: "Somerville",
            zip: "02145",
            extraData:
                "Online signup is limited to the first dose of the Pfizer or Moderna vaccine",
            signUpLink: "https://covidvaccine.massgeneralbrigham.org",
        },
        private: { departmentID: "10022740003", providerId: "401800" },
    },
    {
        public: {
            name: "MGH COVID Vaccine Clinic Chelsea",
            street: "151 Everett Ave",
            city: "Chelsea",
            zip: "02150",
            extraData:
                "Online signup is limited to the first dose of the Pfizer or Moderna vaccine",
            signUpLink: "https://covidvaccine.massgeneralbrigham.org",
        },
        private: { departmentID: "10020030085", providerId: "401810" },
    },
    {
        public: {
            name: "MGH COVID Vaccine Clinic Revere",
            street: "300 Ocean Ave",
            city: "Revere",
            zip: "02151",
            extraData:
                "Online signup is limited to the first dose of the Pfizer or Moderna vaccine",
            signUpLink: "https://covidvaccine.massgeneralbrigham.org",
        },
        private: { departmentID: "10020050058", providerId: "401811" },
    },
    {
        public: {
            name: "Newton-Wellesley Hospital COVID Vaccine, Needham",
            street: "400 1st Ave",
            city: "Needham",
            zip: "02494",
            extraData:
                "Online signup is limited to the first dose of the Pfizer or Moderna vaccine",
            signUpLink: "https://covidvaccine.massgeneralbrigham.org",
        },
        private: { departmentID: "10010690001", providerId: "300354" },
    },
    {
        public: {
            name: "North Shore Physicians Group",
            street: "480 Lynnfield St, 2nd Fl",
            city: "Lynn",
            zip: "01904",
            extraData:
                "Online signup is limited to the first dose of the Pfizer or Moderna vaccine",
            signUpLink: "https://covidvaccine.massgeneralbrigham.org",
        },
        private: { departmentID: "10050240001", providerId: "701233" },
    },
    {
        public: {
            name: "Pentucket Medical Covid Vaccine - Haverhill",
            street: "600 Primrose St",
            city: "Haverhill",
            zip: "01830",
            extraData:
                "Online signup is limited to the first dose of the Pfizer or Moderna vaccine",
            signUpLink: "https://covidvaccine.massgeneralbrigham.org",
        },
        private: {
            departmentID: "10180090005",
            providerId: "701227",
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
