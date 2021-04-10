const provider = "Greater Lawrence FHC";

const sites = [
    {
        public: {
            name: "Greater Lawrence FHC (Essex Street)",
            street: "700 Essex St.",
            zip: "01841",
            extraData: "Greater Lawrence Family Health Center patients only",
            signUpLink: "https://glfhc.org/covid-19-vaccine-signup-form/",
        },
        private: {
            scrapeUrl:
                "https://glfhccovid19iz.as.me/schedule.php?action=showCalendar&fulldate=1&owner=21956779&template=weekly&location=700+Essex+Street%2C+Lawrence+MA",

            calendar: "5075244",
        },
    },
    {
        public: {
            name: "Greater Lawrence FHC (Pelham Street)",
            street: "147 Pelham St.",
            city: "Methuen",
            zip: "01844",
            signUpLink: "https://glfhc.org/covid-19-vaccine-signup-form/",
        },
        private: {
            scrapeUrl:
                "https://glfhccovid19iz.as.me/schedule.php?action=showCalendar&fulldate=1&owner=21956779&template=weekly",
            calendar: "5114836",
        },
    },
    {
        public: {
            name: "Greater Lawrence FHC (Central Plaza)",
            street: "2 Water St.",
            city: "Haverhill",
            zip: "01830",
            signUpLink: "https://glfhc.org/covid-19-vaccine-signup-form/",
        },
        private: {
            scrapeUrl:
                "https://glfhccovid19iz.as.me/schedule.php?action=showCalendar&fulldate=1&owner=21956779&template=weekly&location=Central+Plaza%2C+2+Water+Street%2C+Haverhill+MA",

            calendar: "5236989",
        },
    },
    {
        public: {
            name: "Northern Essex Community College (Lawrence residents only)",
            street: "45 Franklin St.",
            city: "Lawrence",
            zip: "01840",
            signUpLink: "https://glfhc.org/covid-19-vaccine-signup-form/",
        },
        private: {
            scrapeUrl:
                "https://glfhccovid19iz.as.me/schedule.php?action=showCalendar&fulldate=1&owner=21956779&template=weekly&location=45+Franklin+Street%2C+Lawrence+MA",
            calendar: "5341082",
        },
    },
];

module.exports = {
    provider,
    sites,
};
