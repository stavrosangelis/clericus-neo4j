const driver = require('../config/db-driver');
const helpers = require('../helpers');
const Canvas = require('canvas');
const fs = require('fs');
const mimeType = require('mime-types');
const { promisify } = require('util');
const formidable = require('formidable');
const personController = require('./person.ctrl');
const TaxonomyTerm = require('./taxonomyTerm.ctrl').TaxonomyTerm;
const referencesController = require('./references.ctrl');
const archivePath = process.env.ARCHIVEPATH;

class Resource {
  constructor({
    _id = null,
    label = null,
    alternateLabels = [],
    description = null,
    fileName = null,
    metadata = {},
    originalLocation = '',
    paths = [],
    resourceType = null,
    systemType = null,
    uploadedFile = null,
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
    this.label = label !== null ? label.toString() : label;
    this.alternateLabels = alternateLabels;
    this.description = description;
    this.fileName = fileName;
    this.metadata = metadata;
    this.originalLocation = originalLocation;
    this.paths = paths;
    this.resourceType = resourceType || 'image';
    this.systemType = systemType;
    this.uploadedFile = uploadedFile;
    this.status = status;
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
    /* if (this.fileName === '') {
      status = false;
      errors.push({ field: 'fileName', msg: 'The fileName must not be empty' });
    } */
    if (this.paths.length > 0) {
      let pI = 0;
      for (let key in this.paths) {
        let path = this.paths[key];
        if (path.path === '') {
          status = false;
          errors.push({
            field: 'path',
            msg: 'The path must not be empty for path ' + pI,
          });
        }
        if (path.pathType === '') {
          status = false;
          errors.push({
            field: 'pathType',
            msg: 'The pathType must not be empty for path ' + pI,
          });
        }
        pI++;
      }
      if (this.resourceType === '') {
        status = false;
        errors.push({
          field: 'resourceType',
          msg: 'The resourceType must not be empty',
        });
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
    const session = driver.session();
    const query = `MATCH (n:Resource) WHERE id(n)=${this._id} RETURN n`;
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
      if (key === 'paths' && node[key].length > 0) {
        let paths = [];
        for (let akey in node[key]) {
          let path = JSON.parse(node[key][akey]);
          paths.push(path);
        }
        this[key] = paths;
      }
      if (key === 'metadata') {
        let metadata = JSON.parse(node[key]);
        if (typeof metadata === 'string') {
          metadata = JSON.parse(metadata);
        }
        this.metadata = metadata;
      }
      if (key === 'alternateLabels' && node[key].length > 0) {
        let newAlternateLabels = [];
        for (let akey in node[key]) {
          let alternateLabel = JSON.parse(node[key][akey]);
          newAlternateLabels.push(alternateLabel);
        }
        this[key] = newAlternateLabels;
      }
    }

    // relations
    const events = await helpers.loadRelations(this._id, 'Resource', 'Event');
    const organisations = await helpers.loadRelations(
      this._id,
      'Resource',
      'Organisation'
    );
    const people = await helpers.loadRelations(this._id, 'Resource', 'Person');
    const resources = await helpers.loadRelations(
      this._id,
      'Resource',
      'Resource'
    );
    this.events = events;
    this.organisations = organisations;
    this.people = people;
    this.resources = resources;
  }

  async loadUnpopulated() {
    if (this._id === null) {
      return false;
    }
    const session = driver.session();
    const query = `MATCH (n:Resource) WHERE id(n)=${this._id} RETURN n`;
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
      if (key === 'paths' && node[key].length > 0) {
        let paths = [];
        for (let akey in node[key]) {
          let path = JSON.parse(node[key][akey]);
          paths.push(path);
        }
        this[key] = paths;
      }
      if (key === 'metadata') {
        let metadata = JSON.parse(node[key]);
        if (typeof metadata === 'string') {
          metadata = JSON.parse(metadata);
        }
        this.metadata = metadata;
      }
      if (key === 'alternateLabels' && node[key].length > 0) {
        let newAlternateLabels = [];
        for (let akey in node[key]) {
          let alternateLabel = JSON.parse(node[key][akey]);
          newAlternateLabels.push(alternateLabel);
        }
        this[key] = newAlternateLabels;
      }
    }
  }

  async save(userId) {
    let validateResource = this.validate();
    if (!validateResource.status) {
      return validateResource;
    } else {
      let session = driver.session();
      // turn json data to strings to store to the db
      let newPaths = [];
      if (this.paths.length > 0) {
        for (let key in this.paths) {
          let path = JSON.stringify(this.paths[key]);
          newPaths.push(path);
        }
      }
      let newAlternateLabels = [];
      if (this.alternateLabels.length > 0) {
        for (let key in this.alternateLabels) {
          let alternateLabel = JSON.stringify(this.alternateLabels[key]);
          newAlternateLabels.push(alternateLabel);
        }
      }
      this.paths = newPaths;
      this.metadata = JSON.stringify(this.metadata);
      this.alternateLabels = newAlternateLabels;

      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
      } else {
        let original = new Resource({ _id: this._id });
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
        query = 'CREATE (n:Resource ' + nodeProperties + ') RETURN n';
      } else {
        query =
          'MATCH (n:Resource) WHERE id(n)=' +
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
    // 1. load file to get details
    let resource = new Resource({ _id: this._id });
    await resource.load();

    // 2. delete files from disk
    for (let key in resource.paths) {
      const path = resource.paths[key];
      this.unlinkFile(archivePath + path.path);
    }

    // 3. delete relations
    let query1 =
      'MATCH (n:Resource)-[r]-() WHERE id(n)=' + this._id + ' DELETE r';
    await session
      .writeTransaction((tx) => tx.run(query1, {}))
      .then((result) => {
        return result;
      })
      .catch((error) => {
        console.log(error);
      });

    // 4. delete record
    let query = 'MATCH (n:Resource) WHERE id(n)=' + this._id + ' DELETE n';
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

  unlinkFile(path) {
    return new Promise((resolve) => {
      fs.unlink(path, (err) => {
        let output = {};
        if (err) {
          output.error = err;
          output.status = false;
        } else {
          output.status = true;
          output.message = 'File "' + path + '" deleted successfully';
        }
        resolve(output);
      });
    }).catch((error) => {
      return error;
    });
  }
}

/**
* @api {get} /resources Get resources
* @apiName get resources
* @apiGroup Resources
*
* @apiParam {_id} [_id] An unique _id.
* @apiParam {string} [label] A string to match against the resources' labels.
* @apiParam {string} [systemType] A system type id.
* @apiParam {string} [resourceType] A resource Type label.
* @apiParam {string} [description] A string to match against the peoples' description.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiParam {string} [orderField=firstName] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending
* @apiSuccessExample {json} Success-Response:
{
  "status": true,
  "data": {
    "currentPage": 1,
    "data": [{,…}, {"fileName": "1971.jpg",…}, {"fileName": "1972.jpg",…}, {"fileName": "1974.jpg",…}],
    "totalItems": "4",
    "totalPages": 1
  },
  "error": [],
  "msg": "Query results"
}
*/
const getResources = async (req, resp) => {
  let parameters = req.query;
  let label = '';
  let systemType = '';
  let resourceType = '';
  let status = '';
  let description = '';
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
    const eventId = parameters._id.trim();
    queryParams = `id(n)=${eventId} `;
  } else {
    if (typeof parameters.label !== 'undefined') {
      label = parameters.label.trim();
      if (label !== '') {
        queryParams = "toLower(n.label) =~ toLower('.*" + label + ".*') ";
      }
    }
    if (typeof parameters.systemType !== 'undefined') {
      systemType = parameters.systemType.trim();
      if (systemType !== '') {
        if (queryParams !== '') {
          queryParams += ' AND ';
        }
        queryParams += `n.systemType = '${systemType}' `;
      }
    }
    if (typeof parameters.resourceType !== 'undefined') {
      resourceType = parameters.resourceType.trim();
      if (resourceType !== '') {
        if (queryParams !== '') {
          queryParams += ' AND ';
        }
        queryParams += `toLower(n.resourceType) = toLower('${resourceType}') `;
      }
    }
    if (typeof parameters.description !== 'undefined') {
      description = parameters.description;
      if (description !== '') {
        if (queryParams !== '') {
          queryParams += ' AND ';
        }
        queryParams +=
          "toLower(n.description) =~ toLower('.*" + description + ".*') ";
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
    'MATCH (n:Resource) ' +
    queryParams +
    ' RETURN n ' +
    queryOrder +
    ' SKIP ' +
    skip +
    ' LIMIT ' +
    limit;

  let data = await getResourcesQuery(query, queryParams, limit);
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
      totalItems: parseInt(data.count, 10),
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

const getResourcesQuery = async (query, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });

  let nodes = helpers.normalizeRecordsOutput(nodesPromise, 'n');
  let nodesOutput = nodes.map((node) => {
    let nodeOutput = {};
    for (let key in node) {
      nodeOutput[key] = node[key];
      let paths = [];
      if (key === 'paths' && node[key].length > 0) {
        for (let akey in node[key]) {
          let path = JSON.parse(node[key][akey]);
          paths.push(path);
        }
        nodeOutput[key] = paths;
      }
    }
    return nodeOutput;
  });

  let count = await session
    .writeTransaction((tx) =>
      tx.run('MATCH (n:Resource) ' + queryParams + ' RETURN count(*)')
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
    nodes: nodesOutput,
    count: count,
    totalPages: totalPages,
  };
  return result;
};

/**
* @api {get} /resource Get resource
* @apiName get resource
* @apiGroup Resources
*
* @apiParam {string} _id The _id of the requested resource.
* @apiSuccessExample {json} Success-Response:
{
  "status": true,
  "data": {
    "_id": "389",
    "label": "1969-1970",
    "description": null,
    "fileName": "1969-1970.jpg",
    "metadata": {"image": {"default": {"height": 6464, "width": 4808, "extension": "jpg", "x": 0, "y": 0, "rotate": 0},…}},
    "paths": [{"path":"images/fullsize/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg","pathType":"source"},…],
    "resourceType": "image",
    "systemType": {"ref":"87"},
    "uploadedFile": null,
    "status": false,
    "createdBy": null,
    "createdAt": null,
    "updatedBy": null,
    "updatedAt": null,
    "events": [],
    "organisations": [],
    "people": [{"_id": "894", "term": {"label": "depicts", "role": "student", "roleLabel": "student"},…},…],
    "resources": [{"_id": "916", "term": {"label": "hasPart"}, "ref": {"fileName": "52.jpg",…}},…]
  },
  "error": [],
  "msg": "Query results"
}
*/
const getResource = async (req, resp) => {
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
  let resource = new Resource({ _id: _id });
  await resource.load();

  resp.json({
    status: true,
    data: resource,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /resource Put resource
* @apiName put resource
* @apiGroup Resources
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the resource. This should be undefined|null|blank in the creation of a new resource.
* @apiParam {string} label The label of the resource.
* @apiParam {string} [description] The description of the resource.
* @apiParam {string} [filename] The filename of the resource. This value is automatically extracted from the uploaded file during the <a href="#api-Resources-post_upload_resource">upload resource</a> step.
* @apiParam {string} [metadata] The metadata of the resource. This value is automatically extracted from the uploaded file during the <a href="#api-Resources-post_upload_resource">upload resource</a> step.
* @apiParam {string} [paths] The paths of the resource. This value is automatically extracted from the uploaded file during the <a href="#api-Resources-post_upload_resource">upload resource</a> step.
* @apiParam {string} [resourceType] The resourceType of the resource. This value is automatically extracted from the uploaded file during the <a href="#api-Resources-post_upload_resource">upload resource</a> step.
* @apiParam {string} [systemType] The systemType of the resource. The value is selected from the Resource system types taxonomy.
* @apiParam {file} [uploadedFile] The uploadedFile of the resource. This should be undefined|null|blank in the creation/update of a resource.
* @apiParam {string} [status='private'] The status of the resource.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"error":[],"status":true,"data":{"fileName":"logo-transparent.png","metadata":"{\"image\":{\"default\":{\"height\":275,\"width\":269,\"extension\":\"png\",\"x\":0,\"y\":0,\"rotate\":0}}}","updatedBy":"260","paths":["{\"path\":\"images/fullsize/9e57922b92487c30424595d16df57b8f.png\",\"pathType\":\"source\"}","{\"path\":\"images/thumbnails/9e57922b92487c30424595d16df57b8f.png\",\"pathType\":\"thumbnail\"}"],"systemType":"{\"ref\":\"295\"}","description":"","_id":"2069","label":"logo-transparent.png","updatedAt":"2020-01-14T16:30:00.338Z","resourceType":"image","status":false}},"error":[],"msg":"Query results"}
*/
const putResource = async (req, resp) => {
  let postData = req.body;
  if (postData === null || Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The resource must not be empty',
    });
    return false;
  }
  const { resource: resourceData } = postData;

  const { id: userId } = req.decoded;
  const resource = new Resource(resourceData);
  const data = await resource.save(userId);
  resp.json({
    status: true,
    data,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {delete} /resource Delete resource
* @apiName delete resource
* @apiGroup Resources
* @apiPermission admin
*
* @apiParam {string} _id The id of the resource for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Resource) WHERE id(n)=2069 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":11,"high":0}}},"error":[],"msg":"Query results"}*/
const deleteResource = async (req, resp) => {
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
  const resource = new Resource({ _id });
  const { data = null, error = [], status = true } = await resource.delete();
  return resp.status(200).json({
    status,
    data,
    error,
    msg: '',
  });
};

/**
* @api {delete} /resources Delete resources
* @apiName delete resources
* @apiGroup Resources
* @apiPermission admin
*
* @apiParam {array} _ids The ids of the resources for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":[{"records":[],"summary":{"statement":{"text":"MATCH (n:Resource) WHERE id(n)=2404 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":5,"high":0}}}],"error":[],"msg":"Query results"}
*/
const deleteResources = async (req, resp) => {
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
    let resource = new Resource({ _id: _id });
    responseData.push(await resource.delete());
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
    let query = `MATCH (n:Resource) WHERE id(n)=${_id} SET n.status="${postData.status}", n.updatedBy="${updatedBy}", n.updatedAt="${updatedAt}"`;
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

/**
* @api {post} /upload-resource Upload resource
* @apiName post upload resource
* @apiGroup Resources
* @apiPermission admin
* @apiDescription This is a file upload, the parameters should be posted as FormData (<a href="https://developer.mozilla.org/en-US/docs/Web/API/FormData" target="_blank">https://developer.mozilla.org/en-US/docs/Web/API/FormData</a>)
*
* @apiParam {file} file The file to be uploaded.
* @apiParam {string} [_id] The resource _id.
* @apiParam {string} [label] The resource label. If none is provided the file name is used instead.
* @apiParam {string} [systemType] The resource systemType.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"fileName":"logo-transparent.png","metadata":"{\"image\":{\"default\":{\"height\":275,\"width\":269,\"extension\":\"png\",\"x\":0,\"y\":0,\"rotate\":0}}}","paths":["{\"path\":\"images/fullsize/9e57922b92487c30424595d16df57b8f.png\",\"pathType\":\"source\"}","{\"path\":\"images/thumbnails/9e57922b92487c30424595d16df57b8f.png\",\"pathType\":\"thumbnail\"}"],"systemType":"{\"ref\":\"295\"}","label":"logo-transparent.png","resourceType":"image","status":false,"_id":"2069"},"error":[],"msg":""}
*/
const uploadResource = async (req, resp) => {
  let data = await parseFormDataPromise(req);
  if (Object.keys(data.file).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The uploaded file must not be empty',
    });
    return false;
  }
  let uploadedFile = data.file.file;
  let fields = data.fields;
  let newId = null;
  let newLabel = uploadedFile.name;
  let systemType = null;
  if (
    typeof fields._id !== 'undefined' &&
    fields._id !== null &&
    fields._id !== 'null'
  ) {
    newId = fields._id;
  }
  if (typeof fields.label !== 'undefined' && fields.label !== null) {
    newLabel = fields.label;
  }
  if (typeof fields.systemType !== 'undefined' && fields.systemType !== null) {
    systemType = fields.systemType;
  }
  let extension = mimeType.extension(uploadedFile.type);
  if (extension === 'jpeg') {
    extension = 'jpg';
  }
  let allowedExtensions = ['jpg', 'png', 'gif', 'pdf'];
  if (allowedExtensions.indexOf(extension) === -1) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: [`The file extension "${extension}" is not allowed.`],
    });
    return false;
  }
  let hashedName = helpers.hashFileName(uploadedFile.name) + '.' + extension;

  // 1. upload file
  let newUploadFile = await uploadFile(uploadedFile, hashedName, extension);
  // 2. if image create thumbnail
  let fileType0 = uploadedFile.type.split('/')[0];
  let fileType1 = uploadedFile.type.split('/')[1];
  let thumbnailPath = '';
  if (fileType0 === 'image' && newUploadFile.status) {
    let newWidth = null;
    let newHeight = null;
    let newDimensions = null;
    if (newDimensions !== null) {
      if (
        typeof newDimensions.width !== 'undefined' &&
        newDimensions.width !== ''
      ) {
        newWidth = newDimensions.width;
      }
      if (
        typeof newDimensions.height !== 'undefined' &&
        newDimensions.height !== ''
      ) {
        newHeight = newDimensions.height;
      }
    }
    let srcPath = newUploadFile.path;
    thumbnailPath = archivePath + 'images/thumbnails/' + hashedName;

    await createThumbnail(
      srcPath,
      thumbnailPath,
      hashedName,
      newWidth,
      newHeight
    );
  }
  // 3. insert/update resource
  const parseResourceDetailsPromise = await parseResourceDetails(
    fileType0,
    fileType1,
    uploadedFile,
    newUploadFile,
    hashedName
  );
  let newResourceData = {};
  if (newId !== null) {
    newResourceData._id = newId;
  }
  if (systemType !== null) {
    newResourceData.systemType = systemType;
  }
  for (var key in parseResourceDetailsPromise) {
    if (parseResourceDetailsPromise[key] !== null) {
      newResourceData[key] = parseResourceDetailsPromise[key];
    }
  }
  if (newLabel !== null) {
    newResourceData.label = newLabel;
  }
  let userId = req.decoded.id;
  let newResource = new Resource(newResourceData);
  let updateResource = await newResource.save(userId);
  let status = true;
  if (
    typeof updateResource.status !== 'undefined' &&
    updateResource.status === false
  ) {
    // if file save failed delete uploaded file and thumbnail
    newResource.unlinkFile(newUploadFile.path);
    newResource.unlinkFile(thumbnailPath);
    status = false;
  }
  let error = false;
  let msg = [];
  if (
    typeof updateResource.error !== 'undefined' &&
    updateResource.error.length > 0
  ) {
    msg.push(updateResource.error);
    error = true;
  }
  let output = {
    status: status,
    data: updateResource.data,
    error: error,
    msg: msg,
  };
  resp.json(output);
};

const parseFormDataPromise = (req) => {
  return new Promise((resolve) => {
    new formidable.IncomingForm().parse(req, (err, fields, files) => {
      if (err) {
        console.error('Error', err);
        throw err;
      }
      let output = {};
      output.fields = fields;
      output.file = files;
      resolve(output);
    });
  });
};

const uploadFile = async (
  uploadedFile = null,
  hashedName = '',
  extension = null
) => {
  if (uploadedFile === null || (hashedName === '' && extension !== null)) {
    return false;
  }
  // patch for the case when the archive path is in a different drive
  let tempPath = archivePath + 'temp/' + hashedName;
  await fs.copyFileSync(uploadedFile.path, tempPath);
  uploadedFile.path = tempPath;

  let sourcePath = uploadedFile.path;
  let targetPath = '';
  if (extension !== 'pdf') {
    targetPath = archivePath + 'images/fullsize/' + hashedName;
  } else {
    targetPath = archivePath + 'documents/' + hashedName;
  }
  let uploadFilePromise = await new Promise((resolve) => {
    fs.rename(sourcePath, targetPath, function (error) {
      let output = {};
      if (error) {
        output.status = false;
        output.msg = error;
      } else {
        output.status = true;
        output.msg = 'File ' + uploadedFile.name + ' uploaded successfully';
        output.path = targetPath;
        output.fileName = hashedName;
      }
      resolve(output);
    });
  });
  return uploadFilePromise;
};

const createThumbnail = async (
  srcPath = null,
  targetPath = null,
  fileName = null,
  customWidth = null,
  customHeight = null
) => {
  if (srcPath === null || targetPath === null) {
    return false;
  }
  const readFile = promisify(fs.readFile);
  const imageSrc = await readFile(srcPath).catch((error) => {
    console.log(error);
  });
  await new Promise((resolve) => {
    const Image = Canvas.Image;
    const img = new Image();
    let output = {};
    let errors = [];
    img.src = imageSrc;

    img.onerror = function (err) {
      errors.push(err);
    };
    // calculate new dimensions
    let oldWidth = img.width;
    let oldHeight = img.height;
    let aspectRatio = oldWidth / oldHeight;
    let newWidth = 600;
    let newHeight = 600;
    if (oldWidth > oldHeight) {
      newHeight = newWidth / aspectRatio;
    } else {
      newWidth = newHeight * aspectRatio;
    }

    if (customWidth !== null) {
      newWidth = customWidth;
      newHeight = newWidth / aspectRatio;
    } else if (customHeight !== null) {
      newHeight = customHeight;
      newWidth = newHeight * aspectRatio;
    }

    newWidth = parseInt(newWidth, 10);
    newHeight = parseInt(newHeight, 10);

    if (newWidth > 0 && newHeight > 0) {
      var canvas = Canvas.createCanvas(newWidth, newHeight);
      var ctx = canvas.getContext('2d');
      // ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      var out = fs.createWriteStream(targetPath);
      var stream = canvas.createJPEGStream({
        bufsize: 2048,
        quality: 80,
      });

      stream.pipe(out);
      out.on('finish', function () {
        output.status = true;
        output.msg = fileName + ' resized successfully';
        output.errors = errors;
        resolve(output);
      });
    } else {
      output.status = false;
      output.msg = fileName + ' failed to resize';
      output.errors = errors;
      resolve(output);
    }
  }).catch(function (error) {
    console.log(error);
  });
};

const parseResourceDetails = async (
  fileType0,
  fileType1,
  uploadedFile,
  newUploadFile,
  hashedName
) => {
  let newResourceData = {};
  if (fileType0 === 'image') {
    const { path: newFilePath } = newUploadFile;
    const imageDefault = await helpers.imgDimensions(newFilePath);
    imageDefault.x = 0;
    imageDefault.y = 0;
    imageDefault.rotate = 0;
    const imageExif = await helpers.imageExif(newFilePath);
    const imageIptc = await helpers.imageIptc(newFilePath);
    const newLabel = uploadedFile.name.replace(/\.[^/.]+$/, '');
    const newResourceImageMetadata = {};
    if (imageDefault !== null) {
      newResourceImageMetadata.default = imageDefault;
    }
    if (imageExif !== null) {
      newResourceImageMetadata.exif = JSON.stringify(imageExif);
    }
    if (imageIptc !== null && imageIptc.length > 0 && imageIptc[0] !== false) {
      newResourceImageMetadata.iptc = JSON.stringify(imageIptc);
    }
    newResourceData = {
      label: newLabel,
      fileName: uploadedFile.name,
      hashedName: hashedName,
      metadata: {
        image: newResourceImageMetadata,
      },
      paths: [
        { path: 'images/fullsize/' + hashedName, pathType: 'source' },
        { path: 'images/thumbnails/' + hashedName, pathType: 'thumbnail' },
      ],
      resourceType: 'image',
    };
  } else if (fileType1 === 'pdf') {
    const newLabel = uploadedFile.name.replace(/\.[^/.]+$/, '');
    newResourceData = {
      label: newLabel,
      fileName: uploadedFile.name,
      hashedName: hashedName,
      metadata: null,
      paths: [{ path: 'documents/' + hashedName, pathType: 'source' }],
      resourceType: 'document',
    };
  }
  return newResourceData;
};

/**
* @api {delete} /resource Delete classpiece
* @apiName delete classpiece
* @apiGroup Resources
* @apiPermission admin
*
* @apiParam {string} _id The id of the classpiece for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Resource) WHERE id(n)=2069 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":11,"high":0}}},"error":[],"msg":"Query results"}*/
const deleteClasspiece = async (req, resp) => {
  const { query: parameters } = req;
  const { _id = '' } = parameters;
  if (_id === '') {
    return resp.status(400).json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
  }

  // 1. load classpiece and all related people and thumbnails
  const resource = new Resource({ _id });
  await resource.load();
  // 2. delete related people
  let peopleResponse = [];
  let people = resource.people;
  let peopleLength = people.length;
  for (let p = 0; p < peopleLength; p++) {
    let person = people[p];
    let personId = person.ref._id;
    let newPerson = new personController.Person({ _id: personId });
    let deletePerson = await newPerson.delete();
    let deleteSuccess = deletePerson.summary.counters._stats.nodesDeleted;
    if (deleteSuccess === 1) {
      peopleResponse.push(
        `Person with _id "${newPerson._id}" deleted successfully.`
      );
    } else {
      peopleResponse.push(
        `Person with _id "${newPerson._id}" failed to delete.`
      );
    }
  }
  // 3. delete related thumbnails
  let thumbnailsResponse = [];
  let thumbnails = resource.resources;
  let thumbnailsLength = thumbnails.length;
  for (let t = 0; t < thumbnailsLength; t++) {
    let thumbnail = thumbnails[t];
    let thumbnailId = thumbnail.ref._id;
    let newThumbnail = new Resource({ _id: thumbnailId });
    let deleteThumbnail = await newThumbnail.delete();
    let deleteSuccess = deleteThumbnail.summary.counters._stats.nodesDeleted;
    if (deleteSuccess === 1) {
      thumbnailsResponse.push(
        `Resource with _id "${newThumbnail._id}" deleted successfully.`
      );
    } else {
      thumbnailsResponse.push(
        `Resource with _id "${newThumbnail._id}" failed to delete.`
      );
    }
  }
  // 4. delete classpiece
  const deletedResource = await resource.delete();
  let deleteResourceSuccess =
    deletedResource.summary.counters._stats.nodesDeleted;
  let deleteResourceResponse = `Classpiece with label "${resource.label}" and _id "${resource._id}" deleted successfully.`;
  if (deleteResourceSuccess !== 1) {
    deleteResourceResponse = `Classpiece with label "${resource.label}" and _id "${resource._id}" failed to delete.`;
  }
  let data = {
    classpiece: deleteResourceResponse,
    people: peopleResponse,
    resources: thumbnailsResponse,
  };
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: 'Query results',
  });
};

const updateAnnotationImage = async (req, resp) => {
  const { body: postData } = req;
  if (Object.keys(postData).length === 0) {
    return resp.status(400).json({
      status: false,
      data: [],
      error: true,
      msg: ['Please provide the appropriate post data'],
    });
  }
  const { itemId: resourceId, sourceId } = postData;

  // resource
  const resource = new Resource({ _id: resourceId });
  await resource.load();
  const { default: resourceMeta } = resource.metadata.image;
  const {
    extension,
    height: rHeight = 100,
    rotate = 0,
    width: rWidth = 100,
    x = 0,
    y = 0,
  } = resourceMeta;
  let width = rWidth;
  let height = rHeight;
  const { paths: resourcePaths = [] } = resource;
  let resourceThumbnailPath = '';
  let resourceImagePath = '';
  let hashedName = '';

  if (resourcePaths.length > 0) {
    let resourcePath = resourcePaths.find((p) => {
      let path = { ...p };
      if (typeof p === 'string') {
        path = JSON.parse(path);
      }
      if (typeof path === 'string') {
        path = JSON.parse(path);
      }
      if (path.pathType === 'source') {
        return true;
      }
    });
    if (typeof resourcePath === 'string') {
      resourcePath = JSON.parse(resourcePath);
    }
    if (typeof resourcePath === 'string') {
      resourcePath = JSON.parse(resourcePath);
    }
    resourceImagePath = resourcePath.path;
    let resourceThumbPath = resourcePaths.find((p) => {
      let path = p;
      if (typeof p === 'string') {
        path = JSON.parse(path);
      }
      if (typeof path === 'string') {
        path = JSON.parse(path);
      }
      if (path.pathType === 'thumbnail') {
        return true;
      }
    });
    if (typeof resourceThumbPath === 'string') {
      resourceThumbPath = JSON.parse(resourceThumbPath);
    }
    if (typeof resourceThumbPath === 'string') {
      resourceThumbPath = JSON.parse(resourceThumbPath);
    }
    resourceThumbnailPath = resourceThumbPath.path;
  } else {
    hashedName = helpers.hashFileName(resource.label) + '.' + extension;
    resourceThumbnailPath = `images/thumbnails/${hashedName}`;
    resourceImagePath = `images/fullsize/${hashedName}`;
  }
  // source
  const source = new Resource({ _id: sourceId });
  await source.load();
  let sourcePaths = source.paths;
  let sourcePath = sourcePaths.find((p) => {
    let path = p;
    if (typeof p === 'string') {
      path = JSON.parse(path);
    }
    if (typeof path === 'string') {
      path = JSON.parse(path);
    }
    if (path.pathType === 'source') {
      return true;
    }
  });
  if (typeof sourcePath === 'string') {
    sourcePath = JSON.parse(sourcePath);
  }
  if (typeof sourcePath === 'string') {
    sourcePath = JSON.parse(sourcePath);
  }
  // / create/update cropped image
  const readFile = promisify(fs.readFile);
  const image = await readFile(archivePath + sourcePath.path);
  let outputDir = archivePath + resourceImagePath;
  await new Promise((resolve) => {
    const Image = Canvas.Image;
    // Open the original image into a canvas
    const img = new Image();
    img.src = image;
    if (width < 0) {
      width = Math.abs(width);
    }
    if (height < 0) {
      height = Math.abs(height);
    }
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (rotate !== 0) {
      const rotateDegrees = rotate;
      const radians = degreesToRadians(rotateDegrees);
      const cx = x + width * 0.5;
      const cy = y + height * 0.5;
      const newCoordinates = rotateCoordinates(
        cx,
        cy,
        x,
        y,
        radians,
        width,
        height,
        rotateDegrees
      );
      const {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      } = newCoordinates;

      canvas.width = width;
      canvas.height = height;

      let left = width - newWidth - 12;
      let top = width - newWidth - 5;
      if (rotateDegrees < 180) {
        top = 0;
      } else {
        left = 0;
      }
      ctx.rotate(radians);
      ctx.drawImage(
        img,
        newX,
        newY,
        newWidth,
        newHeight,
        left,
        top,
        newWidth,
        newHeight
      );
    } else {
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
    }
    const out = fs.createWriteStream(outputDir);
    const stream = canvas.createJPEGStream({
      bufsize: 2048,
      quality: 90,
    });
    stream.pipe(out);
    out.on('finish', () => {
      // console.log('File created successfully');
      resolve('success');
    });
  }).catch(function (error) {
    console.log(error);
  });
  // update thumbnail
  await createThumbnail(
    outputDir,
    archivePath + resourceThumbnailPath,
    hashedName,
    width,
    height
  );
  // add paths to resource
  if (resourcePaths.length === 0) {
    resource.paths = [
      { path: resourceImagePath, pathType: 'source' },
      { path: resourceThumbnailPath, pathType: 'thumbnail' },
    ];
    const { id: userId } = req.decoded;
    await resource.save(userId);
  }

  const classpieceThumbnailTaxonomyTerm = new TaxonomyTerm({
    labelId: 'hasPart',
  });
  await classpieceThumbnailTaxonomyTerm.load();

  const classpieceThumbnailReference = {
    items: [
      { _id: sourceId, type: 'Resource' },
      { _id: resourceId, type: 'Resource' },
    ],
    taxonomyTermId: classpieceThumbnailTaxonomyTerm._id,
  };

  await referencesController.updateReference(classpieceThumbnailReference);

  return resp.status(200).json({
    status: true,
    data: resource,
    error: [],
    msg: 'Query results',
  });
};

const degreesToRadians = (degrees) => {
  let radians = 0;
  if (degrees > 0) {
    radians = (degrees * Math.PI) / 180;
  } else {
    radians = (degrees * Math.PI) / 180;
  }
  return -radians;
};

const rotateCoordinates = (
  cx,
  cy,
  x,
  y,
  radians,
  width,
  height,
  rotateDegrees
) => {
  let cos = Math.cos(radians);
  let sin = Math.sin(radians);
  let newCoordinates = {};
  let nx = cos * (x - cx) + sin * (y - cy) + cx;
  let ny = cos * (y - cy) + sin * (x - cx) + cy;
  let newWidth = height * sin + width * cos;
  let newHeight = height * cos + width * sin;
  if (rotateDegrees < 180) {
    nx = cos * (x - cx) - sin * (y - cy) + cx;
    ny = cos * (y - cy) - sin * (x - cx) + cy;
    newWidth = height * sin - width * cos;
    newHeight = height * cos - width * sin;
  }
  newCoordinates.width = Math.abs(newWidth);
  newCoordinates.height = Math.abs(newHeight);
  newCoordinates.x = nx;
  newCoordinates.y = ny;
  return newCoordinates;
};

const classpieceCompiledEvent = async (req, resp) => {
  let userId = req.decoded.id;
  let classpieceSystemType = new TaxonomyTerm({ labelId: 'Classpiece' });
  await classpieceSystemType.load();

  let systemType = classpieceSystemType._id;
  let query = `MATCH (n:Resource) WHERE n.systemType="${systemType}"  RETURN n ORDER BY n.label`;
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });

  let wasCompiledTerm = new TaxonomyTerm({ labelId: 'wasCompiled' });
  await wasCompiledTerm.load();
  let hasTimeTerm = new TaxonomyTerm({ labelId: 'hasTime' });
  await hasTimeTerm.load();
  let compilationTerm = new TaxonomyTerm({ labelId: 'Compilation' });
  await compilationTerm.load();

  const parseLabelStart = (value) => {
    let output = '01-01-' + value;
    return output;
  };
  const parseLabelEnd = (start, value = null) => {
    if (value !== null && value.length < 4) {
      let end = 4 - value.length;
      let pre = start.substring(0, end);
      value = pre + value;
    } else if (value !== null && value.length > 4) {
      value = start;
    }
    let output = '31-12-' + value;
    return output;
  };

  const parseLabel = (label) => {
    let labelStart = '';
    let labelEnd = '';
    if (label.includes('-')) {
      let newLabel = label.replace(/\(.\)/g, '');
      let labelArr = newLabel.split('-');
      labelStart = parseLabelStart(labelArr[0]);
      labelEnd = parseLabelEnd(labelArr[0], labelArr[1]);
    } else {
      labelStart = parseLabelStart(label);
      labelEnd = parseLabelEnd(label);
    }
    let dateRange = { start: labelStart, end: labelEnd };
    return dateRange;
  };

  const addNewEvent = async (label, type, userId) => {
    let session = driver.session();
    let now = new Date().toISOString();
    let eventData = {
      label: label,
      eventType: type,
      status: 'private',
      createdBy: userId,
      createdAt: now,
      updatedBy: userId,
      updatedAt: now,
    };
    let nodeProperties = helpers.prepareNodeProperties(eventData);
    let params = helpers.prepareParams(eventData);
    let query = `CREATE (n:Event ${nodeProperties}) RETURN n`;
    let item = await session
      .writeTransaction((tx) => tx.run(query, params))
      .then((result) => {
        session.close();
        let records = result.records;
        let outputRecord = null;
        if (records.length > 0) {
          let record = records[0].toObject();
          outputRecord = helpers.outputRecord(record.n);
        }
        return outputRecord;
      })
      .catch((error) => {
        console.log(error);
      });
    return item;
  };

  const addDate = async (startDate, endDate, userId) => {
    let session = driver.session();
    let query = `MATCH (n:Temporal) WHERE n.startDate="${startDate}" AND n.endDate="${endDate}" RETURN n`;
    let temporal = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        let records = result.records;
        let outputRecord = null;
        if (records.length > 0) {
          let record = records[0].toObject();
          outputRecord = helpers.outputRecord(record.n);
        }
        return outputRecord;
      })
      .catch((error) => {
        console.log(error);
      });
    if (temporal === null) {
      let now = new Date().toISOString();
      let label = startDate;
      if (endDate !== null) {
        label += ` - ${endDate}`;
      }
      let newItem = {
        label: label,
        startDate: startDate,
        endDate: endDate,
        createdBy: userId,
        createdAt: now,
        updatedBy: userId,
        updatedAt: now,
      };
      let nodeProperties = helpers.prepareNodeProperties(newItem);
      let params = helpers.prepareParams(newItem);
      let query = `CREATE (n:Temporal ${nodeProperties}) RETURN n`;
      temporal = await session
        .writeTransaction((tx) => tx.run(query, params))
        .then((result) => {
          session.close();
          let records = result.records;
          let outputRecord = null;
          if (records.length > 0) {
            let record = records[0].toObject();
            outputRecord = helpers.outputRecord(record.n);
          }
          return outputRecord;
        })
        .catch((error) => {
          console.log(error);
        });
    } else {
      session.close();
    }
    return temporal;
  };

  let output = [];
  let classpieces = helpers.normalizeRecordsOutput(nodesPromise, 'n');
  for (let i = 0; i < classpieces.length; i++) {
    let classpiece = classpieces[i];
    let dateRange = parseLabel(classpiece.label);
    let compilationEvent = await addNewEvent(
      `Classpiece ${classpiece.label} compilation`,
      compilationTerm._id,
      userId
    );
    let compilationReference = {
      items: [
        { _id: compilationEvent._id, type: 'Event' },
        { _id: classpiece._id, type: 'Resource' },
      ],
      taxonomyTermId: wasCompiledTerm._id,
    };
    await referencesController.updateReference(compilationReference);

    let compilationDate = await addDate(dateRange.start, dateRange.end, userId);
    let compilationEventDateReference = {
      items: [
        { _id: compilationEvent._id, type: 'Event' },
        { _id: compilationDate._id, type: 'Temporal' },
      ],
      taxonomyTermId: hasTimeTerm._id,
    };
    await referencesController.updateReference(compilationEventDateReference);
    output.push({
      label: classpiece.label,
      dateRange: dateRange,
      event: compilationEvent,
      eventReference: compilationReference,
      compilationDate: compilationDate,
      compilationEventDateReference: compilationEventDateReference,
    });
  }

  resp.json({
    status: true,
    data: output,
    error: false,
    msg: [],
  });
};

module.exports = {
  Resource,
  getResources,
  getResource,
  putResource,
  uploadResource,
  deleteResource,
  deleteResources,
  deleteClasspiece,
  updateAnnotationImage,
  updateStatus,
  classpieceCompiledEvent,
};
