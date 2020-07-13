const driver = require("../../config/db-driver");
const helpers = require("../../helpers");
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const archivePath = process.env.ARCHIVEPATH;

const prepareData = async(req, resp) => {
  let csvPath = `${archivePath}documents/dioceses&cathedral-cities.csv`;
  const results = [];
  let csvFile = await new Promise((resolve,reject)=> {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(true)
      });
  });
  let jsonPath = `${archivePath}documents/dioceses&cathedral-cities.json`;
  let csvToJson = await fs.writeFileSync(jsonPath, JSON.stringify(results), 'utf8');
  resp.json({
    status: true,
    data: results,
    error: false,
    msg: '',
  });
}

const allocateLocations = async(req, resp) => {
  let jsonPath = `${archivePath}documents/dioceses&cathedral-cities.json`;
  let jsonFile = await fs.readFileSync(jsonPath, 'utf8');
  let jsonData = JSON.parse(jsonFile);
  let newData = [];
  let uniqueList = [];
  for (let i=0;i<jsonData.length; i++) {
    let row = jsonData[i];
    let string = `${row["Diocese"]},${row["Cathedral City"]},${row["Country"]}`;
    if (uniqueList.indexOf(string)===-1) {
      let results = await queryOpenStreetMaps(row);
      let features = results.features;
      if (typeof features.length!=="undefined" && features.length>0) {
        features = features[0];
      }
      let newItem = {
        diocese: row["Diocese"],
        city: row["Cathedral City"],
        country: row["Country"],
        features: features
      }
      newData.push(newItem);
      uniqueList.push(string)
    }
  }
  let jsonSavePath = `${archivePath}documents/dioceses&cathedral-cities-features.json`;
  let saveData = await fs.writeFileSync(jsonSavePath, JSON.stringify(newData), 'utf8');
  resp.json({
    status: true,
    data: saveData,
    error: false,
    msg: '',
  });
}

const queryOpenStreetMaps = async(row) => {
  let path = "https://nominatim.openstreetmap.org/search";
  let params = {
    city: row['Cathedral City'],
    country: row['Country'],
    format: "geojson",
  }
  let results = await axios({
    method: 'get',
    url: path,
    crossDomain: true,
    params: params
  })
  .then(function (response) {
    return response.data;
  })
  .catch(function (error) {
    console.log(error);
  });
  return results;
}

const addLocations = async(req, resp) => {
  let session = driver.session();
  let query = `MATCH (n:Organisation) WHERE n.status="public" AND n.organisationType="Diocese" RETURN n`;
  let results = await session.writeTransaction(tx=>tx.run(query,{}))
  .then(result=> {
    session.close()
    return result.records;
  });
  let nodes = helpers.normalizeRecordsOutput(results);
  let jsonPath = `${archivePath}documents/dioceses&cathedral-cities-features.json`;
  let jsonFile = await fs.readFileSync(jsonPath, 'utf8');
  let jsonData = JSON.parse(jsonFile);
  let locations = [];
  locations.push(jsonData[0])
  for (let i=0;i<jsonData.length; i++) {
    let locationItem = jsonData[i];
    let location = locationItem.features;
    let diocese = nodes.find(item=>item.label.toLowerCase().trim()===locationItem.diocese.toLowerCase().trim());
    let label = '',
        streetAddress = '',
        locality = '',
        region = '',
        postalCode = '',
        country = '',
        latitude = '',
        longitude = '',
        locationType = '';
    if (typeof location.display_name!=="undefined") {
      label = location.display_name;
    }
    if (typeof location.address!=="undefined") {
      if (typeof location.address.road!=="undefined") {
        streetAddress = location.address.road;
      }
      if (typeof location.address.locality!=="undefined") {
        locality = location.address.locality;
      }
      if (typeof location.address.region!=="undefined") {
        region = location.address.region;
      }
      if (typeof location.address.postcode!=="undefined") {
        postalCode = location.address.postcode;
      }
      if (typeof location.address.country!=="undefined") {
        country = location.address.country;
      }
    }
    if (typeof location.lat!=="undefined") {
      latitude = location.lat;
    }
    if (typeof location.lon!=="undefined") {
      longitude = location.lon;
    }
    if (typeof location.type!=="undefined") {
      locationType = location.type;
    }
    if (typeof location.address!=="undefined" &&
      (typeof location.address.region==="undefined" || location.address.region==="") && location.address.county!=="") {
      region = location.address.county;
    }
    let newLocation = {
      label: label,
      streetAddress: streetAddress,
      locality: locality,
      region: region,
      postalCode: postalCode,
      country: country,
      latitude: latitude,
      longitude: longitude,
      locationType: locationType,
    }
    locations.push(newLocation);
  }
  resp.json({
    status: true,
    data: {locations:locations},
    error: false,
    msg: '',
  });
}

module.exports = {
  prepareData: prepareData,
  allocateLocations: allocateLocations,
  addLocations: addLocations,
}
