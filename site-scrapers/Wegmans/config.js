const site = {
    name: "Wegmans",
    signUpLink: "https://www.wegmans.com/covid-vaccine-registration/",
    getStartedBtn: "//div[@role='button'][contains(.,'Get Started')]",
    massLinkXPath:
        "//span[contains(@class,'quick_reply')][@role='button'][contains(.,'MA')]",
    noAppointments: /All available vaccine appointments are reserved at this time\./,
};

module.exports = {
    site,
};
