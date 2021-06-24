const driver = require('../config/db-driver');
const helpers = require('../helpers');

const TaxonomyTerm = require('./taxonomyTerm.ctrl').TaxonomyTerm;

/*
references are bi-directional. An example reference object is the following:

  {
    items: [
      {_id: source entity id, type: source entity type, role: source entity role in relationship if any},
      {_id: target entity id, type: target entity type, role: target entity role in relationship if any}
    ],
    taxonomyTermId: taxonomy term id,
  }

*/
/**
* @api {put} /reference Put reference
* @apiName put reference
* @apiGroup References
* @apiPermission admin
*
* @apiParam {array} items The entities that will be related.
* @apiParam {object} items[item] Two items need to be provided: i) the source entity, ii) the target entity
* @apiParam {string} item[_id] The source/target entity id.
* @apiParam {string} item[type] The source/target entity type.
* @apiParam {string} [item[role]] The source/target entity role in the relationship if any.
* @apiParam {string} taxonomyTermId The relation taxonomy term id. Either the taxonomyTermId or the taxonomyTermLabel must be provided.
* @apiParam {string} taxonomyTermLabel The relation taxonomy term labelId. Either the taxonomyTermId or the taxonomyTermLabel must be provided.
* @apiExample {json} Example usage
* {
  "items": [{
    "_id": "2069",
    "type": "Organisation"
  }, {
    "_id": "337",
    "type": "Person"
  }],
  "taxonomyTermLabel": "hasMember"
}
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"nodesCreated":0,"nodesDeleted":0,"relationshipsCreated":2,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0},"error":[],"msg":"Query results"}
*/
const putReference = async (req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The reference must not be empty',
    });
    return false;
  }
  let newReference = await updateReference(postData);
  resp.json({
    status: true,
    data: newReference,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /references Put references
* @apiName put references
* @apiGroup References
* @apiPermission admin
*
* @apiParam {array} items An array of reference items.
* @apiParam {object} items[item] Two items need to be provided: i) the source entity, ii) the target entity
* @apiParam {string} item[_id] The source/target entity id.
* @apiParam {string} item[type] The source/target entity type.
* @apiParam {string} [item[role]] The source/target entity role in the relationship if any.
* @apiParam {string} taxonomyTermId The relation taxonomy term id. Either the taxonomyTermId or the taxonomyTermLabel must be provided.
* @apiParam {string} taxonomyTermLabel The relation taxonomy term labelId. Either the taxonomyTermId or the taxonomyTermLabel must be provided.
* @apiExample {json} Example usage
* [{
  "items": [{
    "_id": "2069",
    "type": "Organisation"
  }, {
    "_id": "2255",
    "type": "Event"
  }],
  "taxonomyTermLabel": "hasRelation"
}, {
  "items": [{
    "_id": "2460",
    "type": "Organisation"
  }, {
    "_id": "2255",
    "type": "Event"
  }],
  "taxonomyTermLabel": "hasRelation"
}]
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"nodesCreated":0,"nodesDeleted":0,"relationshipsCreated":2,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0},"error":[],"msg":"Query results"}
*/
const putReferences = async (req, resp) => {
  let references = req.body;
  if (Object.keys(references).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The references must not be empty',
    });
    return false;
  }
  let promises = [];
  for (let refKey in references) {
    let reference = references[refKey];
    let addReference = updateReference(reference);
    promises.push(addReference);
  }

  let data = await Promise.all(promises).then((data) => {
    return data;
  });
  let error = [];
  let status = true;
  resp.json({
    status: status,
    data: data,
    error: error,
    msg: [],
  });
};

const updateReference = async (reference) => {
  const session = driver.session();
  const srcItem = reference.items[0];
  const targetItem = reference.items[1];
  let taxonomyTermQuery = '';
  if (typeof reference.taxonomyTermId !== 'undefined') {
    taxonomyTermQuery = {
      _id: reference.taxonomyTermId,
    };
  }
  if (typeof reference.taxonomyTermLabel !== 'undefined') {
    taxonomyTermQuery = {
      labelId: reference.taxonomyTermLabel,
    };
  }
  let taxonomyTerm = new TaxonomyTerm(taxonomyTermQuery);
  await taxonomyTerm.load();
  let direction = 'from';
  if (taxonomyTerm._id === null) {
    taxonomyTermQuery = {
      inverseLabelId: reference.taxonomyTermLabel,
    };
    taxonomyTerm = new TaxonomyTerm(taxonomyTermQuery);
    await taxonomyTerm.load();
    direction = 'to';
  }
  if (taxonomyTerm._id === null) {
    return false;
  }
  let srcRole = '';
  let targetRole = '';
  if (
    (typeof srcItem.role !== 'undefined' &&
      srcItem.role !== '' &&
      srcItem.role !== null) ||
    (typeof targetItem.role !== 'undefined' &&
      targetItem.role !== '' &&
      targetItem.role !== null)
  ) {
    if (
      srcItem.role !== '' &&
      (targetItem.role === '' ||
        targetItem.role === 'null' ||
        targetItem.role === null)
    ) {
      targetItem.role = srcItem.role;
    } else if (
      targetItem.role !== '' &&
      (srcItem.role === '' || srcItem.role === 'null' || srcItem.role === null)
    ) {
      srcItem.role = targetItem.role;
    }
    srcRole = " SET r1={role:'" + srcItem.role + "'}";
    targetRole = " SET r2={role:'" + targetItem.role + "'}";
    if (direction === 'to') {
      srcRole = " SET r1={role:'" + targetItem.role + "'}";
      targetRole = " SET r2={role:'" + srcItem.role + "'}";
    }
  }
  let query =
    'MATCH (n1:' +
    srcItem.type +
    ') WHERE id(n1)=' +
    srcItem._id +
    ' MATCH (n2:' +
    targetItem.type +
    ') WHERE id(n2)=' +
    targetItem._id +
    ' MERGE (n1)-[r1:' +
    taxonomyTerm.labelId +
    ']->(n2)' +
    srcRole +
    ' MERGE (n2)-[r2:' +
    taxonomyTerm.inverseLabelId +
    ']->(n1)' +
    targetRole;
  if (direction === 'to') {
    query =
      'MATCH (n1:' +
      targetItem.type +
      ') WHERE id(n1)=' +
      targetItem._id +
      ' MATCH (n2:' +
      srcItem.type +
      ') WHERE id(n2)=' +
      srcItem._id +
      ' MERGE (n1)-[r1:' +
      taxonomyTerm.labelId +
      ']->(n2)' +
      srcRole +
      ' MERGE (n2)-[r2:' +
      taxonomyTerm.inverseLabelId +
      ']->(n1)' +
      targetRole;
  }
  let resultExec = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.summary.counters._stats;
    })
    .catch((error) => {
      console.log(error);
    });
  return resultExec;
};

/**
* @api {delete} /reference Delete reference
* @apiName delete reference
* @apiGroup References
* @apiPermission admin
*
* @apiParam {array} items The entities that will be related.
* @apiParam {object} items[item] Two items need to be provided: i) the source entity, ii) the target entity
* @apiParam {string} item[_id] The source/target entity id.
* @apiParam {string} item[type] The source/target entity type.
* @apiParam {string} [item[role]] The source/target entity role in the relationship if any.
* @apiParam {string} taxonomyTermId The relation taxonomy term id. Either the taxonomyTermId or the taxonomyTermLabel must be provided.
* @apiParam {string} taxonomyTermLabel The relation taxonomy term labelId. Either the taxonomyTermId or the taxonomyTermLabel must be provided.
* @apiExample {json} Example usage
* {
  "items": [{
    "_id": "2069",
    "type": "Organisation"
  }, {
    "_id": "2255",
    "type": "Event"
  }],
  "taxonomyTermLabel": "hasRelation"
}
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"nodesCreated":0,"nodesDeleted":0,"relationshipsCreated":0,"relationshipsDeleted":2,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0},"error":[],"msg":"Query results"}
*/
const deleteReference = async (req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The reference must not be empty',
    });
    return false;
  }
  let delReference = await removeReference(postData);
  resp.json({
    status: true,
    data: delReference,
    error: [],
    msg: 'Query results',
  });
};

const removeReference = async (reference) => {
  let session = driver.session();
  let srcItem = reference.items[0];
  let targetItem = reference.items[1];
  let taxonomyTermQuery = '';
  if (typeof reference.taxonomyTermId !== 'undefined') {
    taxonomyTermQuery = {
      _id: reference.taxonomyTermId,
    };
  }
  if (typeof reference.taxonomyTermLabel !== 'undefined') {
    taxonomyTermQuery = {
      labelId: reference.taxonomyTermLabel,
    };
  }
  let taxonomyTerm = new TaxonomyTerm(taxonomyTermQuery);
  await taxonomyTerm.load();
  let direction = 'from';
  if (taxonomyTerm._id === null) {
    taxonomyTermQuery = {
      inverseLabelId: reference.taxonomyTermLabel,
    };
    taxonomyTerm = new TaxonomyTerm(taxonomyTermQuery);
    await taxonomyTerm.load();
    direction = 'to';
  }
  if (taxonomyTerm._id === null) {
    return false;
  }
  let query =
    'MATCH (n1:' +
    srcItem.type +
    ') WHERE id(n1)=' +
    srcItem._id +
    ' MATCH (n2:' +
    targetItem.type +
    ') WHERE id(n2)=' +
    targetItem._id +
    ' MATCH (n1)-[r1:' +
    taxonomyTerm.labelId +
    ']->(n2)' +
    ' MATCH (n2)-[r2:' +
    taxonomyTerm.inverseLabelId +
    ']->(n1)' +
    ' DELETE r1 ' +
    ' DELETE r2';
  if (direction === 'to') {
    query =
      'MATCH (n1:' +
      targetItem.type +
      ') WHERE id(n1)=' +
      targetItem._id +
      ' MATCH (n2:' +
      srcItem.type +
      ') WHERE id(n2)=' +
      srcItem._id +
      ' MATCH (n1)-[r1:' +
      taxonomyTerm.labelId +
      ']->(n2)' +
      ' MATCH (n2)-[r2:' +
      taxonomyTerm.inverseLabelId +
      ']->(n1)' +
      ' DELETE r1 ' +
      ' DELETE r2';
  }
  let params = {};
  const resultPromise = await new Promise((resolve) => {
    session
      .run(query, params)
      .then((result) => {
        session.close();
        resolve(result.summary.counters._stats);
      })
      .catch((error) => {
        console.log(error);
      });
  });
  return resultPromise;
};

/**
* @api {get} /references Get references
* @apiName get references
* @apiGroup References
*
* @apiParam {string} _id The id of the source node.
* @apiParam {number=1..6} [steps] The number of steps to take in the graph to get the related nodes
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":[{"lastName":"Alamain","firstName":"Colm","honorificPrefix":[""],"middleName":"","label":"Colm  Alamain","alternateAppelations":[],"status":false,"_id":"45","systemLabels":["Person"]},{"firstName":"Tomas","lastName":"O Hogain","honorificPrefix":[""],"middleName":"","label":"Tomas  O Hogain","alternateAppelations":[],"status":false,"_id":"187","systemLabels":["Person"]}],"error":[],"msg":"Query results"}*/
const getReferences = async (req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id === 'undefined') {
    resp.json({
      status: false,
      data: [],
      error: 'Please provide a valid node id to continue',
      msg: 'Query results',
    });
    return false;
  }
  let _id = parameters._id;
  let steps = 0;
  if (typeof parameters.steps !== 'undefined') {
    steps = parseInt(parameters.steps, 10);
    if (steps > 6) {
      steps = 6;
    }
  }

  // 1. query for node
  let session = driver.session();
  let query =
    'MATCH p=(n)-[r]->(rn) WHERE id(n)=' +
    _id +
    ' AND NOT id(rn)=' +
    _id +
    ' return collect(distinct p) as p';
  if (steps > 1) {
    query =
      'MATCH p=(n)-[r*..' +
      steps +
      ']->(rn)  WHERE id(n)=' +
      _id +
      ' AND NOT id(rn)=' +
      _id +
      ' return collect(distinct p) as p';
  }
  let results = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      let records = result.records;
      let output = [];
      if (records.length > 0) {
        for (let i in records) {
          let record = records[i].toObject().p;
          let paths = helpers.outputPaths(record, _id);
          output = paths;
        }
      }
      return output;
    });

  resp.json({
    status: true,
    data: results,
    error: [],
    msg: 'Query results',
  });
};

module.exports = {
  getReferences: getReferences,
  putReference: putReference,
  putReferences: putReferences,
  updateReference: updateReference,
  deleteReference: deleteReference,
  removeReference: removeReference,
};
