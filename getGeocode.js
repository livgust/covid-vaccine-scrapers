const dotenv = require("dotenv");
//note: this only works locally; in Lambda we use environment variables set manually
dotenv.config();

const fetch = require("node-fetch");
const { Client } = require("@googlemaps/google-maps-services-js");

const getGeocode = async (name, street, zip) => {
    const address = `${name},MA,${street},${zip}`;
    const client = new Client();
    try {
        const resp = await client.geocode({
            params: {
                address,
                key: process.env.GOOGLE_API_KEY,
            },
        });
        return resp.data;
    } catch (e) {
        console.error(e.response.data);
    }
};

const getLocationData = async () => {
    const res = await fetch(
        "https://mzqsa4noec.execute-api.us-east-1.amazonaws.com/prod"
    );
    const data = await res.json();

    let locationLookup = {};
    for (const location of JSON.parse(data.body).results) {
        const {
            name = "",
            street = "",
            zip = "",
            resolvedLocation,
            latitude,
            longitude,
        } = location;

        const locationInd = `${name}|${street}|${zip}`;
        if (resolvedLocation && latitude && longitude) {
            locationLookup[locationInd] = {
                resolvedLocation,
                latitude,
                longitude,
            };
        }
    }
    return locationLookup;
};

const getAllCoordinates = async (locations) => {
    const existingLocations = await getLocationData();

    const coordinateData = await Promise.all(
        locations.map(async (location) => {
            const { name = "", street = "", zip = "" } = location;
            const locationInd = `${name}|${street}|${zip}`;

            if (existingLocations[locationInd]) {
                return { ...location, ...existingLocations[locationInd] };
            } else {
                const locationData = await getGeocode(name, street, zip);
                return {
                    ...location,
                    resolvedLocation: locationData.results[0].formatted_address,
                    latitude: locationData.results[0].geometry.location.lat,
                    longitude: locationData.results[0].geometry.location.lng,
                };
            }
        })
    );
    return coordinateData;
};

exports.getAllCoordinates = getAllCoordinates;
