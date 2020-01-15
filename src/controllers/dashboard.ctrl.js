const driver = require("../config/db-driver");
const helpers = require("../helpers");

/**
* @api {get} /dashboard Dashboard
* @apiName dashboard
* @apiGroup Dashboard
* @apiPermission admin
*
* @apiSuccessExample {json} Success-Response:
{
    "status": true,
    "data": {
        "people": 220,
        "resources": 220,
        "organisations": 80,
        "events": 0
    },
    "error": false,
    "msg": ""
}
*/
const dashboardStats = async (req, resp) => {
  let countPeoplePromise = countPeople();
  let countResourcesPromise = countResources();
  let countOrganisationsPromise = countOrganisations();
  let countEventsPromise = countEvents();
  let stats = await Promise.all([countPeoplePromise, countResourcesPromise,countOrganisationsPromise,countEventsPromise]).then((data)=> {
    return data;
  });
  let response = {
    people: stats[0],
    resources: stats[1],
    organisations: stats[2],
    events: stats[3],
  }
  resp.json({
    status: true,
    data: response,
    error: false,
    msg: '',
  })
}

const countResources = async () => {
  let session = driver.session();
  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Resource) RETURN count(*)")
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

const countPeople = async() => {
  let session = driver.session();
  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Person) RETURN count(*)")
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

const countOrganisations = async() => {
  let session = driver.session();
  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Organisation) RETURN count(*)")
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

const countEvents = async() => {
  let session = driver.session();
  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Event) RETURN count(*)")
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



module.exports = {
  dashboardStats: dashboardStats
}
