const seedSettings = require('../seed/settings.js');
const driver = require("../config/db-driver");
const helpers = require("../helpers");

/**
* @api {get} /settings Get settings
* @apiName get settings
* @apiGroup Settings
*
* @apiSuccessExample {json} Success-Response:
{
    "status": true,
    "data": {
        "seedingAllowed": false
    },
    "error": [],
    "msg": "Settings loaded successfully"
}
*/
const getSettings = async (req, resp) => {
  let parameters = req.body;
  let seedSettingsData = await seedSettings.loadSettings();
  let status = true;
  let data = seedSettingsData;
  let error = [];
  let msg = "Settings loaded successfully"
  let output = {
    status: status,
    data: data,
    error: error,
    msg: msg
  }
  resp.json(output);
}

const updateAppSettings = async(req, resp) => {
  let parameters = req.body;
  let email = parameters.email;

  let settingsData = {
    email:email
  }
  let session = driver.session();
  const settingsDB = await loadAppSettings();
  let nodeProperties = helpers.prepareNodeProperties(settingsData);
  let params = helpers.prepareParams(settingsData);
  let query = "";
  if(typeof settingsDB==="undefined" || typeof settingsDB.data.email==="undefined") {
    query = `CREATE (n:Settings ${nodeProperties}) RETURN n`;
  }
  else {
    query = `MATCH (n:Settings) SET n=${nodeProperties} RETURN n`;
  }
  const settings = await session.run(query,params).then(result => {
    session.close();
    let records = result.records;
    let output = {error: ["The record cannot be updated"], status: false, data: []};
    if (records.length>0) {
      let record = records[0];
      let key = record.keys[0];
      let resultRecord = record.toObject()[key];
      resultRecord = helpers.outputRecord(resultRecord);
      output = {error: [], status: true, data: resultRecord};
    }
    return output;
  })
  .catch((error) => {
    let output = {error: error, status: false, data: []};
    return output;
  });
  resp.json(settings);
}

const getAppSettings = async (req, resp) => {
  const settings = await loadAppSettings();
  resp.json(settings);
}

const loadAppSettings = async() => {
  let session = driver.session();
  let query = `MATCH (n:Settings) RETURN n`;
  const settings = await session.run(query,{}).then(result => {
    session.close();
    let records = result.records;
    let output = {error: ["The record cannot be loaded"], status: false, data: []};
    if (records.length>0) {
      let record = records[0];
      let key = record.keys[0];
      let resultRecord = record.toObject()[key];
      resultRecord = helpers.outputRecord(resultRecord);
      delete resultRecord.password;
      output = {error: [], status: true, data: resultRecord};
    }
    return output;
  })
  .catch((error) => {
    let output = {error: error, status: false, data: []};
    return output;
  });
  return settings;
}

module.exports = {
  getSettings: getSettings,
  updateAppSettings: updateAppSettings,
  getAppSettings: getAppSettings,
}
