const townRestricted = {
    name: "Harrington Healthcare (town-restricted)",
    street: "153 Chestnut Street",
    city: "Southbridge",
    zip: "01550",
    website:
        "https://app.acuityscheduling.com/schedule.php?owner=22192301&calendarID=5202050",
    extraData:
        "All vaccinations are performed at the Southbridge Community Center at 153 Chestnut St. Southbridge, MA 01550.",
    restrictions:
        "Registration is open to only those who live in the following towns: Auburn, Brimfield, Brookfield, (North, East, West) Charlton, Dudley, Holland, Leicester, Oxford, Southbridge, Spencer, Sturbridge, Sutton, Uxbridge, Wales, Warren, Webster",
    signUpLink:
        "https://app.acuityscheduling.com/schedule.php?owner=22192301&calendarID=5202050",
};
const unRestricted = {
    name: "Harrington Healthcare (not town-restricted)",
    street: "153 Chestnut Street",
    city: "Southbridge",
    zip: "01550",
    website:
        "https://app.acuityscheduling.com/schedule.php?owner=22192301&calendarID=5202038",
    extraData:
        "All vaccinations are performed at the Southbridge Community Center at 153 Chestnut St. Southbridge, MA 01550.",
    signUpLink:
        "https://app.acuityscheduling.com/schedule.php?owner=22192301&calendarID=5202038",
};

const monthCount = 2;

module.exports = {
    entity: "Harrington Healthcare",
    townRestricted,
    unRestricted,
    monthCount,
};
