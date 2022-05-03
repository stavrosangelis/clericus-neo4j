const driver = require('../config/db-driver');

const initDB = async () => {
  // 01. create indexes
  const indexes = await createIndexes();

  // 02. set unique constraints
  const constraints = await createUniqueConstrains();

  const response = {
    indexes,
    constraints,
  };
  return response;
};

const createIndexes = async () => {
  const session = driver.session();
  const q1 =
    'CREATE INDEX ON :Person(label, firstName, middleName, lastName, description, alternateAppelations)';
  const q2 =
    ' CREATE INDEX ON :Organisation(label, description, alternateAppelations)';
  const q3 = ' CREATE INDEX ON :Resource(label, description)';
  const q4 = ' CREATE INDEX ON :TaxonomyTerm(label, labelId, inverseLabel)';
  const q5 = ' CREATE INDEX ON :Event(label, description)';
  const q6 = ' CREATE INDEX ON :Article(label, content)';
  // full text indexes
  const q7 =
    'CALL db.index.fulltext.createNodeIndex("fulltextSearch",["Article", "Resource", "Person", "Organisation", "Event", "Spatial", "Temporal"],["label", "description", "content", "alternateAppelations"])';
  const rp1 = await new Promise((resolve) => {
    session.run(q1, {}).then((result) => {
      resolve(result);
    });
  });
  const rp2 = await new Promise((resolve) => {
    session.run(q2, {}).then((result) => {
      resolve(result);
    });
  });
  const rp3 = await new Promise((resolve) => {
    session.run(q3, {}).then((result) => {
      resolve(result);
    });
  });
  const rp4 = await new Promise((resolve) => {
    session.run(q4, {}).then((result) => {
      resolve(result);
    });
  });
  const rp5 = await new Promise((resolve) => {
    session.run(q5, {}).then((result) => {
      resolve(result);
    });
  });
  const rp6 = await new Promise((resolve) => {
    session.run(q6, {}).then((result) => {
      resolve(result);
    });
  });
  const rp7 = await new Promise((resolve) => {
    session.run(q7, {}).then((result) => {
      resolve(result);
    });
  });
  session.close();
  return [rp1, rp2, rp3, rp4, rp5, rp6, rp7];
};

const createUniqueConstrains = async () => {
  const session = driver.session();
  const q1 = 'CREATE CONSTRAINT ON (n:Entity) ASSERT n.labelId IS UNIQUE',
    q2 = 'CREATE CONSTRAINT ON (n:TaxonomyTerm) ASSERT n.labelId IS UNIQUE',
    q3 =
      'CREATE CONSTRAINT ON (n:TaxonomyTerm) ASSERT n.inverseLabelId IS UNIQUE',
    q4 = 'CREATE CONSTRAINT ON (n:User) ASSERT n.email IS UNIQUE',
    q5 = 'CREATE CONSTRAINT ON (n:Usergroup) ASSERT n.label IS UNIQUE';

  const result1 = await new Promise((resolve) => {
    session.run(q1, {}).then((result) => {
      resolve(result);
    });
  });
  const result2 = await new Promise((resolve) => {
    session.run(q2, {}).then((result) => {
      resolve(result);
    });
  });
  const result3 = await new Promise((resolve) => {
    session.run(q3, {}).then((result) => {
      resolve(result);
    });
  });
  const result4 = await new Promise((resolve) => {
    session.run(q4, {}).then((result) => {
      resolve(result);
    });
  });
  const result5 = await new Promise((resolve) => {
    session.run(q5, {}).then((result) => {
      resolve(result);
    });
  });
  session.close();
  return [result1, result2, result3, result4, result5];
};

module.exports = {
  initDB,
};
