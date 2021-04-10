const site = {
    name: "Wegmans",
    signUpLink: "https://www.wegmans.com/covid-vaccine-registration/",
};

const paths = {
    getStartedBtn: "//div[@role='button'][contains(.,'Get Started')]",
    massOption:
        "//span[contains(@class,'quick_reply')][@role='button'][contains(.,'MA')]",
    scheduleBtn:
        "//span[contains(@class,'quick_reply')][@role='button'][contains(.,'Schedule')]",
    botMessage: "//div[contains(@class,'left_message')]",
    noAppointments:
        "All available vaccine appointments are reserved at this time",
};

module.exports = {
    site,
    paths,
};
