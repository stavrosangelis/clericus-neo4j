const driver = require('../../config/db-driver');
const helpers = require('../../helpers');
const TaxonomyTerm = require('../taxonomyTerm.ctrl').TaxonomyTerm;

/**
* @api {get} /resources Resources
* @apiName resources
* @apiGroup Resources
*
* @apiParam {string} [label] A string to match against a resource label
* @apiParam {string} [description] A string to match against a resource description
* @apiParam {array} [events] An array of event ids
* @apiParam {array} [organisations] An array of organisations ids
* @apiParam {array} [people] An array of people ids
* @apiParam {array} [resources] An array of resources ids
* @apiParam {array} [temporal] An array of temporal ids
* @apiParam {array} [spatial] An array of spatial ids
* @apiParam {array} [resourcesTypes] An array of resource types

* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
*
* @apiSuccess {number} currentPage The current page of results
* @apiSuccess {array} data An array of resources objects
* @apiSuccess {number} totalItems The total number of results
* @apiSuccess {number} totalPages The total number of available pages of results
*
* @apiSuccess (resource object) {object} Resource A resource object as part of the data array contains the following fields
* @apiSuccess (resource object) {string} Resource[metadata] A stringified JSON object containing the resource metadata
* @apiSuccess (resource object) {string} Resource[fileName] The file name of the resource
* @apiSuccess (resource object) {array} Resource[paths] An array containing the path to the fullsize version of the resource and to the thumbnail of the resource
* @apiSuccess (resource object) {string} Resource[systemType] The system type _id
* @apiSuccess (resource object) {string} Resource[label] The label of the resource
* @apiSuccess (resource object) {string} Resource[resourceType] The type of the resource, i.e. image
* @apiSuccess (resource object) {string} Resource[status] If the resource is private or public.
* @apiSuccess (resource object) {string} Resource[_id] The resource _id
* @apiSuccess (resource object) {array} Resource[systemLabels] A list of system tags for the resource
*
* @apiExample {request} Example:
* http://localhost:5100/api/resource?label=1971&description=test&page=1&limit=25
*
* @apiSuccessExample {json} Success-Response:
* {
    "status": true,
    "data": {
        "currentPage": 1,
        "data": [
            {
                "metadata": "\"{\\\"image\\\":{\\\"default\\\":{\\\"height\\\":6464,\\\"width\\\":4808,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":0,\\\"y\\\":0,\\\"rotate\\\":0},\\\"exif\\\":{\\\"image\\\":{\\\"XResolution\\\":240,\\\"YResolution\\\":240,\\\"ResolutionUnit\\\":2,\\\"Software\\\":\\\"Adobe Photoshop Lightroom Classic 7.3.1 (Windows)\\\",\\\"ModifyDate\\\":\\\"2018:07:02 12:56:59\\\",\\\"ExifOffset\\\":172},\\\"thumbnail\\\":{},\\\"exif\\\":{\\\"ExifVersion\\\":{\\\"type\\\":\\\"Buffer\\\",\\\"data\\\":[48,50,51,48]},\\\"ColorSpace\\\":1},\\\"gps\\\":{},\\\"interoperability\\\":{},\\\"makernote\\\":{}},\\\"iptc\\\":{}}}\"",
                "fileName": "1969-1970.jpg",
                "paths": [
                    "{\"path\":\"images/fullsize/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg\",\"pathType\":\"source\"}",
                    "{\"path\":\"images/thumbnails/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg\",\"pathType\":\"thumbnail\"}"
                ],
                "systemType": "{\"ref\":\"87\"}",
                "label": "1969-1970",
                "resourceType": "image",
                "status": false,
                "_id": "389",
                "systemLabels": [
                    "Resource"
                ]
            }
        ],
        "totalItems": 1,
        "totalPages": 1
    },
    "error": [],
    "msg": "Query results"
}
*/

const getResources = async (req, resp) => {
  let params = await getResourcesPrepareQueryParams(req);
  let responseData = {};
  if (!params.returnResults) {
    responseData = {
      currentPage: 1,
      data: [],
      totalItems: 0,
      totalPages: 1,
    };
    return resp.json({
      status: true,
      data: responseData,
      error: [],
      msg: 'Query results',
    });
  } else {
    let query = `MATCH ${params.match} ${params.queryParams} RETURN distinct n ${params.queryOrder} SKIP ${params.skip} LIMIT ${params.limit}`;
    let data = await getResourcesQuery(
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
      let responseData = {
        currentPage: params.currentPage,
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
  }
};

const getResourcesQuery = async (query, match, queryParams, limit) => {
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
    nodes: nodesOutput,
    count: count,
    totalPages: totalPages,
  };
  return result;
};

/**
* @api {get} /resource Resource
* @apiName resource
* @apiGroup Resources
*
* @apiParam {string} _id The id of the requested resource
*
* @apiSuccess (resource object) {object} metadata The resource metadata
* @apiSuccess (resource object) {string} fileName The file name of the resource
* @apiSuccess (resource object) {array} paths An array containing the path to the fullsize version of the resource and to the thumbnail of the resource
* @apiSuccess (resource object) {string} systemType The system type _id
* @apiSuccess (resource object) {string} label The label of the resource
* @apiSuccess (resource object) {string} resourceType The type of the resource, i.e. image
* @apiSuccess (resource object) {string} status If the resource is private or public
* @apiSuccess (resource object) {string} _id The resource _id
* @apiSuccess (resource object) {array} events A list of associated events
* @apiSuccess (resource object) {array} organisations A list of associated organisations
* @apiSuccess (resource object) {array} people A list of associated people
* @apiSuccess (resource object) {array} resources A list of associated resources
*
* @apiExample {request} Example:
* http://localhost:5100/api/resource?_id=389
*
* @apiSuccessExample {json} Success-Response:
* {
    "status": true,
    "data": {
        "metadata": {},
        "fileName": "1969-1970.jpg",
        "paths": [
            {
                "path": "images/fullsize/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg",
                "pathType": "source"
            },
            {
                "path": "images/thumbnails/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg",
                "pathType": "thumbnail"
            }
        ],
        "systemType": "{\"ref\":\"87\"}",
        "label": "1969-1970",
        "resourceType": "image",
        "status": false,
        "_id": "389",
        "events": [],
        "organisations": [],
        "people": [],
        "resources": [],
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
  let session = driver.session();
  let query =
    'MATCH (n:Resource) WHERE id(n)=' + _id + " AND n.status='public' return n";
  let resource = await session
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
  if (typeof resource !== 'undefined') {
    if (typeof resource.metadata === 'string') {
      resource.metadata = JSON.parse(resource.metadata);
    }
    if (typeof resource.metadata === 'string') {
      resource.metadata = JSON.parse(resource.metadata);
    }
    if (typeof resource.paths[0] === 'string') {
      resource.paths = resource.paths.map((p) => {
        let path = JSON.parse(p);
        if (typeof path === 'string') {
          path = JSON.parse(path);
        }
        return path;
      });
    }

    let events = await helpers.loadRelations(_id, 'Resource', 'Event', true);
    let organisations = await helpers.loadRelations(
      _id,
      'Resource',
      'Organisation',
      true
    );
    let people = await helpers.loadRelations(
      _id,
      'Resource',
      'Person',
      true,
      null,
      'rn.lastName'
    );
    let resources = await helpers.loadRelations(
      _id,
      'Resource',
      'Resource',
      true
    );

    for (let i = 0; i < events.length; i++) {
      let eventItem = events[i];
      eventItem.temporal = await helpers.loadRelations(
        eventItem.ref._id,
        'Event',
        'Temporal',
        true
      );
    }

    let classpieceSystemType = new TaxonomyTerm({ labelId: 'Classpiece' });
    await classpieceSystemType.load();
    let classpieces = [];
    let systemType = classpieceSystemType._id;
    for (let i = 0; i < resources.length; i++) {
      let resource = resources[i];
      if (typeof resource.ref.person !== 'undefined') {
        resource.ref.person.affiliations = await helpers.loadRelations(
          resource.ref.person._id,
          'Person',
          'Organisation',
          true,
          'hasAffiliation'
        );
      }
      if (resource.ref.systemType === systemType) {
        classpieces.push(resource);
        resources.splice(i, 1);
      }
    }
    resource.events = events;
    resource.organisations = organisations;
    resource.people = people;
    resource.resources = resources;
    resource.classpieces = classpieces;
    resp.json({
      status: true,
      data: resource,
      error: [],
      msg: 'Query results',
    });
  } else {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Resource not available!',
    });
  }
};

const getResourcesActiveFilters = async (req, resp) => {
  let params = await getResourcesPrepareQueryParams(req);
  let session = driver.session();
  let itemsIdsQuery = `MATCH ${params.match} ${params.queryParams} RETURN distinct id(n) as _id`;
  let itemsIdsResults = await session
    .writeTransaction((tx) => tx.run(itemsIdsQuery, {}))
    .then((result) => {
      return result.records;
    });
  let itemsIds = [];
  for (let i in itemsIdsResults) {
    let record = itemsIdsResults[i];
    helpers.prepareOutput(record);
    itemsIds.push(record.toObject()['_id']);
  }
  let query = `MATCH (c:Resource)-->(n) WHERE c.status='public' AND n.status='public' AND id(c) IN [${itemsIds}] AND (n:Event OR n:Organisation OR n:Person OR n:Resource) RETURN DISTINCT id(n) AS _id, n.label AS label, labels(n) as labels, n.systemType as systemType, n.eventType as eventType`;
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });
  session.close();
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
    events = [];
    for (let i = 0; i < eventsFind.length; i++) {
      let e = eventsFind[i];
      if (events.indexOf(e.eventType) === -1) {
        events.push(e.eventType);
      }
    }
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

const getResourcesPrepareQueryParams = async (req) => {
  let parameters = req.query;
  let label = '';
  let description = '';
  let events = [];
  let organisations = [];
  let people = [];
  let resources = [];
  let resourcesType = '';
  let page = 0;
  let orderField = 'label';
  let queryPage = 0;
  let queryOrder = '';
  let limit = 25;
  let returnResults = true;

  let match = '(n:Resource)';

  let classpieceSystemType = new TaxonomyTerm({ labelId: 'Classpiece' });
  await classpieceSystemType.load();

  let queryParams = ` NOT n.systemType="${classpieceSystemType._id}" AND  n.status="public" `;

  if (typeof parameters.label !== 'undefined') {
    label = parameters.label;
    if (label !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += " toLower(n.label) =~ toLower('.*" + label + ".*') ";
    }
  }

  // temporal
  let temporalEventIds = [];
  if (typeof parameters.temporals !== 'undefined') {
    let eventTypes = [];
    if (typeof parameters.events !== 'undefined') {
      eventTypes = parameters.events;
    }
    let temporals = parameters.temporals;
    if (typeof temporals === 'string') {
      temporals = JSON.parse(temporals);
    }
    if (temporals.startDate !== '' && temporals.startDate !== null) {
      temporalEventIds = await helpers.temporalEvents(temporals, eventTypes);
      if (temporalEventIds.length === 0) {
        returnResults = false;
      }
    } else if (typeof eventTypes !== 'undefined') {
      temporalEventIds = await helpers.eventsFromTypes(eventTypes);
    }
  }
  // spatial
  let spatialEventIds = [];
  if (typeof parameters.spatial !== 'undefined') {
    let session = driver.session();
    let querySpatial = `MATCH (n:Spatial)-[r]-(e:Event) WHERE id(n) IN [${parameters.spatial}] RETURN DISTINCT id(e)`;
    let spatialResults = await session
      .writeTransaction((tx) => tx.run(querySpatial, {}))
      .then((result) => {
        session.close();
        return result.records;
      });
    for (let s = 0; s < spatialResults.length; s++) {
      let sr = spatialResults[s];
      helpers.prepareOutput(sr);
      spatialEventIds.push(sr._fields[0]);
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

  if (
    typeof parameters.resourcesType !== 'undefined' &&
    parameters.resourcesType !== ''
  ) {
    resourcesType = parameters.resourcesType;
    if (queryParams !== '') {
      queryParams += ' AND ';
    }
    queryParams += ` n.systemType="${resourcesType}"`;
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
  }
  if (typeof parameters.limit !== 'undefined') {
    limit = parseInt(parameters.limit, 10);
  }

  if (typeof parameters.events !== 'undefined') {
    if (temporalEventIds.length > 0) {
      for (let i = 0; i < temporalEventIds.length; i++) {
        let tei = temporalEventIds[i];
        if (events.indexOf(tei) === -1) {
          events.push(tei);
        }
      }
    }
    if (spatialEventIds.length > 0) {
      for (let i = 0; i < spatialEventIds.length; i++) {
        let sei = spatialEventIds[i];
        if (events.indexOf(sei) === -1) {
          events.push(sei);
        }
      }
    }
    match = '(n:Resource)-[revent]->(e:Event)';
    if (events.length === 1) {
      queryParams += `AND id(e)=${events[0]} `;
    } else if (events.length > 1) {
      queryParams += `AND id(e) IN [${events}] `;
    }
  } else {
    events = [];
    if (temporalEventIds.length > 0) {
      for (let i = 0; i < temporalEventIds.length; i++) {
        let tei = temporalEventIds[i];
        if (events.indexOf(tei) === -1) {
          events.push(tei);
        }
      }
    }
    if (spatialEventIds.length > 0) {
      for (let i = 0; i < spatialEventIds.length; i++) {
        let sei = spatialEventIds[i];
        if (events.indexOf(sei) === -1) {
          events.push(sei);
        }
      }
    }
    if (events.length > 0) {
      match = '(n:Resource)-[revent]->(e:Event)';
    }
    if (events.length === 1) {
      queryParams += `AND id(e)=${events[0]} `;
    } else if (events.length > 1) {
      queryParams += `AND id(e) IN [${events}] `;
    }
  }
  if (typeof parameters.organisations !== 'undefined') {
    organisations = parameters.organisations;
    if (events.length > 0) {
      match += ', (n:Resource)-[rorganisation]->(o:Organisation)';
    } else {
      match = '(n:Resource)-[rorganisation]->(o:Organisation)';
    }
    if (organisations.length === 1) {
      queryParams += `AND id(o)=${organisations[0]} `;
    } else {
      queryParams += `AND id(o) IN [${organisations}] `;
    }
  }
  if (typeof parameters.people !== 'undefined') {
    people = parameters.people;
    if (events.length > 0 || organisations.length > 0) {
      match += ', (n:Resource)-[rperson]->(p:Person)';
    } else {
      match = '(n:Resource)-[rperson]->(p:Person)';
    }
    if (people.length === 1) {
      queryParams += `AND id(p)=${people[0]} `;
    } else {
      queryParams += `AND id(p) IN [${people}] `;
    }
  }
  if (typeof parameters.resources !== 'undefined') {
    resources = parameters.resources;
    if (events.length > 0 || organisations.length > 0 || people.length > 0) {
      match += ', (n:Resource)-[rresource]->(re:Resource)';
    } else {
      match = '(n:Resource)-[rresource]->(re:Resource)';
    }
    if (resources.length === 1) {
      queryParams += `AND id(re)=${resources[0]} `;
    } else {
      queryParams += `AND id(re) IN [${resources}] `;
    }
  }
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

module.exports = {
  getResources: getResources,
  getResource: getResource,
  getResourcesActiveFilters: getResourcesActiveFilters,
};
