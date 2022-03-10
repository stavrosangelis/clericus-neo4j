const driver = require('../../config/db-driver');
const helpers = require('../../helpers');
const TaxonomyTerm = require('../taxonomyTerm.ctrl').TaxonomyTerm;

/**
* @api {get} /events Get events
* @apiName get events
* @apiGroup Events
*
* @apiParam {string} [label] A string to match against the events labels.
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
  const params = await getEventsPrepareQueryParams(req);
  if (!params.returnResults) {
    return resp.json({
      status: true,
      data: {
        currentPage: 1,
        data: [],
        totalItems: 0,
        totalPages: 1,
      },
      error: [],
      msg: 'Query results',
    });
  } else {
    const query = `MATCH ${params.match} ${params.queryParams} RETURN distinct n ${params.queryOrder} SKIP ${params.skip} LIMIT ${params.limit}`;
    const data = await getEventsQuery(
      query,
      params.match,
      params.queryParams,
      params.limit
    );
    if (data.error) {
      resp.json({
        status: false,
        data: [],
        error: data.error,
        msg: data.error.message,
      });
    } else {
      resp.json({
        status: true,
        data: {
          currentPage: params.currentPage,
          data: data.nodes,
          totalItems: data.count,
          totalPages: data.totalPages,
        },
        error: [],
        msg: 'Query results',
      });
    }
  }
};

const getEventsQuery = async (query, match, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });

  let nodes = [];
  let nodesOutput = helpers.normalizeRecordsOutput(nodesPromise);
  for (let i = 0; i < nodesOutput.length; i++) {
    let node = nodesOutput[i];
    let temporal = await helpers.loadRelations(
      node._id,
      'Event',
      'Temporal',
      true
    );
    let spatial = await helpers.loadRelations(
      node._id,
      'Event',
      'Spatial',
      true
    );
    const organisations = await helpers.loadRelations(
      node._id,
      'Event',
      'Organisation',
      true
    );
    const people = await helpers.loadRelations(
      node._id,
      'Event',
      'Person',
      true,
      null,
      'rn.lastName'
    );
    node.people = people;
    node.organisations = organisations;
    node.temporal = temporal;
    node.spatial = spatial;
    nodes.push(node);
  }
  let count = await session
    .writeTransaction((tx) =>
      tx.run(`MATCH ${match} ${queryParams} RETURN count(distinct n) as c`)
    )
    .then((result) => {
      session.close();
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['c'];
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

const getEventsPrepareQueryParams = async (req) => {
  const { query: parameters } = req;
  const {
    events: eventTypes = [],
    eventType = '',
    label = '',
    orderDesc = 'false',
    orderField = 'label',
  } = parameters;
  let { limit = 25, page = 0, temporals = null } = parameters;
  let temporal = '';
  let spatial = '';
  page = Number(page);
  let queryPage = page > 0 ? page - 1 : 0;
  let queryOrder = '';
  limit = Number(limit);
  let returnResults = true;

  let match = '(n:Event)';

  let queryParams = " n.status='public' ";

  if (label !== '') {
    if (queryParams !== '') {
      queryParams += ' AND ';
    }
    queryParams = `toLower(n.label) =~ toLower('.*${label}.*') `;
  }

  // temporal
  if (temporals !== null) {
    let temporalEventIds = [];
    if (typeof temporals === 'string') {
      temporals = JSON.parse(temporals);
    }
    const { startDate } = temporals;
    if (startDate !== '' && startDate !== null) {
      temporalEventIds = await helpers.temporalEvents(temporals, eventTypes);
      if (temporalEventIds.length === 0) {
        returnResults = false;
      }
    } else if (eventTypes.length > 0) {
      temporalEventIds = await helpers.eventsFromTypes(eventTypes);
    }
    if (temporalEventIds.length === 1) {
      queryParams += ` AND id(n)=${temporalEventIds[0]} `;
    } else if (temporalEventIds.length > 1) {
      queryParams += ` AND id(n) IN [${temporalEventIds}] `;
    }
  }

  if (eventType !== '') {
    if (queryParams !== '') {
      queryParams += ' AND ';
    }
    //  if eventType then load all children event types as well
    const eventTypeTerm = new TaxonomyTerm({ _id: Number(eventType) });
    const eventIds = await eventTypeTerm.loadChildrenIds();
    const eventQueryIds = eventIds.map((i) => `"${i}"`);
    queryParams += `n.eventType IN [${eventQueryIds}] `;
  }

  if (orderField !== '') {
    queryOrder = `ORDER BY n.${orderField}`;
    if (orderDesc === 'true') {
      queryOrder += ' DESC';
    }
  }

  const currentPage = page !== 0 ? page : 1;
  const skip = limit * queryPage;

  if (queryParams !== '') {
    if (temporal === '' && spatial === '') {
      queryParams = `WHERE ${queryParams}`;
    }
  }

  return {
    match: match,
    queryParams: queryParams,
    skip: skip,
    limit: limit,
    currentPage: currentPage,
    queryOrder: queryOrder,
    returnResults: returnResults,
  };
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
  let session = driver.session();
  let query =
    'MATCH (n:Event) WHERE id(n)=' + _id + " AND n.status='public' return n";
  let event = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      let records = result.records;
      if (records.length > 0) {
        let record = records[0].toObject();
        let outputRecord = helpers.outputRecord(record.n);
        return outputRecord;
      }
    })
    .catch((error) => {
      console.log(error);
    });
  if (typeof event !== 'undefined') {
    let eventType = new TaxonomyTerm({ _id: event.eventType });
    await eventType.load();
    event.eventType = eventType;
    let events = await helpers.loadRelations(_id, 'Event', 'Event', true);
    let organisations = await helpers.loadRelations(
      _id,
      'Event',
      'Organisation',
      true
    );
    let people = await helpers.loadRelations(
      _id,
      'Event',
      'Person',
      true,
      null,
      'rn.lastName'
    );
    let resources = await helpers.loadRelations(_id, 'Event', 'Resource', true);
    let temporal = await helpers.loadRelations(_id, 'Event', 'Temporal', null);
    let spatial = await helpers.loadRelations(_id, 'Event', 'Spatial', null);

    // get classpiece resource type id
    let classpieceSystemType = new TaxonomyTerm({ labelId: 'Classpiece' });
    await classpieceSystemType.load();
    let classpieces = [];
    let systemType = classpieceSystemType._id;
    for (let i in resources) {
      let resource = resources[i];
      if (resource.ref.systemType === systemType) {
        classpieces.push(resource);
        resources.splice(i, 1);
      }
    }

    event.events = events;
    event.organisations = organisations;
    event.people = people;
    event.resources = resources;
    event.classpieces = classpieces;
    event.temporal = temporal;
    event.spatial = spatial;
    resp.json({
      status: true,
      data: event,
      error: [],
      msg: 'Query results',
    });
  } else {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Event not available!',
    });
  }
};

const getEventsActiveFilters = async (req, resp) => {
  let parameters = req.body;
  let _ids = [];
  if (typeof parameters._ids !== 'undefined' && parameters._ids.length > 0) {
    _ids = parameters._ids;
  }
  let query = `MATCH (e:Event)-->(n) WHERE e.status='public' AND id(e) IN [${_ids}] AND (n:Event OR n:Organisation OR n:Person OR n:Resource OR n:Temporal OR n:Spatial) RETURN DISTINCT id(n) AS _id, n.label AS label, labels(n) as labels`;
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });

  let nodes = nodesPromise.map((record) => {
    helpers.prepareOutput(record);
    let outputItem = record.toObject();
    outputItem.type = outputItem.labels[0];
    delete outputItem.labels;
    return outputItem;
  });
  let events = [];
  let organisations = [];
  let people = [];
  let resources = [];
  let temporal = [];
  let spatial = [];
  let eventsFind = nodes.filter((n) => n.type === 'Event');
  if (eventsFind !== 'undefined') {
    events = eventsFind;
  }
  let organisationsFind = nodes.filter((n) => n.type === 'Organisation');
  if (organisationsFind !== 'undefined') {
    organisations = organisationsFind;
  }
  let peopleFind = nodes.filter((n) => n.type === 'Person');
  if (peopleFind !== 'undefined') {
    people = peopleFind;
  }
  let resourcesFind = nodes.filter((n) => n.type === 'Resource');
  if (resourcesFind !== 'undefined') {
    resources = resourcesFind;
  }
  let temporalFind = nodes.filter((n) => n.type === 'Temporal');
  if (temporalFind !== 'undefined') {
    temporal = temporalFind;
  }
  let spatialFind = nodes.filter((n) => n.type === 'Spatial');
  if (spatialFind !== 'undefined') {
    spatial = spatialFind;
  }

  let output = {
    events: events,
    organisations: organisations,
    people: people,
    resources: resources,
    temporal: temporal,
    spatial: spatial,
  };
  resp.json({
    status: true,
    data: output,
    error: [],
    msg: 'Query results',
  });
};

module.exports = {
  getEvents: getEvents,
  getEvent: getEvent,
  getEventsActiveFilters: getEventsActiveFilters,
};
