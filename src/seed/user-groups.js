const driver = require('../config/db-driver');

const {
  outputRecord,
  prepareNodeProperties,
  prepareParams,
} = require('../helpers');
const { readJSONFile } = require('../helpers');

// function to add usergroup to db
const save = async (entry = null) => {
  if (entry === null) {
    return false;
  }
  const session = driver.session();
  const now = new Date().toISOString();
  const copy = { ...entry };
  copy.createdAt = now;

  const nodeProperties = prepareNodeProperties(copy);
  const params = prepareParams(copy);

  const query = `CREATE (n:Usergroup ${nodeProperties}) RETURN n`;
  const resultPromise = await session
    .run(query, params)
    .then((result) => {
      session.close();
      const { records } = result;
      let output = {
        error: ['The record cannot be updated'],
        status: false,
        data: [],
      };
      if (records.length > 0) {
        const record = records[0];
        const key = record.keys[0];
        let resultRecord = record.toObject()[key];
        resultRecord = outputRecord(resultRecord);
        output = { error: [], status: true, data: resultRecord };
      }
      return output;
    })
    .catch((error) => {
      let output = { error: error, status: false, data: [] };
      return output;
    });
  return resultPromise;
};

// seed usergroups
const seedUsergroups = async () => {
  const path = `${process.env.ABSPATH}src/seed/data/usergroups.json`;
  const entries = await readJSONFile(path);
  const promises = [];
  const { data } = entries;
  for (let key in data) {
    const entry = data[key];
    promises.push(await save(entry));
  }
  return Promise.all(promises)
    .then((data) => {
      return data;
    })
    .catch((error) => {
      console.log(error);
    });
};

// add createdBy id to existing Usergroups
const usergroupUpdateCreatedBy = async (userId) => {
  const session = driver.session();
  const query = `MATCH (n:Usergroup) SET n.createdBy=${userId} RETURN n`;
  await session
    .run(query, {})
    .then((result) => {
      session.close();
      const { records } = result;
      let output = {
        error: ['The record cannot be updated'],
        status: false,
        data: [],
      };
      if (records.length > 0) {
        const record = records[0];
        const key = record.keys[0];
        let resultRecord = record.toObject()[key];
        resultRecord = outputRecord(resultRecord);
        output = { error: [], status: true, data: resultRecord };
      }
      return output;
    })
    .catch((error) => {
      let output = { error: error, status: false, data: [] };
      return output;
    });
  return true;
};

module.exports = {
  seedUsergroups,
  usergroupUpdateCreatedBy,
};
