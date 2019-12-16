
const driver = require("../config/db-driver");
const helpers = require("../helpers");

const dashboardStats = (req, resp) => {
  let countPeoplePromise = countPeople();
  let countResourcesPromise = countResources();
  let countOrganisationsPromise = countOrganisations();
  let countEventsPromise = countEvents();
  return Promise.all([countPeoplePromise, countResourcesPromise,countOrganisationsPromise,countEventsPromise]).then((data)=> {
    let response = {
      people: data[0],
      resources: data[1],
      organisations: data[2],
      events: data[3],
    }
    resp.json({
      status: true,
      data: response,
      error: false,
      msg: '',
    })
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
