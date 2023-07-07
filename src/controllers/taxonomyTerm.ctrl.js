const driver = require('../config/db-driver');
const helpers = require('../helpers');

class TaxonomyTerm {
  constructor({
    _id = null,
    label = null,
    labelId = null,
    locked = false,
    inverseLabel = null,
    inverseLabelId = null,
    scopeNote = null,
    count = 0,
    createdBy = null,
    createdAt = null,
    updatedBy = null,
    updatedAt = null,
  }) {
    this._id = null;
    if (_id !== null) {
      this._id = _id;
    }
    this.label = label !== null ? label.toString() : label;
    this.labelId = labelId;
    this.locked = locked;
    this.inverseLabel = inverseLabel;
    this.inverseLabelId = inverseLabelId;
    this.scopeNote = scopeNote;
    this.count = count;
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
    if (this.inverseLabel === '') {
      status = false;
      errors.push({
        field: 'inverseLabel',
        msg: 'The inverseLabel must not be empty',
      });
    }

    let msg = 'The record is valid';
    if (!status) {
      msg = 'The record is not valid';
    }
    let output = {
      status: status,
      msg: msg,
      errors: errors,
    };
    return output;
  }

  async load() {
    if (
      this._id === null &&
      this.labelId === '' &&
      this.inverseLabelId === ''
    ) {
      return false;
    }
    const session = driver.session();
    let query = '';
    if (this._id !== null) {
      query = `MATCH (n:TaxonomyTerm) WHERE id(n)=${this._id} RETURN n`;
    } else if (this.labelId !== null) {
      query = `MATCH (n:TaxonomyTerm {labelId: '${this.labelId}'}) RETURN n`;
    } else if (this.inverseLabelId !== null) {
      query = `MATCH (n:TaxonomyTerm {inverseLabelId: '${this.inverseLabelId}'}) RETURN n`;
    } else {
      return false;
    }
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result;
        if (records.length > 0) {
          const record = records[0];
          const key = record.keys[0];
          let output = record.toObject()[key];
          output = helpers.outputRecord(output);
          return output;
        }
        return null;
      });
    // assign results to class values
    for (let key in node) {
      this[key] = node[key];
    }
    await this.countRelations();
    await this.loadRelations();
    await this.loadParentRef();
  }

  async countRelations() {
    if (this._id === null || this.labelId === '') {
      return false;
    }
    const session = driver.session();
    const query = `MATCH ()-[r:\`${this.labelId}\`]->() RETURN count(*) AS c`;
    const count = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result;
        if (records.length > 0) {
          const record = records[0];
          const key = record.keys[0];
          let output = record.toObject();
          helpers.prepareOutput(output);
          output = output[key];
          return output;
        }
        return 0;
      });
    this.count = count;
  }

  async loadRelations() {
    if (this._id === null || this.labelId === '') {
      return false;
    }
    let session = driver.session();
    let query = `MATCH (s)-[r:\`${this.labelId}\`]->(t) RETURN s,t ORDER BY s.labels[0] SKIP 0 LIMIT 25`;
    let relations = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        let records = result.records;
        let outputRecords = [];
        if (records.length > 0) {
          outputRecords = records.map((record) => {
            let sourceKey = record.keys[0];
            let targetKey = record.keys[1];
            let output = record.toObject();
            helpers.prepareOutput(output);
            let sourceItem = output[sourceKey];
            let source = sourceItem.properties;
            source.nodeType = sourceItem.labels[0];
            if (typeof source._id === 'undefined') {
              source._id = sourceItem.identity;
            }
            let targetItem = output[targetKey];
            let target = targetItem.properties;
            target.nodeType = targetItem.labels[0];
            if (typeof target._id === 'undefined') {
              target._id = targetItem.identity;
            }
            output = {
              source: source,
              target: target,
            };
            return output;
          });
        }
        outputRecords.sort((a, b) => {
          let akey = a.source.nodeType;
          let bkey = b.source.nodeType;
          if (akey < bkey) {
            return 1;
          }
          if (bkey < bkey) {
            return -1;
          }
          return 0;
        });
        return outputRecords;
      });
    this.relations = relations;
  }

  async loadParentRef() {
    if (this._id === null || this.labelId === '') {
      return false;
    }
    let session = driver.session();
    let query = `MATCH (n:TaxonomyTerm)-[r:hasChild]->(t:TaxonomyTerm) WHERE id(t)=${this._id} RETURN n`;
    let parentNode = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        let records = result.records;
        if (records.length > 0) {
          let record = records[0];
          let key = record.keys[0];
          let output = record.toObject()[key];
          output = helpers.outputRecord(output);
          return output;
        }
      });
    if (typeof parentNode !== 'undefined') {
      this.parentRef = parentNode._id;
    }
  }

  async uniqueId(value, type = 'labelId') {
    let session = driver.session();
    const normalizeLabel = (label) => {
      if (!label.includes('_')) {
        label = `${label}_2`;
      } else {
        let parts = label.split('_');
        let numPart = parts[1];
        let num = Number(numPart) + 1;
        label = `${parts[0]}_${num}`;
      }
      return label;
    };
    let label = value;
    let query = `MATCH (n:TaxonomyTerm) WHERE n.${type}="${value}" RETURN n`;
    let node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        let records = result.records;
        if (records.length > 0) {
          let record = records[0];
          let key = record.keys[0];
          let output = record.toObject()[key];
          output = helpers.outputRecord(output);
          return output;
        }
        return null;
      })
      .catch((error) => {
        console.log(error);
      });
    if (node !== null) {
      let newValue = normalizeLabel(value);
      label = await this.uniqueId(newValue, type);
    }
    session.close();
    return label;
  }

  async save(userId) {
    let validateTaxonomyTerm = this.validate();
    if (!validateTaxonomyTerm.status) {
      return validateTaxonomyTerm;
    } else {
      let session = driver.session();
      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
      } else {
        let original = new TaxonomyTerm({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;
      let newData = { ...this };
      if (typeof this._id === 'undefined' || this._id === null) {
        newData.labelId = helpers.normalizeLabelId(this.label);
        newData.inverseLabelId = helpers.normalizeLabelId(this.inverseLabel);
        // check if labelId and inverseLabelId is unique
        newData.labelId = await this.uniqueId(newData.labelId, 'labelId');
        newData.inverseLabelId = await this.uniqueId(
          newData.inverseLabelId,
          'inverseLabelId'
        );
      } else {
        await this.load();
        newData.labelId = this.labelId;
        newData.inverseLabelId = this.inverseLabelId;
      }
      if (typeof newData.parentRef !== 'undefined') {
        newData.parentRef = null;
      }

      if (Number(this.count) > 0) {
        let output = {
          error: ["You must remove the record's relations before updating"],
          status: false,
          data: [],
        };
        return output;
      }
      let nodeProperties = helpers.prepareNodeProperties(newData);
      let params = helpers.prepareParams(newData);

      let query = '';
      if (typeof this._id === 'undefined' || this._id === null) {
        query = 'CREATE (n:TaxonomyTerm ' + nodeProperties + ') RETURN n';
      } else {
        query =
          'MATCH (n:TaxonomyTerm) WHERE id(n)=' +
          this._id +
          ' SET n=' +
          nodeProperties +
          ' RETURN n';
      }
      const resultPromise = await session
        .run(query, params)
        .then((result) => {
          const { records } = result;
          const { length } = records;
          let output = {
            error: ['The record cannot be updated'],
            status: false,
            data: [],
          };
          if (length > 0) {
            const record = records[0];
            const key = record.keys[0];
            let resultRecord = record.toObject()[key];
            resultRecord = helpers.outputRecord(resultRecord);
            output = { error: [], status: true, data: resultRecord };
          }
          return output;
        })
        .catch((error) => {
          console.log(error);
        });

      // remove hasChild ref
      const termId = Number(resultPromise.data._id);
      const removeParentRefQuery = `MATCH (t:TaxonomyTerm) WHERE id(t)=${termId} MATCH (p:TaxonomyTerm)-[r1:hasChild]->(t) MATCH (t)-[r2:isChildOf]->(p) DELETE r1, r2`;
      await session.run(removeParentRefQuery, {}).then(() => {
        session.close();
      });
      return resultPromise;
    }
  }

  async delete() {
    const session = driver.session();
    await this.load();
    if (Number(this.count) > 0) {
      let output = {
        error: true,
        msg: ["You must remove the record's relations before deleting"],
        status: false,
        data: [],
      };
      return output;
    }
    // 1. delete all relations
    const queryR = `MATCH (n:TaxonomyTerm)-[r]-(t) WHERE id(n)=${this._id} DELETE r`;
    await session
      .writeTransaction((tx) => tx.run(queryR, {}))
      .then((result) => result)
      .catch((error) => {
        console.log(error);
      });
    // 2. delete term
    const query = `MATCH (n:TaxonomyTerm) WHERE id(n)=${this._id} DELETE n`;
    const deleteRecord = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        return result;
      })
      .catch((error) => {
        console.log(error);
      });
    return deleteRecord;
  }

  async loadChildrenIds() {
    if (
      this._id === null &&
      this.labelId === '' &&
      this.inverseLabelId === ''
    ) {
      return false;
    }
    const session = driver.session();
    let query = '';
    if (this._id !== null) {
      query = `MATCH (n:TaxonomyTerm)-[r:hasChild]->(t:TaxonomyTerm) WHERE id(n)=${this._id} RETURN id(t)  AS _id`;
    } else if (this.labelId !== null) {
      query = `MATCH (n:TaxonomyTerm {labelId: '${this.labelId}'})-[r:hasChild]->(t:TaxonomyTerm) RETURN id(t) AS _id`;
    } else if (this.inverseLabelId !== null) {
      query = `MATCH (n:TaxonomyTerm {inverseLabelId: '${this.inverseLabelId}'})-[r:hasChild]->(t:TaxonomyTerm) RETURN id(t) AS _id`;
    } else {
      return false;
    }
    await this.load();
    const results = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => result);

    let _ids = [];
    const { records } = results;
    const { length } = records;
    for (let i = 0; i < length; i += 1) {
      const record = records[i];
      const obj = record.toObject();
      helpers.prepareOutput(obj);
      const { _id } = obj;
      if (_ids.indexOf(_id) === -1) {
        _ids.push(_id);
      }

      const childTerm = new TaxonomyTerm({ _id });
      const child_ids = (await childTerm.loadChildrenIds()) || [];
      _ids = [..._ids, ...child_ids];
    }
    if (_ids.indexOf(this._id) === -1) {
      _ids = [this._id, ..._ids];
    }
    session.close();
    return _ids;
  }
}
/**
* @api {get} /taxonomy-terms Get taxonomy terms
* @apiName get taxonomy terms
* @apiGroup Taxonomy terms
*
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiSuccessExample {json} Success-Response:
{
    "status": true,
    "data": {
        "currentPage": 1,
        "data": [
            {
                "inverseLabel": "Diocese",
                "inverseLabelId": "Diocese",
                "labelId": "Diocese",
                "count": 0,
                "label": "Diocese",
                "locked": false,
                "scopeNote": "A Diocese is a religious administrative location division",
                "_id": "20",
                "systemLabels": [
                    "TaxonomyTerm"
                ]
            }
        ],
        "totalItems": 60,
        "totalPages": 3
    },
    "error": [],
    "msg": "Query results"
}
*/
const getTaxonomyTerms = async (req, resp) => {
  let parameters = req.query;
  let page = 0;
  let limit = 25;
  let query = '';

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

  let skip = limit * page;
  query = 'MATCH (n:TaxonomyTerm) RETURN n SKIP ' + skip + ' LIMIT ' + limit;
  let data = await getTaxonomyTermsQuery(query, limit);
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

const getTaxonomyTermsQuery = async (query, limit) => {
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });

  let nodes = helpers.normalizeRecordsOutput(nodesPromise);

  let count = await session
    .writeTransaction((tx) => tx.run('MATCH (n:TaxonomyTerm) RETURN count(*)'))
    .then((result) => {
      session.close();
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['count(*)'];
      output = parseInt(output, 10);
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

const countTaxonomyTermEntitiesTypes = async (
  entityType = '',
  _id,
  labelId
) => {
  if (entityType === '') {
    return 0;
  }
  let query = '';
  switch (entityType.toLowerCase()) {
    case 'event':
      query = `MATCH (n:Event {eventType:"${_id}"}) RETURN count(n) AS c`;
      break;
    case 'organisation':
      query = `MATCH (n:Organisation {organisationType:"${labelId}"}) RETURN count(n) AS c`;
      break;
    case 'person':
      query = `MATCH (n:Person {personType:"${labelId}"}) RETURN count(n) AS c`;
      break;
    case 'resource':
      query = `MATCH (n:Resource {systemType:"${_id}"}) RETURN count(n) AS c`;
      break;
    default:
      query = '';
  }
  if (query === '') {
    return 0;
  }
  const session = driver.session();
  const count = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      const { records } = result;
      if (records.length > 0) {
        const record = records[0];
        const key = record.keys[0];
        let output = record.toObject();
        helpers.prepareOutput(output);
        output = output[key];
        return output;
      }
      return 0;
    });
  return Number(count);
};

/**
* @api {get} /taxonomy-term Get taxonomy term
* @apiName get taxonomy term
* @apiGroup Taxonomy terms
*
* @apiParam {string} _id The _id of the requested taxonomy term. Either the _id or the labelId or the inverseLabelId should be provided.
* @apiParam {string} labelId The labelId of the requested taxonomy term. Either the _id or the labelId or the inverseLabelId should be provided.
* @apiParam {string} inverseLabelId The inverseLabelId of the requested taxonomy term. Either the _id or the labelId or the inverseLabelId should be provided.
* @apiParam {string} [entityType] If entityType is provided an entityCount will be returned with a count of all entities associated with the term. One of Event | Organisation | Person | Resource
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"87","label":"Classpiece","labelId":"Classpiece","locked":false,"inverseLabel":"Classpiece","inverseLabelId":"Classpiece","scopeNote":null,"count":"0","createdBy":null,"createdAt":null,"updatedBy":null,"updatedAt":null},"error":[],"msg":"Query results"}
*/
const getTaxonomyTerm = async (req, resp) => {
  const { query: parameters } = req;
  const {
    _id = '',
    labelId = '',
    inverseLabelId = '',
    entityType = '',
  } = parameters;
  if (_id === '' && labelId === '' && inverseLabelId === '') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: `Please select a valid id or a valid labelId or a valid inverseLabelId to continue.`,
    });
    return false;
  }
  let query = {};
  if (_id !== '') {
    query._id = _id;
  }
  if (labelId !== '') {
    query.labelId = labelId;
  }
  if (inverseLabelId !== '') {
    query.inverseLabelId = inverseLabelId;
  }
  const term = new TaxonomyTerm(query);
  await term.load();
  if (entityType !== '') {
    term.entitiesCount = await countTaxonomyTermEntitiesTypes(
      entityType,
      term._id,
      term.labelId
    );
  }
  resp.json({
    status: true,
    data: term,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /taxonomy-term Put taxonomy term
* @apiName put taxonomy term
* @apiGroup Taxonomy terms
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the taxonomy term. This should be undefined|null|blank in the creation of a new taxonomy term.
* @apiParam {string} label The taxonomy term's label.
* @apiParam {boolean} [locked=false] If the taxonomy term can be updated or not.
* @apiParam {string} inverseLabel The taxonomy term's inverseLabel.
* @apiParam {string} [scopeNote] A scopeNote about the taxonomy term.
* @apiExample {json} Example:
* {
  "label":"Test",
  "description":"test description"
}
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"error":[],"status":true,"data":{"inverseLabel":"enteredSchool","inverseLabelId":"enteredSchool","updatedBy":"260","labelId":"enteredSchool","count":"0","_id":"102","label":"enteredSchool","locked":false,"updatedAt":"2020-01-15T15:02:48.163Z"}},"error":[],"msg":"Query results"}
*/
const putTaxonomyTerm = async (req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The taxonomy term must not be empty',
    });
    return false;
  }
  let userId = req.decoded.id;
  let term = new TaxonomyTerm(postData);
  let data = await term.save(userId);
  resp.json({
    status: data.status,
    data: data.data,
    error: data.error,
    msg: 'Query results',
  });
};

/**
* @api {delete} /taxonomy-term Delete taxonomy term
* @apiName delete taxonomy term
* @apiGroup Taxonomy terms
* @apiPermission admin
*
* @apiParam {string} _id The id of the taxonomy term for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:TaxonomyTerm) WHERE id(n)=2500 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":1,"high":0},"resultAvailableAfter":{"low":9,"high":0}}},"error":[],"msg":"Query results"}
*/
const deleteTaxonomyTerm = async (req, resp) => {
  const { body } = req;
  const { _id = '' } = body;
  if (_id === '') {
    return resp.status(400).json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
  }
  const term = new TaxonomyTerm({ _id });
  const { data = null, error = [], status = true } = await term.delete();
  return resp.status(200).json({
    status,
    data,
    error,
    msg: '',
  });
};

module.exports = {
  TaxonomyTerm,
  getTaxonomyTerms,
  getTaxonomyTerm,
  putTaxonomyTerm,
  deleteTaxonomyTerm,
};
