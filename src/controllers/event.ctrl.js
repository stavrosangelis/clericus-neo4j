const driver = require('../config/db-driver');
const helpers = require('../helpers');

class Event {
  constructor({
    _id = null,
    label = null,
    description = null,
    eventType = null,
    status = 'private',
    createdBy = null,
    createdAt = null,
    updatedBy = null,
    updatedAt = null,
  }) {
    if (_id !== null) {
      this._id = _id;
    }
    this.label = label;
    this.description = description;
    this.eventType = eventType;
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
    const query = `MATCH (n:Event) WHERE id(n)=${this._id} RETURN n`;
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result || [];
        if (records.length > 0) {
          const record = records[0].toObject();
          const outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
      });
    // assign results to class values
    for (let key in node) {
      this[key] = node[key];
    }

    // relations
    const events = await helpers.loadRelations(this._id, 'Event', 'Event');
    const organisations = await helpers.loadRelations(
      this._id,
      'Event',
      'Organisation'
    );
    const people = await helpers.loadRelations(this._id, 'Event', 'Person');
    const resources = await helpers.loadRelations(
      this._id,
      'Event',
      'Resource'
    );
    const temporal = await helpers.loadRelations(this._id, 'Event', 'Temporal');
    const spatial = await helpers.loadRelations(this._id, 'Event', 'Spatial');
    this.events = events;
    this.organisations = organisations;
    this.people = people;
    this.resources = resources;
    this.temporal = temporal;
    this.spatial = spatial;
  }

  async loadUnpopulated() {
    if (this._id === null) {
      return false;
    }
    const session = driver.session();
    const query = `MATCH (n:Event) WHERE id(n)=${this._id} RETURN n`;
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result || [];
        if (records.length > 0) {
          const record = records[0].toObject();
          const outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
      });
    // assign results to class values
    for (let key in node) {
      this[key] = node[key];
    }
  }

  async save(userId) {
    let validateEvent = this.validate();
    if (!validateEvent.status) {
      return validateEvent;
    } else {
      let session = driver.session();
      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
      } else {
        let original = new Event({ _id: this._id });
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
        query = 'CREATE (n:Event ' + nodeProperties + ') RETURN n';
      } else {
        query =
          'MATCH (n:Event) WHERE id(n)=' +
          this._id +
          ' SET n=' +
          nodeProperties +
          ' RETURN n';
      }
      let updateResult = await session.run(query, params).then((result) => {
        session.close();
        let output = {
          error: ['The record cannot be updated'],
          status: false,
          data: [],
        };
        let records = result.records;
        if (records.length > 0) {
          let record = records[0];
          let key = record.keys[0];
          let resultRecord = record.toObject()[key];
          resultRecord = helpers.outputRecord(resultRecord);
          output = { error: [], status: true, data: resultRecord };
        }
        return output;
      });
      return updateResult;
    }
  }

  async delete() {
    let session = driver.session();
    // 1. delete relations
    let query1 = 'MATCH (n:Event)-[r]-() WHERE id(n)=' + this._id + ' DELETE r';
    await session
      .writeTransaction((tx) => tx.run(query1, {}))
      .then((result) => {
        return result;
      })
      .catch((error) => {
        console.log(error);
      });
    // 2. delete node
    let query = 'MATCH (n:Event) WHERE id(n)=' + this._id + ' DELETE n';
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
* @api {get} /events Get events
* @apiName get events
* @apiGroup Events
*
* @apiParam {_id} [_id] An event unique _id.
* @apiParam {string} [label] A string to match against the events labels.
* @apiParam {eventType} [eventType] An eventType _id .
* @apiParam {string} [temporal] A temporal value.
* @apiParam {string} [spatial] A spatial label.
* @apiParam {string} [orderField=firstName] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
*
* @apiExample {request} Example:
* http://localhost:5100/api/events?label=test&page=1&limit=25
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"currentPage":1,"data":[{"createdAt":"2020-01-14T14:48:31.753Z","updatedBy":"260","createdBy":"260","description":"test event description","label":"Test event","eventType":"293","updatedAt":"2020-01-14T14:48:31.753Z","_id":"2255","systemLabels":["Event"]}],"totalItems":"1","totalPages":1},"error":[],"msg":"Query results"}
*/
const getEvents = async (req, resp) => {
  let parameters = req.query;
  let label = '';
  let temporal = '';
  let spatial = '';
  let eventType = '';
  let page = 0;
  let orderField = 'label';
  let status = '';
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
      label = parameters.label;
      if (label !== '') {
        queryParams = `toLower(n.label) =~ toLower('.*${label}.*') `;
      }
    }
    if (typeof parameters.temporal !== 'undefined') {
      temporal = parameters.temporal;
    }
    if (typeof parameters.spatial !== 'undefined') {
      spatial = parameters.spatial;
    }
    if (typeof parameters.eventType !== 'undefined') {
      eventType = parameters.eventType;
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      if (eventType !== '') {
        queryParams += `n.eventType= "${eventType}" `;
      }
    }
    if (typeof parameters.orderField !== 'undefined') {
      orderField = parameters.orderField;
    }
    if (orderField !== '') {
      queryOrder = `ORDER BY n.${orderField}`;
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
        queryParams += `n.status='${status}'`;
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
    if (temporal === '' && spatial === '') {
      queryParams = `WHERE ${queryParams}`;
    }
  }

  query = `MATCH (n:Event) ${queryParams} RETURN DISTINCT n ${queryOrder} SKIP ${skip} LIMIT ${limit}`;
  if (temporal !== '' || spatial !== '') {
    let newQueryParams = queryParams;
    if (newQueryParams !== '') {
      newQueryParams = `AND ${newQueryParams}`;
    }
    let matchTemporal = '';
    let queryTemporalParams = '';
    let matchSpatial = '';
    let querySpatialParams = '';
    if (temporal !== '') {
      matchTemporal = '(n:Event)-[r1]->(t:Temporal)';
      queryTemporalParams = `t.startDate=~'${temporal}'`;
    }
    if (spatial !== '') {
      if (temporal !== '') {
        matchSpatial = ',';
      }
      matchSpatial += '(n:Event)-[r2]->(s:Spatial)';
      if (queryTemporalParams !== '') {
        querySpatialParams = 'AND ';
      }
      querySpatialParams += `toLower(s.label)=~toLower('.*${spatial}.*')`;
    }
    query = `MATCH ${matchTemporal} ${matchSpatial} WHERE ${queryTemporalParams} ${querySpatialParams} ${newQueryParams} RETURN DISTINCT n ${queryOrder} SKIP ${skip} LIMIT ${limit}`;
  }

  let data = await getEventsQuery(query, queryParams, limit);
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

const getEventsQuery = async (query, queryParams, limit) => {
  const session = driver.session();
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });

  const nodes = [];
  const nodesOutput = helpers.normalizeRecordsOutput(nodesPromise);
  for (let i = 0; i < nodesOutput.length; i++) {
    let node = nodesOutput[i];
    let temporal = await helpers.loadRelations(node._id, 'Event', 'Temporal');
    let spatial = await helpers.loadRelations(node._id, 'Event', 'Spatial');
    node.temporal = temporal;
    node.spatial = spatial;
    nodes.push(node);
  }
  let queryCount = query.substring(0, query.indexOf('RETURN DISTINCT n'));
  queryCount = queryCount + ' RETURN count(*)';
  const count = await session
    .writeTransaction((tx) => tx.run(queryCount))
    .then((result) => {
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['count(*)'];
      return output;
    });
  const totalPages = Math.ceil(count / limit);
  const result = {
    nodes: nodes,
    count: count,
    totalPages: totalPages,
  };
  session.close();
  return result;
};

/**
* @api {get} /event Get event
* @apiName get event
* @apiGroup Events
*
* @apiExample {request} Example:
* http://localhost:5100/api/event?_id=2255
*
* @apiParam {string} _id The _id of the requested event.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"2255","label":"Test event","description":"test event description","eventType":"293","createdBy":null,"createdAt":null,"updatedBy":"260","updatedAt":"2020-01-14T15:00:13.430Z","events":[],"organisations":[],"people":[],"resources":[]},"error":[],"msg":"Query results"}
*/
const getEvent = async (req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id === 'undefined' || parameters._id === '') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id or a valid label to continue.',
    });
    return false;
  }
  let _id = parameters._id;
  let event = new Event({ _id: _id });
  await event.load();
  resp.json({
    status: true,
    data: event,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /event Put event
* @apiName put event
* @apiGroup Events
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the event. This should be undefined|null|blank in the creation of a new event.
* @apiParam {string} label The label of the event.
* @apiParam {string} [description] The description of the event.
* @apiParam {string} [eventType] The event type.
*
* @apiExample {json} Example:
* {
  "label":"Test event",
  "description":"test event description",
  "eventType":"293",
  "temporal":null,
  "spatial":null,
  "_id":"2255"
}
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"createdAt":"2020-01-14T14:48:31.753Z","updatedBy":"260","createdBy":"260","description":"test event descriptiomn","label":"Test event","eventType":"293","updatedAt":"2020-01-14T14:48:31.753Z","_id":"2255"},"error":[],"msg":"Query results"}
*/
const putEvent = async (req, resp) => {
  const postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The event data must not be empty',
    });
    return false;
  }
  const userId = req.decoded.id;
  const event = new Event(postData);
  const output = await event.save(userId);
  const { status, data, error } = output;
  resp.json({
    status,
    data,
    error,
    msg: 'Query results',
  });
};

/**
* @api {delete} /event Delete event
* @apiName delete event
* @apiGroup Events
* @apiPermission admin
*
* @apiParam {string} _id The id of the event for deletion.
*
* @apiExample {request} Example:
* http://localhost:5100/api/event?_id=2255
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Event) WHERE id(n)=569 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":28,"high":0}}},"error":[],"msg":"Query results"}
*/
const deleteEvent = async (req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id === 'undefined' || parameters._id === '') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id or a valid label to continue.',
    });
    return false;
  }
  let event = new Event({ _id: parameters._id });
  let data = await event.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {delete} /events Delete events
* @apiName delete events
* @apiGroup Events
* @apiPermission admin
*
* @apiParam {array} _ids The ids of the events for deletion.
*
* @apiExample {json} Example:
* {
  "_ids":["2257","2253"]
}
*
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":[{"records":[],"summary":{"statement":{"text":"MATCH (n:Event) WHERE id(n)=1149 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":6,"high":0}}}],"error":[],"msg":"Query results"}
*/
const deleteEvents = async (req, resp) => {
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
    let event = new Event({ _id: _id });
    responseData.push(await event.delete());
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
    let query = `MATCH (n:Event) WHERE id(n)=${_id} SET n.status="${postData.status}", n.updatedBy="${updatedBy}", n.updatedAt="${updatedAt}"`;
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
  Event: Event,
  getEvents: getEvents,
  getEvent: getEvent,
  putEvent: putEvent,
  deleteEvent: deleteEvent,
  deleteEvents: deleteEvents,
  updateStatus: updateStatus,
};
