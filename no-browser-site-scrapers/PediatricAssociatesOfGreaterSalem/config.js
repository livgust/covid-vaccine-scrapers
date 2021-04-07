const site = {
    name: "Pediatric Associates of Greater Salem and Beverly",
    bearerTokenUrl: "https://framework-backend.scheduling.athena.io/t",
    schedulingTokenUrl:
        "https://framework-backend.scheduling.athena.io/u?locationId=2804-102&practitionerId=&contextId=2804",
    graphQLUrl: "https://framework-backend.scheduling.athena.io/v1/graphql",
    locations: [
        {
            street: "84 Highland Ave",
            city: "Salem",
            state: "MA",
            zip: "01970",
        },
        {
            street: "30 Tozer Rd",
            city: "Beverly",
            state: "MA",
            zip: "01915",
        },
    ],
};

module.exports = {
    site,
};
