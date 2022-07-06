const driver = require('../config/db-driver');
const helpers = require('../helpers');

class Entity {
  constructor({
    _id = null,
    label = null,
    labelId = null,
    locked = false,
    definition = null,
    example = null,
    parent = null,
    createdBy = null,
    createdAt = null,
    updatedBy = null,
    updatedAt = null,
  }) {
    if (_id !== null) {
      this._id = _id;
    }
    this.label = label;
    this.labelId = labelId;
    this.locked = locked;
    this.definition = definition;
    this.example = example;
    this.parent = parent;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedBy = updatedBy;
    this.updatedAt = updatedAt;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.label === '') {
      status = false;
      errors.push({ field: 'label', msg: 'The label must not be empty' });
    }
    if (this.labelId === '') {
      status = false;
      errors.push({ field: 'labelId', msg: 'The labelId must not be empty' });
    }
    if (this.labelId === '') {
      status = false;
      errors.push({ field: 'labelId', msg: 'The labelId must not be empty' });
    }
    if (this.definition === '') {
      status = false;
      errors.push({
        field: 'definition',
        msg: 'The definition must not be empty',
      });
    }

    const msg = !status ? 'The record is not valid' : 'The record is valid';
    return {
      status: status,
      msg: msg,
      errors: errors,
    };
  }

  async load() {
    if (this._id === null) {
      return false;
    }
    const session = driver.session();
    const query = `MATCH (n:Entity) WHERE id(n)=${this._id} RETURN n`;
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result;
        if (records.length > 0) {
          const record = records[0].toObject();
          return helpers.outputRecord(record.n);
        }
        return null;
      });
    // assign results to class values
    for (let key in node) {
      this[key] = node[key];
    }
    // load properties
    this.properties = await this.loadProperties();
  }

  async loadByLabelId() {
    if (this.labelId === null) {
      return false;
    }
    const session = driver.session();
    const query = `MATCH (n:Entity {labelId: '${this.labelId}'}) return n`;
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result;
        if (records.length > 0) {
          const record = records[0].toObject();
          return helpers.outputRecord(record.n);
        }
        return null;
      });
    // assign results to class values
    for (let key in node) {
      this[key] = node[key];
    }
    // load properties
    this.properties = await this.loadProperties();
  }

  async loadProperties() {
    if (typeof this._id === 'undefined' || this._id === null) {
      return false;
    }
    const session = driver.session();
    const query = `MATCH (n:Entity)-[r]->(re:Entity) WHERE id(n)=${this._id} RETURN n,r,re`;
    const relations = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result;
        if (records.length > 0) {
          return prepareRelations(records);
        }
        return [];
      });
    return relations;
  }

  async save(userId) {
    const validateEntity = this.validate();
    if (!validateEntity.status) {
      return validateEntity;
    } else {
      const session = driver.session();
      // normalize label id
      if (
        typeof this._id === 'undefined' ||
        (this._id === null && this.labelId === null)
      ) {
        this.labelId = helpers.normalizeLabelId(this.label);
      }
      // timestamps
      const now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
      } else {
        const original = new Entity({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;
      const nodeProperties = helpers.prepareNodeProperties(this);
      const params = helpers.prepareParams(this);

      let query = '';
      if (typeof this._id === 'undefined' || this._id === null) {
        query = `CREATE (n:Entity ${nodeProperties}) RETURN n`;
      } else {
        query = `MATCH (n:Entity) WHERE id(n)=${this._id} AND n.locked=false SET n=${nodeProperties} RETURN n`;
      }
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
            const [record] = records;
            const { keys } = record;
            const [key] = keys;
            const resultRecord = record.toObject()[key];
            const data = helpers.outputRecord(resultRecord);
            output = { error: [], status: true, data };
          }
          return output;
        })
        .catch((error) => {
          console.log(error);
          return { error, status: false, data: [] };
        });
      return resultPromise;
    }
  }

  async delete() {
    let session = driver.session();
    let queryRel =
      'MATCH (n:Entity)-[r]->() WHERE id(n)=' +
      this._id +
      ' AND n.locked=false DELETE r';
    let queryNode =
      'MATCH (n:Entity) WHERE id(n)=' +
      this._id +
      '  AND n.locked=false DELETE n';
    let deleteRel = await session
      .writeTransaction((tx) => tx.run(queryRel, {}))
      .then(async (result) => {
        session.close();
        return result;
      });
    let deleteNode = await session
      .writeTransaction((tx) => tx.run(queryNode, {}))
      .then(async (result) => {
        session.close();
        return result;
      });
    return {
      relations: deleteRel.summary.counters._stats,
      node: deleteNode.summary.counters._stats,
    };
  }
}
/**
* @api {get} /entities Get entities
* @apiName get entities
* @apiGroup Entities
*
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
*
* @apiExample {request} Example:
* http://localhost:5100/api/entity?page=1&limit=25
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"currentPage":1,"data":[{"definition":"This is the model of an event.","label":"Event","labelId":"Event","locked":true,"_id":"49","systemLabels":["Entity"]},{"definition":"This is the model of an organisation.","label":"Organisation","labelId":"Organisation","locked":true,"_id":"450","systemLabels":["Entity"]},{"definition":"This is the model of a person.","label":"Person","labelId":"Person","locked":true,"_id":"402","systemLabels":["Entity"]},{"definition":"This is the model of a resource.","label":"Resource","labelId":"Resource","locked":true,"_id":"261","systemLabels":["Entity"]},{"definition":"This is the model of a spatial object.","label":"Spatial","labelId":"Spatial","locked":true,"_id":"313","systemLabels":["Entity"]},{"definition":"This is the model of a temporal object.","label":"Temporal","labelId":"Temporal","locked":true,"_id":"413","systemLabels":["Entity"]},{"createdAt":"2020-01-14T12:54:12.873Z","updatedBy":"260","labelId":"TestEntity","createdBy":"260","definition":"This is a test entity.","label":"Test entity","locked":false,"updatedAt":"2020-01-14T12:54:12.873Z","_id":"2257","systemLabels":["Entity"]}],"totalItems":"7","totalPages":1},"error":[],"msg":"Query results"}
*/
const getEntities = async (req, resp) => {
  let parameters = req.query;
  let page = 0;
  let limit = 25;

  if (typeof parameters.page !== 'undefined') {
    page = parseInt(parameters.page, 10);
  }
  if (typeof parameters.limit !== 'undefined') {
    limit = parseInt(parameters.limit, 10);
  }
  let currentPage = page;
  if (page === 0) {
    currentPage = 1;
  }
  let query = 'MATCH (n:Entity) RETURN n ORDER BY n.label';
  let data = await getEntitiesQuery(query, limit);
  if (data.error) {
    resp.json({
      status: false,
      data: [],
      error: data.error,
      msg: data.error.message,
    });
  } else {
    let responseData = {
      currentPage: currentPage,
      data: data.nodes,
      totalItems: data.count,
      totalPages: data.totalPages,
    };
    resp.json({
      status: true,
      data: responseData,
      error: [],
      msg: 'Query results',
    });
  }
};

const prepareRelations = (records) => {
  let relations = [];
  for (let key in records) {
    let record = records[key].toObject();
    let sourceItem = helpers.outputRecord(record.n);
    let relation = record.r;
    helpers.prepareOutput(relation);
    let targetItem = helpers.outputRecord(record.re);
    let newRelation = prepareRelation(sourceItem, relation, targetItem);
    relations.push(newRelation);
  }
  return relations;
};

const prepareRelation = (sourceItem, relation, targetItem) => {
  let newProperty = {
    _id: relation.identity,
    term: {
      label: relation.type,
    },
    entityRef: {
      _id: targetItem._id,
      label: targetItem.label,
    },
  };
  return newProperty;
};

const getEntitiesQuery = async (query, limit) => {
  let session = driver.session();
  let nodes = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      let records = result.records;
      let outputRecords = helpers.normalizeRecordsOutput(records);
      return outputRecords;
    });

  let count = await session
    .writeTransaction((tx) => tx.run('MATCH (n:Entity) RETURN count(*)'))
    .then((result) => {
      session.close();
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['count(*)'];
      return output;
    });
  let totalPages = Math.ceil(count / limit);
  let result = {
    nodes: nodes,
    count: count,
    totalPages: totalPages,
  };
  return result;
};

/**
* @api {get} /entity Get entity
* @apiName get entity
* @apiGroup Entities
*
* @apiParam {string} _id The _id of the requested entity. If labelId is provided _id can be omitted.
* @apiParam {string} labelId The labelId of the requested entity. If _id is provided labelId can be omitted.
*
* @apiExample {request} Example:
* http://localhost:5100/api/entity?_id=2256
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"2257","label":"Test entity","labelId":"TestEntity","locked":false,"definition":"This is a test entity.","example":null,"parent":null,"createdBy":"260","createdAt":"2020-01-14T12:54:12.873Z","updatedBy":"260","updatedAt":"2020-01-14T12:54:12.873Z","properties":[]},"error":[],"msg":"Query results"}
*/
const getEntity = async (req, resp) => {
  let parameters = req.query;
  if (
    (typeof parameters._id === 'undefined' || parameters._id === '') &&
    (typeof parameters.labelId === 'undefined' || parameters.labelId === '')
  ) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id or a valid label to continue.',
    });
    return false;
  }
  let entity = null;
  if (typeof parameters._id !== 'undefined' && parameters._id !== '') {
    let _id = parameters._id;
    entity = new Entity({ _id: _id });
    await entity.load();
  } else if (
    typeof parameters.labelId !== 'undefined' &&
    parameters.labelId !== ''
  ) {
    let labelId = parameters.labelId;
    entity = new Entity({ labelId: labelId });
    await entity.loadByLabelId();
  }
  resp.json({
    status: true,
    data: entity,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /entity Put entity
* @apiName put entity
* @apiGroup Entities
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the entity. This should be undefined|null|blank in the creation of a new entity.
* @apiParam {string} label The label of the new entity.
* @apiParam {boolean} [locked=false] If future updates are allowed for this entity. For the creation of a new entity this value must be set to false.
* @apiParam {string} definition The definition of the entity.
* @apiParam {string} [example] An example of use for this entity.
* @apiParam {string} [parent] A parent entity for this entity.
*
* @apiExample {json} Example:
* {
    "example": null,
    "label": "Test entity",
    "labelId": "TestEntity",
    "locked": false,
    "definition": "This is a test entity.",
    "parent": null
}
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"createdAt":"2020-01-14T12:54:12.873Z","updatedBy":"260","labelId":"TestEntity","createdBy":"260","definition":"This is a test entity.","label":"Test entity","locked":false,"updatedAt":"2020-01-14T12:54:12.873Z","_id":"2257"},"error":[],"msg":"Query results"}
*/
const putEntity = async (req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The entity must not be empty',
    });
    return false;
  }
  let userId = req.decoded.id;
  let entity = new Entity(postData);
  let output = await entity.save(userId);
  resp.json({
    status: output.status,
    data: output.data,
    error: output.error,
    msg: 'Query results',
  });
};
/**
* @api {delete} /entity Delete entity
* @apiName delete entity
* @apiGroup Entities
* @apiPermission admin
*
* @apiParam {string} _id The id of the entity for deletion. If labelId is provided _id can be omitted.
* @apiParam {string} labelId The labelId of the entity for deletion. If _id is provided labelId can be omitted.
*
* @apiExample {request} Example:
* http://localhost:5100/api/entity?_id=2256
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"relations":{"nodesCreated":0,"nodesDeleted":0,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0},"node":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"error":[],"msg":"Query results"}
*/
const deleteEntity = async (req, resp) => {
  const { body } = req;
  const { _id = '', labelId = '' } = body;
  if (_id === '' && labelId === '') {
    if (_id === '') {
      return resp.status(400).json({
        status: false,
        data: [],
        error: true,
        msg: 'Please select a valid id to continue.',
      });
    } else if (labelId === '') {
      return resp.status(400).json({
        status: false,
        data: [],
        error: true,
        msg: 'Please select a valid label id to continue.',
      });
    }
  }
  const entity = new Entity({ _id });
  const { data = null, error = [], status = true } = await entity.delete();
  return resp.status(200).json({
    status,
    data,
    error,
    msg: '',
  });
};

module.exports = {
  Entity,
  getEntities,
  getEntity,
  putEntity,
  deleteEntity,
};
