const fs = require("fs");
const seedSettings = require('../seed/settings.js');

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

module.exports = {
  getSettings: getSettings,
}
