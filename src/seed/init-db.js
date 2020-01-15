const driver = require("../config/db-driver");

const initDB = async() => {
  // 01. create indexes
  let indexes = await createIndexes();
  // 02. set unique constraints
  let constraints = await createUniqueConstrains();

  let response = {
    indexes: indexes,
    constraints: constraints,
  }
  return response;
}

const createIndexes = async () => {
  let session = driver.session()
  let q1 = "CREATE INDEX ON :Person(label, firstName, middleName, lastName)"
  let q2 = " CREATE INDEX ON :Organisation(label)"
  let q3 = " CREATE INDEX ON :Resource(label)"
  let q4 = " CREATE INDEX ON :TaxonomyTerm(label, labelId, inverseLabel)"
  let q5 = " CREATE INDEX ON :Event(label)"
  const rp1 = await new Promise((resolve, reject)=> {
    let result = session.run(
      q1,
      {}
    ).then(result => {
      session.close();
      resolve(result);
    });
  })
  const rp2 = await new Promise((resolve, reject)=> {
    let result = session.run(
      q2,
      {}
    ).then(result => {
      session.close();
      resolve(result);
    });
  })
  const rp3 = await new Promise((resolve, reject)=> {
    let result = session.run(
      q3,
      {}
    ).then(result => {
      session.close();
      resolve(result);
    });
  })
  const rp4 = await new Promise((resolve, reject)=> {
    let result = session.run(
      q4,
      {}
    ).then(result => {
      session.close();
      resolve(result);
    });
  })
  const rp5 = await new Promise((resolve, reject)=> {
    let result = session.run(
      q5,
      {}
    ).then(result => {
      session.close();
      resolve(result);
    });
  })
  return [rp1,rp2,rp3,rp4,rp5];
}

const createUniqueConstrains = async () => {
  let session = driver.session()
  let query = "CREATE CONSTRAINT ON (n:Entity) ASSERT n.label IS UNIQUE"
  " CREATE CONSTRAINT ON (n:Entity) ASSERT n.labelId IS UNIQUE"
  " CREATE CONSTRAINT ON (n:TaxonomyTerm) ASSERT n.label IS UNIQUE"
  " CREATE CONSTRAINT ON (n:TaxonomyTerm) ASSERT n.labelId IS UNIQUE"
  " CREATE CONSTRAINT ON (n:TaxonomyTerm) ASSERT n.inverseLabel IS UNIQUE"
  " CREATE CONSTRAINT ON (n:TaxonomyTerm) ASSERT n.inverseLabelId IS UNIQUE"
  " CREATE CONSTRAINT ON (n:User) ASSERT n.email IS UNIQUE"
  " CREATE CONSTRAINT ON (n:Usergroup) ASSERT n.label IS UNIQUE";
  const resultPromise = await new Promise((resolve, reject)=> {
    let result = session.run(
      query,
      {}
    ).then(result => {
      session.close();
      resolve(result);
    });
  })
  return resultPromise;
}

module.exports = {
  initDB: initDB
}
