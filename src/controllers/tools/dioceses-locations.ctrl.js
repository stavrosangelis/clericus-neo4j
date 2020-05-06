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

module.exports = {
  prepareData: prepareData,
  allocateLocations: allocateLocations,
}
