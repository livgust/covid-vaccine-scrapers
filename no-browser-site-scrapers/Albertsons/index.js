const { site } = require("./config");
const https = require("https");
const fetch = require("node-fetch");

module.exports = async function GetAvailableAppointments() {
    console.log(`${site.name} starting.`);

    const url = `${site.nationalStoresJson}?v=${new Date().valueOf()}`;

    const nationalLocations = await fetch(url).then((res) => res.json());

    const massLocations = nationalLocations.filter(
        (location) => location.region == "Massachusetts"
    );

    console.log(`${site.name} done.`);

    return massLocations.map((location) => {
        // Raw address is like: (Star Market 4587 - 45 William T Morrissey Blvd, Dorchester, MA, 02125)
        // The format seems to be very consistent nationally, not to mention locally in MA. So we
        // pull the specific parts out of the string.
        const rawAddress = location.address;
        const trimmedAddress = rawAddress.replace(/^\(|\)$/, ""); // Trim parens
        const [name, longAddress] = trimmedAddress.split(" - ");
        const [address, city, state, zip] = longAddress.split(", ");
        const retval = {
            name: name,
            city: city,
            address: address,
            state: state,
            zip: zip,
            hasAvailability: location.availability == "true",
            signUpLink: location.coach_url,
            latitude: location.lat,
            longitude: location.long,
            timestamp: new Date(),
        };
        return retval;
    });
};
