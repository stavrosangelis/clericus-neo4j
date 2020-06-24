const driver = require("../../config/db-driver");
const helpers = require("../../helpers");

/**
* @api {get} /generic-stats Generic statistics
* @apiName generic-stats
* @apiGroup Analytics
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"people":220,"resources":220,"organisations":80,"events":0},"error":false,"msg":""}
*/
const genericStats = async (req, resp) => {
  let countPeoplePromise = countNodes("Person");
  let countResourcesPromise = countNodes("Resource");
  let countUniqueLastNamesPromise = countUniqueLastNames();
  let countDiocesesPromise = countNodes("Organisation", "Diocese");
  /*let countOrganisationsPromise = countNodes("Organisation");
  let countEventsPromise = countNodes("Event");
  let countSpatialPromise = countNodes("Spatial");
  let countTemporalPromise = countNodes("Temporal");*/
  let stats = await Promise.all([countPeoplePromise,countResourcesPromise,countDiocesesPromise,countUniqueLastNamesPromise]).then((data)=> {
    return data;
  });
  let response = {
    people: stats[0],
    resources: stats[1],
    dioceses: stats[2],
    lastNames: stats[3],
  }
  resp.json({
    status: true,
    data: response,
    error: false,
    msg: '',
  })
}

const countNodes = async (type, systemType=null) => {
  let session = driver.session();
  let query = `MATCH (n:${type}) WHERE n.status="public" RETURN count(*)`;
  if (systemType!==null && type==="Organisation") {
    query = `MATCH (n:${type}) WHERE n.organisationType="${systemType}" RETURN count(*)`;
  }

  let count = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close()
    let resultRecord = result.records[0];
    let countObj = resultRecord.toObject();
    helpers.prepareOutput(countObj);
    let output = countObj['count(*)'];
    return output;
  });
  return parseInt(count,10);
}

const countUniqueLastNames = async () => {
  let session = driver.session();
  let query = `MATCH (n:Person) WHERE NOT n.lastName="" RETURN count(DISTINCT n.lastName) AS c`;
  let count = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close()
    let resultRecord = result.records[0];
    let countObj = resultRecord.toObject();
    helpers.prepareOutput(countObj);
    let output = countObj['c'];
    return output;
  });
  return parseInt(count,10);
}

module.exports = {
  genericStats: genericStats
}
