const readJSONFile = require('../helpers').readJSONFile;
const fs = require('fs');

const settingsPath = process.env.ABSPATH + 'src/seed/data/settings.json';

const loadSettings = async () => {
  const settings = await readJSONFile(settingsPath);
  return settings.data;
};

const disallowSeeding = async () => {
  const settings = await loadSettings();
  settings.seedingAllowed = false;
  fs.writeFile(settingsPath, JSON.stringify(settings), 'utf8', (error) => {
    if (error) throw error;
    console.log('Settings updated successfully!');
  });
  return settings;
};

module.exports = {
  loadSettings: loadSettings,
  disallowSeeding: disallowSeeding,
};
