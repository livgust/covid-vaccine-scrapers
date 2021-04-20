const provider = "Greater Lawrence Family Health Center";

const sites = [
    {
        public: {
            name: "Greater Lawrence Family Health Center (Essex Street)",
            street: "700 Essex St.",
            zip: "01841",
            restrictions:
                "Greater Lawrence Family Health Center patients only / Pacientes solamente",
            signUpLink:
                "https://glfhccovid19iz.as.me/schedule.php?location=700+Essex+Street%2C+Lawrence+MA",
        },
        private: {
            scrapeUrl:
                "https://glfhccovid19iz.as.me/schedule.php?action=showCalendar&fulldate=1&owner=21956779&template=weekly&location=700+Essex+Street%2C+Lawrence+MA",

            calendar: "5075244",
        },
    },
    {
        public: {
            name: "Greater Lawrence Family Health Center (Pelham Street)",
            street: "147 Pelham St.",
            city: "Methuen",
            zip: "01844",
            signUpLink:
                "https://glfhccovid19iz.as.me/schedule.php?calendarID=5114836",
        },
        private: {
            scrapeUrl:
                "https://glfhccovid19iz.as.me/schedule.php?action=showCalendar&fulldate=1&owner=21956779&template=weekly",
            calendar: "5114836",
        },
    },
    {
        public: {
            name: "Greater Lawrence Family Health Center (Central Plaza)",
            street: "2 Water St.",
            city: "Haverhill",
            zip: "01830",
            signUpLink:
                "https://glfhccovid19iz.as.me/schedule.php?location=Central+Plaza%2C+2+Water+Street%2C+Haverhill+MA",
        },
        private: {
            scrapeUrl:
                "https://glfhccovid19iz.as.me/schedule.php?action=showCalendar&fulldate=1&owner=21956779&template=weekly&location=Central+Plaza%2C+2+Water+Street%2C+Haverhill+MA",

            calendar: "5236989",
        },
    },
    {
        public: {
            name: "Northern Essex Community College",
            street: "45 Franklin St.",
            city: "Lawrence",
            zip: "01840",
            restrictions:
                "Lawrence Residents only / Residentes de Lawrence solamente",
            signUpLink:
                "https://glfhccovid19iz.as.me/?location=45%20Franklin%20Street%2C%20Lawrence%20MA",
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
