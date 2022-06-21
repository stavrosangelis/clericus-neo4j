const driver = require('../config/db-driver');
const { capitalCaseOnlyFirst, outputPaths } = require('../helpers');

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
  const { body: postData } = req;
  if (Object.keys(postData).length === 0) {
    return resp.status(400).json({
      status: false,
      data: [],
      error: true,
      msg: 'The reference must not be empty',
    });
  }
  const data = await updateReference(postData);
  return resp.status(200).json({
    status: true,
    data,
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
    let addReference = await updateReference(reference);
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
  const { items, taxonomyTermId = '', taxonomyTermLabel = '' } = reference;
  const [srcItem, targetItem] = items;
  let taxonomyTermQuery = '';
  if (taxonomyTermId !== '') {
    taxonomyTermQuery = {
      _id: taxonomyTermId,
    };
  }
  if (taxonomyTermLabel !== '') {
    taxonomyTermQuery = {
      labelId: taxonomyTermLabel,
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
  let { role: srcItemRole = '' } = srcItem;
  let { role: targetItemRole = '' } = targetItem;
  let srcRole = '';
  let targetRole = '';
  if (
    (srcItemRole !== null && srcItemRole !== '') ||
    (targetItemRole !== '' && targetItemRole !== null)
  ) {
    if (
      srcItemRole !== '' &&
      (targetItemRole === '' || targetItemRole === null)
    ) {
      targetItemRole = srcItemRole;
    } else if (
      targetItemRole !== '' &&
      (srcItemRole === '' || srcItemRole === null)
    ) {
      srcItemRole = targetItemRole;
    }
    srcRole = `SET r1={role:'${srcItemRole}'}`;
    targetRole = `SET r2={role:'${targetItemRole}'}`;
    if (direction === 'to') {
      srcRole = `SET r1={role:'${targetItemRole}'}`;
      targetRole = `SET r2={role:'${srcItemRole}'}`;
    }
  }
  const { type: sType, _id: sId } = srcItem;
  const { type: tType, _id: tId } = targetItem;
  const { labelId: tLabelId, inverseLabelId: tInverseLabelId } = taxonomyTerm;
  let query = `MATCH (n1:${sType}) WHERE id(n1)=${sId} 
  MATCH (n2:${tType}) WHERE id(n2)=${tId} 
  MERGE (n1)-[r1:${tLabelId}]->(n2) ${srcRole}
  MERGE (n2)-[r2:${tInverseLabelId}]->(n1) ${targetRole}`;
  if (direction === 'to') {
    query = `MATCH (n1:${tType}) WHERE id(n1)=${tId} 
    MATCH (n2:${sType}) WHERE id(n2)=${sId} 
    MERGE (n1)-[r1:${tLabelId}]->(n2) ${srcRole}
    MERGE (n2)-[r2:${tInverseLabelId}]->(n1) ${targetRole}`;
  }
  const resultExec = await session
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
  const { body: postData } = req;
  if (Object.keys(postData).length === 0) {
    return resp.status(400).json({
      status: false,
      data: [],
      error: true,
      msg: 'The reference must not be empty',
    });
  }
  const delReference = await removeReference(postData);
  return resp.status(200).json({
    status: true,
    data: delReference,
    error: [],
    msg: 'Query results',
  });
};

const removeReference = async (reference) => {
  const session = driver.session();
  const { items = [], taxonomyTermId = '', taxonomyTermLabel = '' } = reference;
  const [srcItem, targetItem] = items;
  let taxonomyTermQuery = '';
  if (taxonomyTermId !== '') {
    taxonomyTermQuery = {
      _id: taxonomyTermId,
    };
  }
  if (taxonomyTermLabel !== '') {
    taxonomyTermQuery = {
      labelId: taxonomyTermLabel,
    };
  }
  let taxonomyTerm = new TaxonomyTerm(taxonomyTermQuery);
  await taxonomyTerm.load();
  let direction = 'from';
  if (taxonomyTerm._id === null) {
    taxonomyTermQuery = {
      inverseLabelId: taxonomyTermLabel,
    };
    taxonomyTerm = new TaxonomyTerm(taxonomyTermQuery);
    await taxonomyTerm.load();
    direction = 'to';
  }
  if (taxonomyTerm._id === null) {
    return false;
  }
  const { _id: sId, type: sTypeP } = srcItem;
  const { _id: tId, type: tTypeP } = targetItem;
  const { labelId, inverseLabelId } = taxonomyTerm;
  const sType = capitalCaseOnlyFirst(sTypeP);
  const tType = capitalCaseOnlyFirst(tTypeP);
  let query = `MATCH (n1:${sType}) WHERE id(n1)=${sId} 
  MATCH (n2:${tType}) WHERE id(n2)=${tId}
  MATCH (n1)-[r1:${labelId}]->(n2)
  MATCH (n2)-[r2:${inverseLabelId}]->(n1)
  DELETE r1
  DELETE r2`;
  if (direction === 'to') {
    query = `MATCH (n1:${tType}) WHERE id(n1)=${tId} 
    MATCH (n2:${sType}) WHERE id(n2)=${sId}
    MATCH (n1)-[r1:${labelId}]->(n2)
    MATCH (n2)-[r2:${inverseLabelId}]->(n1)
    DELETE r1
    DELETE r2`;
  }
  const resultPromise = await new Promise((resolve) => {
    session
      .run(query, {})
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
          let paths = outputPaths(record, _id);
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
  getReferences,
  putReference,
  putReferences,
  updateReference,
  deleteReference,
  removeReference,
};
