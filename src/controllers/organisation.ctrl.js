const driver = require('../config/db-driver');
const helpers = require('../helpers');

class Organisation {
  constructor({
    _id = null,
    label = null,
    labelSoundex = null,
    alternateAppelations = [],
    description = null,
    organisationType = null,
    status = 'private',
    createdBy = null,
    createdAt = null,
    updatedBy = null,
    updatedAt = null,
  }) {
    this._id = null;
    if (_id !== null) {
      this._id = _id;
    }
    this.label = label;
    this.labelSoundex = labelSoundex;
    this.description = description;
    this.organisationType = organisationType;
    this.status = status;
    this.alternateAppelations = alternateAppelations;
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
    if (this.alternateAppelations.length > 0) {
      for (let key in this.alternateAppelations) {
        const alternateAppelation = this.alternateAppelations[key];
        if (alternateAppelation.label.length < 2) {
          status = false;
          errors.push({
            field: 'appelation',
            msg:
              'Appelation label must contain at least 2 characters for alternate appelation "' +
              alternateAppelation.appelation +
              '"',
          });
        }
      }
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
    if (this._id === null) {
      return false;
    }
    let session = driver.session();
    let query = 'MATCH (n:Organisation) WHERE id(n)=' + this._id + ' return n';
    let node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        let records = result.records;
        if (records.length > 0) {
          let record = records[0].toObject();
          let outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
      });
    for (let key in node) {
      this[key] = node[key];
      let newAppelations = [];
      if (key === 'alternateAppelations' && node[key].length > 0) {
        for (let akey in node[key]) {
          let alternateAppelation = JSON.parse(node[key][akey]);
          newAppelations.push(alternateAppelation);
        }
        this[key] = newAppelations;
      }
    }

    // relations
    let events = await helpers.loadRelations(this._id, 'Organisation', 'Event');
    let organisations = await helpers.loadRelations(
      this._id,
      'Organisation',
      'Organisation'
    );
    let people = await helpers.loadRelations(
      this._id,
      'Organisation',
      'Person'
    );
    let resources = await helpers.loadRelations(
      this._id,
      'Organisation',
      'Resource'
    );
    let spatial = await helpers.loadRelations(
      this._id,
      'Organisation',
      'Spatial'
    );
    this.events = events;
    this.organisations = organisations;
    this.people = people;
    this.resources = resources;
    this.spatial = spatial;
  }

  async save(userId) {
    let validateOrganisation = this.validate();
    if (!validateOrganisation.status) {
      return validateOrganisation;
    } else {
      let session = driver.session();
      let newAppelations = [];
      if (this.alternateAppelations.length > 0) {
        for (let key in this.alternateAppelations) {
          let alternateAppelation = JSON.stringify(
            this.alternateAppelations[key]
          );
          newAppelations.push(alternateAppelation);
        }
      }
      this.alternateAppelations = newAppelations;
      if (this.labelSoundex === null) {
        this.labelSoundex = helpers.soundex(this.label.trim());
      }

      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
      } else {
        let original = new Organisation({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      let nodeProperties = helpers.prepareNodeProperties(this);
      let params = helpers.prepareParams(this);

      let query = '';
      if (typeof this._id === 'undefined' || this._id === null) {
        query = 'CREATE (n:Organisation ' + nodeProperties + ') RETURN n';
      } else {
        query =
          'MATCH (n:Organisation) WHERE id(n)=' +
          this._id +
          ' SET n=' +
          nodeProperties +
          ' RETURN n';
      }
      const resultPromise = await session.run(query, params).then((result) => {
        session.close();
        let records = result.records;
        let output = {
          error: ['The record cannot be updated'],
          status: false,
          data: [],
        };
        if (records.length > 0) {
          let record = records[0];
          let key = record.keys[0];
          let resultRecord = record.toObject()[key];
          resultRecord = helpers.outputRecord(resultRecord);
          output = { error: [], status: true, data: resultRecord };
        }
        return output;
      });
      return resultPromise;
    }
  }

  async delete() {
    let session = driver.session();
    // 1. delete relations
    let query1 =
      'MATCH (n:Organisation)-[r]-() WHERE id(n)=' + this._id + ' DELETE r';
    await session
      .writeTransaction((tx) => tx.run(query1, {}))
      .then((result) => {
        return result;
      })
      .catch((error) => {
        console.log(error);
      });
    // 2. delete node
    let query = 'MATCH (n:Organisation) WHERE id(n)=' + this._id + ' DELETE n';
    let deleteRecord = await session
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
}

/**
* @api {get} /organisations Get organisations
* @apiName get organisations
* @apiGroup Organisations
*
* @apiParam {_id} [_id] A unique _id.
* @apiParam {string} [label] A string to match against the organisations' labels.
* @apiParam {string} [organisationType] An organisation type label.
* @apiParam {string} [orderField=firstName] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiSuccessExample {json} Success-Response:
{
  "status": true,
  "data": {
    "currentPage": 1,
    "data": [{
      "label": "Achadh Conaire",
      "labelSoundex": "A232",
      "alternateAppelations": [],
      "organisationType": "Diocese",
      "status": false,
      "_id": "135",
      "systemLabels": ["Organisation"],
      "resources": []
    }],
    "totalItems": 80,
    "totalPages": 4
  },
  "error": [],
  "msg": "Query results"
}
*/
const getOrganisations = async (req, resp) => {
  let parameters = req.query;
  let label = '';
  let organisationType = '';
  let status = '';
  let page = 0;
  let orderField = 'label';
  let queryPage = 0;
  let queryOrder = '';
  let limit = 25;

  let query = '';
  let queryParams = '';

  if (
    typeof parameters._id !== 'undefined' &&
    parameters._id !== null &&
    parameters._id !== ''
  ) {
    const orgId = parameters._id.trim();
    queryParams = `id(n)=${orgId} `;
  } else {
    if (typeof parameters.label !== 'undefined') {
      label = parameters.label;
      if (label !== '') {
        let escapeLabel = helpers.addslashes(label);
        queryParams = `toLower(n.label) =~ toLower('.*${escapeLabel}.*')`;
      }
    }
    if (typeof parameters.orderField !== 'undefined') {
      orderField = parameters.orderField;
    }
    if (typeof parameters.organisationType !== 'undefined') {
      organisationType = parameters.organisationType;
      if (organisationType !== '') {
        if (queryParams !== '') {
          queryParams += ' AND ';
        }
        queryParams +=
          "toLower(n.organisationType) =~ toLower('.*" +
          organisationType +
          ".*') ";
      }
    }
    if (orderField !== '') {
      queryOrder = 'ORDER BY n.' + orderField;
      if (
        typeof parameters.orderDesc !== 'undefined' &&
        parameters.orderDesc === 'true'
      ) {
        queryOrder += ' DESC';
      }
    }
    if (typeof parameters.status !== 'undefined') {
      status = parameters.status;
      if (status !== '') {
        if (queryParams !== '') {
          queryParams += ' AND ';
        }
        queryParams += "toLower(n.status) =~ toLower('.*" + status + ".*') ";
      }
    }

    if (typeof parameters.page !== 'undefined') {
      page = parseInt(parameters.page, 10);
      queryPage = parseInt(parameters.page, 10) - 1;
      if (queryPage < 0) {
        queryPage = 0;
      }
    }
    if (typeof parameters.limit !== 'undefined') {
      limit = parseInt(parameters.limit, 10);
    }
  }

  let currentPage = page;
  if (page === 0) {
    currentPage = 1;
  }

  let skip = limit * queryPage;
  if (queryParams !== '') {
    queryParams = 'WHERE ' + queryParams;
  }
  query =
    'MATCH (n:Organisation) ' +
    queryParams +
    ' RETURN n ' +
    queryOrder +
    ' SKIP ' +
    skip +
    ' LIMIT ' +
    limit;
  let data = await getOrganisationsQuery(query, queryParams, limit);
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

const getOrganisationsQuery = async (query, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });

  let nodes = helpers.normalizeRecordsOutput(nodesPromise);
  // get related resources
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    node.resources = await helpers.loadRelations(
      node._id,
      'Organisation',
      'Resource'
    );
  }

  let count = await session
    .writeTransaction((tx) =>
      tx.run('MATCH (n:Organisation) ' + queryParams + ' RETURN count(*)')
    )
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

/**
* @api {get} /organisation Get organisation
* @apiName get organisation
* @apiGroup Organisations
*
* @apiParam {string} _id The _id of the requested organisation.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"375","label":"Cill Da Lua","labelSoundex":"C434","description":null,"organisationType":"Diocese","status":false,"alternateAppelations":[],"createdBy":null,"createdAt":null,"updatedBy":null,"updatedAt":null,"events":[],"organisations":[],"people":[],"resources":[]},"error":[],"msg":"Query results"}
*/
const getOrganisation = async (req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id === 'undefined' || parameters._id === '') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
    return false;
  }
  let _id = parameters._id;
  let organisation = new Organisation({ _id: _id });
  await organisation.load();
  resp.json({
    status: true,
    data: organisation,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /organisation Put organisation
* @apiName put organisation
* @apiGroup Organisations
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the organisation. This should be undefined|null|blank in the creation of a new organisation.
* @apiParam {string} label The organisation's label.
* @apiParam {string} [description] A description about the organisation.
* @apiParam {string} [organisationType] The type of the organisation. The available values come from the Organisation types taxonomy.
* @apiParam {string} [status=private] The status of the person.
* @apiParam {array} [alternateAppelations] The organisation's alternate appelations.
* @apiParam {string}  alternateAppelation[label] The organisation's alternate appelation label.
* @apiParam {string}  [alternateAppelation[note]] The organisation's alternate appelation note.
* @apiParam {object}  [alternateAppelation[language]] The organisation's alternate appelation language.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"error":[],"status":true,"data":{"updatedBy":"260","labelSoundex":"A232","description":"","_id":"135","label":"Achadh Conaire","alternateAppelations":[],"updatedAt":"2020-01-15T11:05:14.136Z","organisationType":"Diocese","status":false}},"error":[],"msg":"Query results"}
*/
const putOrganisation = async (req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The organisation must not be empty',
    });
    return false;
  }
  let userId = req.decoded.id;
  let organisationData = {};
  for (let key in postData) {
    if (postData[key] !== null) {
      organisationData[key] = postData[key];
      // add the soundex
      if (key === 'label') {
        organisationData.labelSoundex = helpers.soundex(postData.label.trim());
      }
    }
  }
  let organisation = new Organisation(organisationData);
  let data = await organisation.save(userId);
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {delete} /organisation Delete organisation
* @apiName delete organisation
* @apiGroup Organisations
* @apiPermission admin
*
* @apiParam {string} _id The id of the organisation for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Organisation) WHERE id(n)=2069 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":17,"high":0}}},"error":[],"msg":"Query results"}*/
const deleteOrganisation = async (req, resp) => {
  let params = req.query;
  let organisation = new Organisation(params);
  let data = await organisation.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {delete} /organisations Delete organisations
* @apiName delete organisations
* @apiGroup Organisations
* @apiPermission admin
*
* @apiParam {array} _ids The ids of the organisations for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":[{"records":[],"summary":{"statement":{"text":"MATCH (n:Organisation) WHERE id(n)=2109 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":5,"high":0}}}],"error":[],"msg":"Query results"}
*/
const deleteOrganisations = async (req, resp) => {
  let deleteData = req.body;
  if (typeof deleteData._ids === 'undefined' || deleteData._ids.length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select valid ids to continue.',
    });
    return false;
  }
  let responseData = [];
  for (let i = 0; i < deleteData._ids.length; i++) {
    let _id = deleteData._ids[i];
    let organisation = new Organisation({ _id: _id });
    responseData.push(await organisation.delete());
  }
  resp.json({
    status: true,
    data: responseData,
    error: [],
    msg: 'Query results',
  });
};

const updateStatus = async (req, resp) => {
  let postData = req.body;
  if (
    typeof postData._ids === 'undefined' ||
    postData._ids.length === 0 ||
    typeof postData.status === 'undefined' ||
    postData.status === ''
  ) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select valid ids and new status to continue.',
    });
    return false;
  }
  let userId = req.decoded.id;
  let responseData = [];
  let session = driver.session();
  for (let i = 0; i < postData._ids.length; i++) {
    let _id = postData._ids[i];
    let now = new Date().toISOString();
    let updatedBy = userId;
    let updatedAt = now;
    let query = `MATCH (n:Organisation) WHERE id(n)=${_id} SET n.status="${postData.status}", n.updatedBy="${updatedBy}", n.updatedAt="${updatedAt}"`;
    let update = await session.run(query, {}).then((result) => {
      return result;
    });
    responseData.push(update);
  }
  session.close();
  resp.json({
    status: true,
    data: responseData,
    error: [],
    msg: 'Query results',
  });
};

module.exports = {
  Organisation: Organisation,
  getOrganisations: getOrganisations,
  getOrganisation: getOrganisation,
  putOrganisation: putOrganisation,
  deleteOrganisation: deleteOrganisation,
  deleteOrganisations: deleteOrganisations,
  updateStatus: updateStatus,
};
