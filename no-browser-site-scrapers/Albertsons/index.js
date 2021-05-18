const { site } = require("./config");
const https = require("https");
const fetch = require("node-fetch");
const moment = require("moment");

module.exports = async function GetAvailableAppointments() {
    console.log(`${site.name} starting.`);

    const url = `${site.nationalStoresJson}?v=${new Date().valueOf()}`;

    const nationalLocations = await fetch(url).then((res) => res.json());

    const massLocations = nationalLocations.filter(
        (location) => location.region == "Massachusetts"
    );

    console.log(`${site.name} done.`);

    return {
        parentLocationName: "Shaw's/Star Market",
        isChain: true,
        timestamp: moment().format(),
        individualLocationData: massLocations.map((location) => {
            // Raw address is like: (Star Market 4587 - Pfizer and Moderna Availability||45 William T Morrissey Blvd, Dorchester, MA, 02125)
            // The format seems to be very consistent nationally, not to mention locally in MA. So we
            // pull the specific parts out of the string.
            const rawAddress = location.address;
            const trimmedAddress = rawAddress.replace(/^\(|\)$/, ""); // Trim parens
            let [name, addressRest] = trimmedAddress.split(" - ");
            let [vaccine, longAddress] = addressRest.split("||");
            if (addressRest.indexOf("||") === -1) {
                longAddress = vaccine;
                vaccine = undefined;
            }
            const [street, city, state, zip] = longAddress.split(", ");
            const storeName = name.match(/([^\d]*) /g)[0].trim();
            // const storeNumber = name.substring(storeName.length).trim();

            const extraData = vaccine
                ? { extraData: { "Vaccinations offered": vaccine } }
                : undefined;

            const retval = {
                name: storeName,
                city: city,
                street: street,
                state: state,
                zip: zip,
                hasAvailability: location.availability === "yes",
                ...extraData,
                signUpLink: location.coach_url,
                latitude: location.lat,
                longitude: location.long,
            };
            return retval;
        }),
    };
};
