const driver = require('../../config/db-driver');
const helpers = require('../../helpers');
const TaxonomyTerm = require('../taxonomyTerm.ctrl').TaxonomyTerm;

/**
* @api {get} /generic-stats Generic statistics
* @apiName generic-stats
* @apiGroup Analytics
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"people":220,"resources":220,"organisations":80,"events":0},"error":false,"msg":""}
*/
const genericStats = async (req, resp) => {
  let classpieceSystemType = new TaxonomyTerm({ labelId: 'Classpiece' });
  await classpieceSystemType.load();

  let countPeoplePromise = countNodes('Person');
  let countResourcesPromise = countNodes('Resource');
  let countDiocesesPromise = countNodes('Organisation', 'Diocese');
  let countUniqueLastNamesPromise = countUniqueLastNames();
  let countOrganisationsPromise = countNodes('Organisation');
  let countEventsPromise = countNodes('Event');
  let countSpatialPromise = countNodes('Spatial');
  let countTemporalPromise = countNodes('Temporal');
  let countClasspiecesPromise = countNodes(
    'Classpieces',
    classpieceSystemType._id
  );
  let stats = await Promise.all([
    countPeoplePromise,
    countResourcesPromise,
    countDiocesesPromise,
    countUniqueLastNamesPromise,
    countOrganisationsPromise,
    countEventsPromise,
    countSpatialPromise,
    countTemporalPromise,
    countClasspiecesPromise,
  ]).then((data) => {
    return data;
  });
  let response = {
    people: stats[0],
    resources: stats[1],
    dioceses: stats[2],
    lastNames: stats[3],
    organisations: stats[4],
    events: stats[5],
    spatial: stats[6],
    temporal: stats[7],
    classpieces: stats[8],
  };
  resp.json({
    status: true,
    data: response,
    error: false,
    msg: '',
  });
};

const countNodes = async (type, systemType = null) => {
  let session = driver.session();
  let query = `MATCH (n:${type}) WHERE n.status="public" RETURN count(*)`;
  if (type === 'Person') {
    query = `MATCH (n:${type} {status:"public", personType: "Clergy"}) RETURN count(*)`;
  }
  if (systemType !== null && type === 'Organisation') {
    query = `MATCH (n:${type}) WHERE n.organisationType="${systemType}" AND n.status="public" RETURN count(*)`;
  }
  if (systemType !== null && type === 'Classpieces') {
    query = `MATCH (n:Resource) WHERE n.systemType="${systemType}" AND n.status="public" RETURN count(*)`;
  }
  if (type === 'Spatial' || type === 'Temporal') {
    query = `MATCH (n:${type}) RETURN count(*)`;
  }

  let count = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['count(*)'];
      return output;
    });
  return parseInt(count, 10);
};

const countUniqueLastNames = async () => {
  let session = driver.session();
  let query =
    'MATCH (n:Person) WHERE NOT n.lastName="" RETURN count(DISTINCT n.lastName) AS c';
  let count = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['c'];
      return output;
    });
  return parseInt(count, 10);
};

module.exports = {
  genericStats: genericStats,
};
