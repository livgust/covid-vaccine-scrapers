const dotenv = require("dotenv");
//note: this only works locally; in Lambda we use environment variables set manually
dotenv.config();

const { Client } = require("@googlemaps/google-maps-services-js");
const { generateKey } = require("./data/dataDefaulter");
const axios = require("axios");
const axiosRetry = require("axios-retry");

axiosRetry(axios, { retries: 5, retryDelay: axiosRetry.exponentialDelay });

const getGeocode = async (name, street, zip) => {
    const address = `${name},MA,${street},${zip}`;
    const client = new Client();
    try {
        const resp = await client.geocode(
            {
                params: {
                    address,
                    key: process.env.GOOGLE_API_KEY,
                },
            },
            axios
        );
        return resp.data;
    } catch (e) {
        console.error(e.response.data);
    }
};

const getAllCoordinates = async (locations, cachedResults) => {
    const existingLocations = cachedResults.reduce((acc, location) => {
        const { latitude, longitude } = location;
        if (latitude && longitude) {
            acc[generateKey(location)] = {
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

                if (locationData) {
                    return {
                        ...location,
                        latitude:
                            locationData?.results[0].geometry.location.lat,
                        longitude:
                            locationData?.results[0].geometry.location.lng,
                    };
                } else return location;
            }
        })
    );
    return coordinateData;
};

exports.getAllCoordinates = getAllCoordinates;
