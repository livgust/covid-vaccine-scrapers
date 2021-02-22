const dotenv = require("dotenv");
//note: this only works locally; in Lambda we use environment variables set manually
dotenv.config();

const fs = require("fs");
const fetch = require("node-fetch");

const { Client } = require("@googlemaps/google-maps-services-js");
const geo = require("./geo.json");

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
  return JSON.parse(data.body).results;
};

const getAllCoordinates = async () => {
  const locations = await getLocationData();
  let locationLookup = {};

  for (const location of locations) {
    const { name = "", street = "", zip = "" } = location;
    const locationInd = `${name}${street}${zip}`;

    if (geo[locationInd]) {
      locationLookup[locationInd] = geo[locationInd];
    } else {
      const locationData = await getGeocode(name, street, zip);
      locationLookup[locationInd] = {
        resolvedLocation: locationData.results[0].formatted_address,
        latitude: locationData.results[0].geometry.location.lat,
        longitude: locationData.results[0].geometry.location.lng,
      };
    }

    fs.writeFileSync("geo.json", JSON.stringify(locationLookup));
  }
};

getAllCoordinates();
