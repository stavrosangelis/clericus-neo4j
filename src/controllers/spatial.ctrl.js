const driver = require('../config/db-driver');
const helpers = require('../helpers');

class Spatial {
  constructor({
    _id = null,
    label = null,
    streetAddress = null,
    locality = null,
    region = null,
    postalCode = null,
    country = null,
    latitude = null,
    longitude = null,
    locationType = null,
    note = null,
    rawData = null,
    createdBy = null,
    createdAt = null,
    updatedBy = null,
    updatedAt = null,
  }) {
    if (_id !== null) {
      this._id = _id;
    }
    this.label = label;
    this.streetAddress = streetAddress;
    this.locality = locality;
    this.region = region;
    this.postalCode = postalCode;
    this.country = country;
    this.latitude = latitude;
    this.longitude = longitude;
    this.locationType = locationType;
    this.note = note;
    this.rawData = rawData;
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
    if (this._id === null) {
      return false;
    }
    const session = driver.session();
    const query = `MATCH (n:Spatial) WHERE id(n)=${this._id} RETURN n`;
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result;
        if (records.length > 0) {
          const record = records[0].toObject();
          const outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
        return null;
      })
      .catch((error) => {
        console.log(error);
      });
    for (let key in node) {
      this[key] = node[key];
    }
    // relations
    const events = await helpers.loadRelations(this._id, 'Spatial', 'Event');
    const organisations = await helpers.loadRelations(
      this._id,
      'Spatial',
      'Organisation'
    );
    this.events = events;
    this.organisations = organisations;
  }

  async loadUnpopulated() {
    if (this._id === null) {
      return false;
    }
    const session = driver.session();
    const query = `MATCH (n:Spatial) WHERE id(n)=${this._id} RETURN n`;
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result;
        if (records.length > 0) {
          const record = records[0].toObject();
          const outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
        return null;
      })
      .catch((error) => {
        console.log(error);
      });
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
    let validateSpatial = this.validate();
    if (!validateSpatial.status) {
      return validateSpatial;
    } else {
      let session = driver.session();
      let query = '';
      let params = {};

      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
      } else {
        let original = new Spatial({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      if (typeof this._id === 'undefined' || this._id === null) {
        let nodeProperties = helpers.prepareNodeProperties(this);
        params = helpers.prepareParams(this);
        query = 'CREATE (n:Spatial ' + nodeProperties + ') RETURN n';
      } else {
        let update = '';
        let i = 0;
        for (let key in this) {
          if (i > 0) {
            update += ',';
          }
          if (typeof this[key] === 'string') {
            update += ' n.' + key + "='" + this[key] + "'";
          } else {
            update += ' n.' + key + '=' + this[key];
          }
          i++;
        }
        query =
          'MATCH (n:Spatial) WHERE id(n)=' +
          this._id +
          ' SET ' +
          update +
          ' RETURN n';
      }
      let resultPromise = await session
        .run(query, params)
        .then((result) => {
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
        })
        .catch((error) => {
          let output = { error: error, status: false, data: [] };
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
        error: ["You must remove the record's relations before deleting"],
        status: false,
        data: [],
      };
      return output;
    }
    let query = 'MATCH (n:Spatial) WHERE id(n)=' + this._id + ' DELETE n';
    let deleteRecord = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        return result;
      });
    return deleteRecord;
  }
}
/**
* @api {get} /spatials Get spatials
* @apiName get spatials
* @apiGroup Spatials
*
* @apiParam {_id} [_id] A unique _id.
* @apiParam {string} [label] A label to match against the spatials' label.
* @apiParam {string} [country] A country to match against the spatials' countries.
* @apiParam {string} [locationType] A locationType to match against the spatials' locationTypes.
* @apiParam {string} [orderField=label] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
*
* @apiExample {request} Example:
http://localhost:5100/api/spatials?page=1&limit=25
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"currentPage":1,"data":[{"note":"note","country":"count","updatedBy":"260","latitude":"lat","postalCode":"pc","locality":"loc","locationType":"type","label":"test","streetAddress":"address","_id":"2514","region":"reg","longitude":"lon","updatedAt":"2020-01-17T10:43:13.764Z","systemLabels":["Spatial"]}],"totalItems":"1","totalPages":1},"error":[],"msg":"Query results"}
*/
const getSpatials = async (req, resp) => {
  let parameters = req.query;
  let label = '';
  let country = '';
  let locationType = '';
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
    const newId = parameters._id.trim();
    queryParams = `id(n)=${newId} `;
  } else {
    if (typeof parameters.label !== 'undefined') {
      label = parameters.label.trim();
      if (label !== '') {
        queryParams += `toLower(n.label) =~ toLower('.*${label}.*') `;
      }
    }
    if (typeof parameters.country !== 'undefined') {
      country = parameters.country.trim();
      if (country !== '') {
        if (queryParams !== '') {
          queryParams += ' AND ';
        }
        queryParams += `n.country IS NOT NULL AND toLower(n.country) =~ toLower('.*${country}.*') `;
      }
    }
    if (typeof parameters.locationType !== 'undefined') {
      locationType = parameters.locationType.trim();
      if (locationType !== '') {
        if (queryParams !== '') {
          queryParams += ' AND ';
        }
        queryParams += `n.locationType IS NOT NULL AND toLower(n.locationType) =~ toLower('.*${locationType}.*') `;
      }
    }
    if (typeof parameters.orderField !== 'undefined') {
      orderField = parameters.orderField;
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
    'MATCH (n:Spatial) ' +
    queryParams +
    ' RETURN n ' +
    queryOrder +
    ' SKIP ' +
    skip +
    ' LIMIT ' +
    limit;

  let data = await getSpatialsQuery(query, queryParams, limit);
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

const getSpatialsQuery = async (query, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });
  let nodes = helpers.normalizeRecordsOutput(nodesPromise);
  let count = await session
    .writeTransaction((tx) =>
      tx.run('MATCH (n:Spatial) ' + queryParams + ' RETURN count(*)')
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
* @api {get} /spatial Get spatial
* @apiName get spatial
* @apiGroup Spatials
*
* @apiParam {string} _id The _id of the requested spatial
*
* @apiExample {request} Example:
http://localhost:5100/api/spatial?_id=2514
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"2514","label":"test","streetAddress":"address","locality":"loc","region":"reg","postalCode":"pc","country":"count","latitude":"lat","longitude":"lon","locationType":"type","note":"note","createdBy":null,"createdAt":null,"updatedBy":"260","updatedAt":"2020-01-17T10:43:13.764Z","events":[]},"error":[],"msg":"Query results"}
*/
const getSpatial = async (req, resp) => {
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
  let _id = null;
  if (typeof parameters._id !== 'undefined' && parameters._id !== '') {
    _id = parameters._id;
  }
  let query = { _id: _id };
  let spatial = new Spatial(query);
  await spatial.load();
  resp.json({
    status: true,
    data: spatial,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /spatial Put spatial
* @apiName put spatial
* @apiGroup Spatials
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the spatial. This should be undefined|null|blank in the creation of a new spatial.
* @apiParam {string} label The spatial's label.
* @apiParam {string} [streetAddress] The spatial's street address.
* @apiParam {string} [locality] The spatial's locality.
* @apiParam {string} [region] The spatial's region.
* @apiParam {string} [postalCode] The spatial's region.
* @apiParam {string} [country] The spatial's country.
* @apiParam {string} [latitude] The spatial's latitude.
* @apiParam {string} [longitude] The spatial's longitude.
* @apiParam {string} [locationType] The spatial's locationType.
* @apiParam {string} [note] The spatial's note.
* @apiParam {string} [rawData] The geonames raw data.
*
* @apiExample {json} Example:
 {"label":"test","streetAddress":"address","locality":"loc","region":"reg","postalCode":"pc","country":"count","latitude":"lat","longitude":"lon","locationType":"type","note":"note","_id":"2514"}
*
* @apiSuccessExample {json} Success-Response:
{"error":[],"status":true,"data":{"note":"note","country":"count","updatedBy":"260","latitude":"lat","postalCode":"pc","locality":"loc","locationType":"type","label":"test","streetAddress":"address","_id":"2514","region":"reg","updatedAt":"2020-01-17T11:23:02.934Z","longitude":"lon"}}

*/
const putSpatial = async (req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The spatial must not be empty',
    });
    return false;
  }
  let userId = req.decoded.id;
  let spatial = new Spatial(postData);
  let output = await spatial.save(userId);
  resp.json(output);
};

/**
* @api {delete} /spatial Delete spatial
* @apiName delete spatial
* @apiGroup Spatials
* @apiPermission admin
*
* @apiParam {string} _id The id of the spatial for deletion.
*
* @apiExample {request} Example:
http://localhost:5100/api/spatial?_id=2514
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Spatial) WHERE id(n)=2514 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":30,"high":0}}},"error":[],"msg":"Query results"}
*/
const deleteSpatial = async (req, resp) => {
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
  let spatial = new Spatial({ _id: parameters._id });
  let data = await spatial.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: 'Query results',
  });
};

module.exports = {
  Spatial: Spatial,
  getSpatials: getSpatials,
  getSpatial: getSpatial,
  putSpatial: putSpatial,
  deleteSpatial: deleteSpatial,
};
