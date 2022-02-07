const driver = require('../config/db-driver');
const helpers = require('../helpers');

class Taxonomy {
  constructor({
    _id = null,
    label = null,
    labelId = null,
    locked = false,
    description = null,
    systemType = null,
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
    this.labelId = labelId;
    this.locked = locked;
    this.description = description;
    this.systemType = systemType;
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
    if (this._id === null && this.systemType === '') {
      return false;
    }
    let query = '';
    if (this._id !== null) {
      query = 'MATCH (n:Taxonomy) WHERE id(n)=' + this._id + ' return n';
    } else if (this.systemType !== null) {
      query =
        "MATCH (n:Taxonomy {systemType: '" + this.systemType + "'}) return n";
    }
    let session = driver.session();
    let node = await session
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
    // assign results to class values
    for (let key in node) {
      this[key] = node[key];
    }
  }

  async countRelations() {
    if (this._id === null || this.label === '') {
      return false;
    }
    let session = driver.session();
    let query =
      'MATCH (n)-[r]->() WHERE id(n)=' + this._id + ' RETURN count(*) AS c';
    let count = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        let records = result.records;
        if (records.length > 0) {
          let record = records[0];
          let key = record.keys[0];
          let output = record.toObject();
          helpers.prepareOutput(output);
          output = output[key];
          return output;
        }
      });
    this.count = count;
  }

  async save(userId) {
    let validateTaxonomy = this.validate();
    if (!validateTaxonomy.status) {
      return validateTaxonomy;
    } else {
      let session = driver.session();

      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
      } else {
        let original = new Taxonomy({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      let newData = this;
      // normalize label id
      if (typeof this._id === 'undefined' || this._id === null) {
        let normalizedLabel = helpers.normalizeLabelId(this.label);
        this.labelId = normalizedLabel;
        this.systemType = helpers.lowerCaseOnlyFirst(normalizedLabel);
      } else {
        await this.load();
      }
      if (this.locked && typeof this._id === 'undefined' && this._id === null) {
        let output = {
          error: ['This taxonomy is locked and cannot be updated'],
          status: false,
          data: [],
        };
        return output;
      }
      let nodeProperties = helpers.prepareNodeProperties(newData);
      let params = helpers.prepareParams(newData);
      let query = '';
      if (typeof this._id === 'undefined' || this._id === null) {
        query = 'CREATE (n:Taxonomy ' + nodeProperties + ') RETURN n';
      } else {
        query =
          'MATCH (n:Taxonomy) WHERE id(n)=' +
          this._id +
          ' AND n.locked=false SET n=' +
          nodeProperties +
          ' RETURN n';
      }
      let resultPromise = await session.run(query, params).then((result) => {
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
    await this.countRelations();
    if (parseInt(this.count, 10) > 0) {
      let output = {
        error: true,
        msg: ["You must remove the record's relations before deleting"],
        status: false,
        data: [],
      };
      return output;
    }
    let query = 'MATCH (n:Taxonomy) WHERE id(n)=' + this._id + ' DELETE n';
    let deleteRecord = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        return result;
      });
    let output = {
      error: false,
      msg: ['Item deleted successfully'],
      status: true,
      data: deleteRecord.summary.counters._stats,
    };
    return output;
  }
}
/**
* @api {get} /taxonomies Get taxonomies
* @apiName get taxonomies
* @apiGroup Taxonomies
*
* @apiParam {string} [systemType] A systemType to match against the taxonomies' systemType.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"currentPage":1,"data":[{"systemType":"eventTypes","description":"The Event types taxonomy contains a list of all the possible event types","label":"Event types","labelId":"EventTypes","locked":true,"_id":"81","systemLabels":["Taxonomy"]},{"systemType":"organisationTypes","description":"","label":"Organisation types","labelId":"OrganisationTypes","locked":true,"_id":"140","systemLabels":["Taxonomy"]},{"systemType":"peopleRoles","description":"","label":"People roles","labelId":"PeopleRoles","locked":true,"_id":"1","systemLabels":["Taxonomy"]},{"systemType":"relationsTypes","description":"The Relations types taxonomy contains the possible relations between the data model entities e.g. [entity]Resource [relation]depicts [entity]Person.","label":"Relations types","labelId":"RelationsTypes","locked":true,"_id":"178","systemLabels":["Taxonomy"]},{"systemType":"resourceSystemTypes","description":"","label":"Resource system types","labelId":"ResourceSystemTypes","locked":true,"_id":"0","systemLabels":["Taxonomy"]},{"systemType":"userGroups","description":"The available user groups relations to users","label":"User groups","labelId":"UserGroups","locked":true,"_id":"101","systemLabels":["Taxonomy"]}],"totalItems":"6","totalPages":1},"error":[],"msg":"Query results"}
*/
const getTaxonomies = async (req, resp) => {
  let parameters = req.query;
  let page = 0;
  let queryPage = 0;
  let limit = 25;

  let query = '';
  let queryParams = '';

  if (typeof parameters.page !== 'undefined') {
    page = parseInt(parameters.page, 10);
    queryPage = parseInt(parameters.page, 10) - 1;
  }
  if (typeof parameters.limit !== 'undefined') {
    limit = parseInt(parameters.limit, 10);
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
    'MATCH (n:Taxonomy) ' +
    queryParams +
    ' RETURN n ORDER BY n.label SKIP ' +
    skip +
    ' LIMIT ' +
    limit;
  let data = await getTaxonomiesQuery(query, queryParams, limit);
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

const getTaxonomiesQuery = async (query, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });
  let nodes = helpers.normalizeRecordsOutput(nodesPromise);
  let count = await session
    .writeTransaction((tx) =>
      tx.run('MATCH (n:Taxonomy) ' + queryParams + ' RETURN count(*)')
    )
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
* @api {get} /taxonomy Get taxonomy
* @apiName get taxonomy
* @apiGroup Taxonomies
*
* @apiParam {string} _id The _id of the requested taxonomy. Either the _id or the systemType should be provided.
* @apiParam {string} systemType The systemType of the requested taxonomy. Either the _id or the systemType should be provided.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"140","label":"Organisation types","locked":true,"description":"","systemType":"organisationTypes","createdBy":null,"createdAt":null,"updatedBy":null,"updatedAt":null,"labelId":"OrganisationTypes","taxonomyterms":[{"inverseLabel":"Administrative area","inverseLabelId":"AdministrativeArea","labelId":"AdministrativeArea","count":0,"label":"Administrative area","locked":false,"scopeNote":"This is an organisation that can be viewed as an administrative location division e.g. a diocese, a municipality etc.","_id":"179","systemLabels":["TaxonomyTerm"]},{"inverseLabel":"Diocese","inverseLabelId":"Diocese","labelId":"Diocese","count":0,"label":"Diocese","locked":false,"scopeNote":"A Diocese is a religious administrative location division","_id":"20","systemLabels":["TaxonomyTerm"]},{"inverseLabel":"Religious Order","inverseLabelId":"ReligiousOrder","labelId":"ReligiousOrder","count":0,"label":"Religious order","locked":false,"scopeNote":"A religious order is a religious organisation","_id":"141","systemLabels":["TaxonomyTerm"]}]},"error":[],"msg":"Query results"}
*/
const getTaxonomy = async (req, resp) => {
  let parameters = req.query;
  if (
    (typeof parameters._id === 'undefined' || parameters._id === '') &&
    (typeof parameters.systemType === 'undefined' ||
      parameters.systemType === '')
  ) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
    return false;
  }
  let _id = null;
  let systemType = null;
  let flat = false;
  if (typeof parameters._id !== 'undefined' && parameters._id !== '') {
    _id = parameters._id;
  }
  if (
    typeof parameters.systemType !== 'undefined' &&
    parameters.systemType !== ''
  ) {
    systemType = parameters.systemType;
  }
  if (typeof parameters.flat !== 'undefined' && parameters.flat !== '') {
    flat = parameters.flat;
  }
  let query = {};
  if (_id !== null) {
    query._id = _id;
  }
  if (systemType !== null) {
    query.systemType = systemType;
  }
  let taxonomy = new Taxonomy(query);
  await taxonomy.load();
  if (flat) {
    taxonomy.taxonomyterms = await getTaxonomyTerms(taxonomy._id);
  } else {
    taxonomy.taxonomyterms = await getTaxonomyTermsTree(taxonomy._id);
  }

  resp.json({
    status: true,
    data: taxonomy,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /taxonomy Put taxonomy
* @apiName put taxonomy
* @apiGroup Taxonomies
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the taxonomy. This should be undefined|null|blank in the creation of a new taxonomy.
* @apiParam {string} label The taxonomy's label.
* @apiParam {boolean} [locked=false] If the taxonomy can be updated or not.
* @apiParam {string} [description] A description about the taxonomy.
* @apiExample {json} Example:
* {
  "label":"Test",
  "description":"test description"
}
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"createdAt":"2020-01-15T12:56:39.387Z","updatedBy":"260","labelId":"Test","createdBy":"260","systemType":"test","description":"","label":"Test","locked":false,"updatedAt":"2020-01-15T12:56:39.387Z","_id":"2480"},"error":[],"msg":"Query results"}*/
const putTaxonomy = async (req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The taxonomy must not be empty',
    });
    return false;
  }
  let userId = req.decoded.id;
  let taxonomy = new Taxonomy(postData);
  let output = await taxonomy.save(userId);
  resp.json({
    status: output.status,
    data: output.data,
    error: output.error,
    msg: 'Query results',
  });
};

/**
* @api {delete} /taxonomy Delete taxonomy
* @apiName delete taxonomy
* @apiGroup Taxonomies
* @apiPermission admin
*
* @apiParam {string} _id The id of the taxonomy for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Taxonomy) WHERE id(n)=2480 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":1,"high":0}}},"error":[],"msg":"Query results"}*/
const deleteTaxonomy = async (req, resp) => {
  let postData = req.body;
  let taxonomy = new Taxonomy(postData);
  let output = await taxonomy.delete();
  resp.json({
    status: output.status,
    data: output.data,
    error: output.error,
    msg: output.msg,
  });
};

const getTaxonomyTermsTree = async (_id, parentId = null) => {
  let session = driver.session();
  let query = `MATCH (t:Taxonomy) WHERE id(t)=${_id} MATCH (n:TaxonomyTerm)-[r:isChildOf]->(t) WHERE NOT (n)-[:isChildOf]->(:TaxonomyTerm) RETURN n ORDER BY n.label`;
  if (parentId !== null) {
    parentId = parseInt(parentId, 10);
    query = `MATCH (t:Taxonomy) WHERE id(t)=${_id} MATCH (p:TaxonomyTerm) WHERE id(p)=${parentId} MATCH (n:TaxonomyTerm)-[r:isChildOf]->(t) WHERE (n)-[:isChildOf]->(p) RETURN n ORDER BY n.label`;
  }
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    });
  let taxonomyTerms = helpers.normalizeRecordsOutput(nodesPromise, 'n');
  for (let i = 0; i < taxonomyTerms.length; i++) {
    let taxonomyTerm = taxonomyTerms[i];
    let children = await getTaxonomyTermsTree(_id, taxonomyTerm._id);
    taxonomyTerm.children = children;
  }
  return taxonomyTerms;
};

const getTaxonomyTerms = async (_id) => {
  let session = driver.session();
  let query = `MATCH (t:Taxonomy) WHERE id(t)=${_id} MATCH (n:TaxonomyTerm)-[r:isChildOf]->(t) RETURN n ORDER BY n.label`;
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    });
  let taxonomyTerms = helpers.normalizeRecordsOutput(nodesPromise, 'n');
  return taxonomyTerms;
};

module.exports = {
  Taxonomy: Taxonomy,
  getTaxonomies: getTaxonomies,
  getTaxonomy: getTaxonomy,
  putTaxonomy: putTaxonomy,
  deleteTaxonomy: deleteTaxonomy,
  getTaxonomyTerms: getTaxonomyTerms,
};
