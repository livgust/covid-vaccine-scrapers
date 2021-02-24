const dotenv = require("dotenv");
//note: this only works locally; in Lambda we use environment variables set manually
dotenv.config();

const fetch = require("node-fetch");
const { Client } = require("@googlemaps/google-maps-services-js");
const { generateKey } = require("./data/dataDefaulter");

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

const sleep = (milliseconds) => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const getAllCoordinates = async (locations, cachedResults) => {
    const existingLocations = cachedResults.reduce((acc, location) => {
        const { resolvedLocation, latitude, longitude } = location;
        if (resolvedLocation && latitude && longitude) {
            acc[generateKey(location)] = {
                resolvedLocation,
                latitude,
                longitude,
            };
            return acc;
        } else {
            return acc;
        }
    }, {});

    const coordinateData = await Promise.all(
        locations.map(async (location) => {
            const { name = "", street = "", zip = "" } = location;
            const locationInd = generateKey(location);

            if (existingLocations[locationInd]) {
                return { ...location, ...existingLocations[locationInd] };
            } else {
                const locationData = await getGeocode(name, street, zip);
                await sleep(100);
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
