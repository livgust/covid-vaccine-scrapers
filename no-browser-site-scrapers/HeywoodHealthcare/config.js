const site = {
    public: {
        name: "Heywood Healthcare",
        street: "171 Kendall Pond Road W",
        city: "Gardner",
        state: "MA",
        zip: "01440",
        signUpLink: " https://gardnervaccinations.as.me/schedule.php",
        extraData: {
            Note:
                "Vaccinations will be at the Polish American Citizens Club (PACC), 171 Kendall Pond Rd W, Gardner, MA 01440",
        },
    },
    private: {
        fetchRequestUrl:
            "https://gardnervaccinations.as.me/schedule.php?action=showCalendar&fulldate=1&owner=21588707&template=class",
    },
};

module.exports = {
    site,
};
