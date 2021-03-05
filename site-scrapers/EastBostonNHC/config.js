const site = {
    name: "East Boston Neighborhood Health Center",
    website:
        "https://patient.lumahealth.io/survey?patientFormTemplate=601d6aec4f308f00128eb4cd&user=600f45213901d90012deb171",
    locations: [
        {
            street: "10 Garofalo St",
            city: "Revere",
            zip: "02151",
            // facility_id: "6011f3c1fa2b92009a1c0e28", // Leaving facility_id in case we want to query by location in the future.
        },
        {
            street: "318 Broadway",
            city: "Chelsea",
            zip: "02150",
            // facility_id: "601a236ff7f880001333e993",
        },
        {
            street: "120 Liverpool St",
            city: "Boston",
            zip: "02128",
            // facility_id: "6011f3c1fa2b92009a1c0e24",
        },
        {
            street: "1601 Washington St",
            city: "Boston",
            zip: "02118",
            // facility_id: "6011f3c1fa2b92009a1c0e2a",
        },
    ],
};

module.exports = {
    site,
};
