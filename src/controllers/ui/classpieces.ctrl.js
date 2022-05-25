const driver = require('../../config/db-driver');
const helpers = require('../../helpers');
const TaxonomyTerm = require('../taxonomyTerm.ctrl').TaxonomyTerm;

/**
* @api {get} /classpieces Classpieces
* @apiName classpieces
* @apiGroup Classpieces
*
* @apiParam {string} [label] A string to match against a classpiece label
* @apiParam {string} [description] A string to match against a classpiece description
* @apiParam {array} [events] An array of event ids
* @apiParam {array} [organisations] An array of organisations ids
* @apiParam {array} [people] An array of people ids
* @apiParam {array} [resources] An array of resources ids
* @apiParam {array} [temporal] An array of temporal ids
* @apiParam {array} [spatial] An array of spatial ids

* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
*
* @apiSuccess {number} currentPage The current page of results
* @apiSuccess {array} data An array of classpieces objects
* @apiSuccess {number} totalItems The total number of results
* @apiSuccess {number} totalPages The total number of available pages of results
*
* @apiSuccess (classpiece object) {object} Classpiece A classpiece object as part of the data array contains the following fields
* @apiSuccess (classpiece object) {string} Classpiece[metadata] A stringified JSON object containing the classpiece metadata
* @apiSuccess (classpiece object) {string} Classpiece[fileName] The file name of the classpiece
* @apiSuccess (classpiece object) {array} Classpiece[paths] An array containing the path to the fullsize version of the classpiece and to the thumbnail of the classpiece
* @apiSuccess (classpiece object) {string} Classpiece[systemType] The system type _id
* @apiSuccess (classpiece object) {string} Classpiece[label] The label of the classpiece
* @apiSuccess (classpiece object) {string} Classpiece[resourceType] The type of the classpiece, i.e. image
* @apiSuccess (classpiece object) {string} Classpiece[status] If the classpiece is private or public.
* @apiSuccess (classpiece object) {string} Classpiece[_id] The classpiece _id
* @apiSuccess (classpiece object) {array} Classpiece[systemLabels] A list of system tags for the classpiece
*
* @apiExample {request} Example:
* http://localhost:5100/api/classpiece?label=1971&description=test&page=1&limit=25
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
const getClasspieces = async (req, resp) => {
  const params = await getClasspiecesPrepareQueryParams(req);
  const {
    currentPage = 1,
    limit = 25,
    match = '',
    queryParams = '',
    queryOrder = '',
    returnResults = false,
    skip = 0,
  } = params;
  let responseData = {};
  if (!returnResults) {
    responseData = {
      currentPage: 1,
      data: [],
      totalItems: 0,
      totalPages: 1,
    };
    return resp.status(200).json({
      status: true,
      data: responseData,
      error: [],
      msg: 'Query results',
    });
  } else {
    const query = `MATCH ${match} ${queryParams} RETURN distinct n ${queryOrder} SKIP ${skip} LIMIT ${limit}`;
    const data = await getResourcesQuery(query, match, queryParams, limit);
    if (data.error) {
      return resp.status(400).json({
        status: false,
        data: [],
        error: data.error,
        msg: data.error.message,
      });
    } else {
      responseData = {
        currentPage: currentPage,
        data: data.nodes,
        totalItems: data.count,
        totalPages: data.totalPages,
      };
      return resp.status(200).json({
        status: true,
        data: responseData,
        error: [],
        msg: 'Query results',
      });
    }
  }
};

const getResourcesQuery = async (query, match, queryParams, limit) => {
  const session = driver.session();
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });

  const nodes = helpers.normalizeRecordsOutput(nodesPromise, 'n');
  const nodesOutput = nodes.map((node) => {
    const nodeOutput = {};
    for (let key in node) {
      nodeOutput[key] = node[key];
      const paths = [];
      if (key === 'paths' && node[key].length > 0) {
        for (let akey in node[key]) {
          const path = JSON.parse(node[key][akey]);
          paths.push(path);
        }
        nodeOutput[key] = paths;
      }
    }
    return nodeOutput;
  });
  const count = await session
    .writeTransaction((tx) =>
      tx.run(`MATCH ${match} ${queryParams} RETURN count(distinct n) as c`)
    )
    .then((result) => {
      session.close();
      const resultRecord = result.records[0];
      const countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['c'];
      output = parseInt(output, 10);
      return output;
    });
  const totalPages = Math.ceil(count / limit);
  const result = {
    nodes: nodesOutput,
    count,
    totalPages,
  };
  return result;
};

/**
* @api {get} /classpiece Classpiece
* @apiName classpiece
* @apiGroup Classpieces
*
* @apiParam {string} _id The id of the requested classpiece
*
* @apiSuccess (classpiece object) {object} metadata The classpiece metadata
* @apiSuccess (classpiece object) {string} fileName The file name of the classpiece
* @apiSuccess (classpiece object) {array} paths An array containing the path to the fullsize version of the classpiece and to the thumbnail of the classpiece
* @apiSuccess (classpiece object) {string} systemType The system type _id
* @apiSuccess (classpiece object) {string} label The label of the classpiece
* @apiSuccess (classpiece object) {string} resourceType The type of the classpiece, i.e. image
* @apiSuccess (classpiece object) {string} status If the classpiece is private or public
* @apiSuccess (classpiece object) {string} _id The classpiece _id
* @apiSuccess (classpiece object) {array} events A list of associated events
* @apiSuccess (classpiece object) {array} organisations A list of associated organisations
* @apiSuccess (classpiece object) {array} people A list of associated people
* @apiSuccess (classpiece object) {array} resources A list of associated resources
*
* @apiExample {request} Example:
* http://localhost:5100/api/classpiece?_id=389
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
const getClasspiece = async (req, resp) => {
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
  const session = driver.session();
  const query = `MATCH (n:Resource) WHERE id(n)=${_id} AND n.status='public' return n`;
  const classpiece = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      const { records } = result;
      if (records.length > 0) {
        const record = records[0].toObject();
        return helpers.outputRecord(record.n);
      }
      return null;
    })
    .catch((error) => {
      console.log(error);
    });
  if (classpiece !== null) {
    if (typeof classpiece.metadata === 'string') {
      classpiece.metadata = JSON.parse(classpiece.metadata);
    }
    if (typeof classpiece.metadata === 'string') {
      classpiece.metadata = JSON.parse(classpiece.metadata);
    }
    if (typeof classpiece.paths[0] === 'string') {
      classpiece.paths = classpiece.paths.map((p) => {
        let path = JSON.parse(p);
        if (typeof path === 'string') {
          path = JSON.parse(path);
        }
        return path;
      });
    }

    const events = await helpers.loadRelations(_id, 'Resource', 'Event', true);
    const organisations = await helpers.loadRelations(
      _id,
      'Resource',
      'Organisation',
      true
    );
    const people = await helpers.loadRelations(
      _id,
      'Resource',
      'Person',
      true,
      null,
      'rn.lastName'
    );
    const resources = await classpieceResources(
      _id,
      'Resource',
      'Resource',
      true
    );
    const { length: eLength = 0 } = events;
    for (let i = 0; i < eLength; i += 1) {
      const eventItem = events[i];
      eventItem.temporal = await helpers.loadRelations(
        eventItem.ref._id,
        'Event',
        'Temporal',
        true
      );
    }

    const classpieceSystemType = new TaxonomyTerm({ labelId: 'Classpiece' });
    await classpieceSystemType.load();
    const classpieces = [];
    const { _id: systemType } = classpieceSystemType;
    const { length: rLength = 0 } = resources;
    for (let i = 0; i < rLength; i += 1) {
      const resource = resources[i];
      const { ref = null } = resource;
      if (ref !== null) {
        const { person = null, systemType: rSystemType = null } = ref;
        if (person !== null) {
          resource.ref.person.affiliations = await helpers.loadRelations(
            resource.ref.person._id,
            'Person',
            'Organisation',
            true,
            'hasAffiliation'
          );
        }
        if (rSystemType !== null && rSystemType === systemType) {
          classpieces.push(resource);
          resources.splice(i, 1);
        }
      }
    }
    classpiece.events = events;
    classpiece.organisations = organisations;
    classpiece.people = people;
    classpiece.resources = resources;
    classpiece.classpieces = classpieces;
    return resp.status(200).json({
      status: true,
      data: classpiece,
      error: [],
      msg: 'Query results',
    });
  } else {
    return resp.status(400).json({
      status: false,
      data: [],
      error: true,
      msg: 'Classpiece not available!',
    });
  }
};

const classpieceResources = async (
  srcId = null,
  srcType = null,
  targetType = null,
  status = false
) => {
  if (srcId === null || srcType === null) {
    return false;
  }
  const session = driver.session();
  let query = `MATCH (n:${srcType})-[r]->(rn) WHERE id(n)=${srcId} return n, r, rn`;
  if (status) {
    query = `MATCH (n:${srcType}) WHERE id(n)=${srcId} AND n.status='public'
    OPTIONAL MATCH (n)-[r]->(rn) WHERE rn.status='public' return n, r, rn ORDER BY id(r)`;
  }
  if (targetType !== null) {
    query = `MATCH (n:${srcType})-[r]->(rn:${targetType}) WHERE id(n)=${srcId} return n, r, rn`;
    if (status) {
      query = `MATCH (n:${srcType}) WHERE id(n)=${srcId} AND n.status='public'
      OPTIONAL MATCH (n)-[r]->(rn:${targetType}) WHERE rn.status='public' return n, r, rn ORDER BY id(r)`;
    }
  }
  const relations = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then(async (result) => {
      session.close();
      const { records } = result;
      const relations = [];
      for (let key in records) {
        const record = records[key].toObject();
        const sourceItem = helpers.outputRecord(record.n);
        const relation = record.r;
        helpers.prepareOutput(relation);
        let targetItem = null;
        if (record.rn !== null) {
          targetItem = helpers.outputRecord(record.rn);
          if (record.rn.labels[0] === 'Resource') {
            if (typeof targetItem.metadata === 'string') {
              targetItem.metadata = JSON.parse(targetItem.metadata);
            }
            if (typeof targetItem.metadata === 'string') {
              targetItem.metadata = JSON.parse(targetItem.metadata);
            }
            targetItem.person = await relatedPerson(targetItem._id);
          }
          const newRelation = await helpers.prepareRelation(
            sourceItem,
            relation,
            targetItem
          );
          relations.push(newRelation);
        }
      }
      return relations;
    });
  return relations;
};

/**
* @api {get} /classpieces-active-filters Classpieces active filters
* @apiName classpieces active filters
* @apiGroup Classpieces
*
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=50] The number of results per page
* @apiParam {object} [temporals] An object to filter by date
* @apiParam {string} [temporals[startDate]] A string containing a start date
* @apiParam {string} [temporals[endDate]] An string containing an end date
* @apiParam {string} [temporals[dateType]] An object to filter by date
* @apiParamExample [temporals[startDate]]
*   dd/mm/yyyy
* @apiParamExample [temporals[endDate]]
*   dd/mm/yyyy
* @apiParamExample {json} Request-Example:
*     {
*       page: 1,
*       limit: 50,
*       temporals: {
*         startDate:"28/2/2022",
*         endDate:"7/3/2022",
*         dateType:"range"
*       }
*     }
*
* @apiExample {request} Example:
* https://clericus.ie/api/classpieces-active-filters?page=1&limit=50&temporals=%7B%22startDate%22:%22%22,%22endDate%22:%22%22,%22dateType%22:%22exact%22%7D
*
* @apiSuccessExample {json} Success-Response:
* {
    "status": true,
    "data": {
        "events": [
            "35050",
            "529"
        ],
        "organisations": [
            "22795",
            "71977"
        ]
    },
    "error": [],
    "msg": "Query results"
}
*/
const getClasspiecesActiveFilters = async (req, resp) => {
  const params = await getClasspiecesPrepareQueryParams(req);
  const session = driver.session();
  const itemsIdsQuery = `MATCH ${params.match} ${params.queryParams} RETURN distinct id(n) as _id`;
  const itemsIdsResults = await session
    .writeTransaction((tx) => tx.run(itemsIdsQuery, {}))
    .then((result) => {
      return result.records;
    });
  const itemsIds = [];
  for (let i in itemsIdsResults) {
    const record = itemsIdsResults[i];
    helpers.prepareOutput(record);
    itemsIds.push(record.toObject()['_id']);
  }
  const query = `MATCH (c:Resource)-->(n) WHERE c.status='public' AND n.status='public' AND id(c) IN [${itemsIds}] AND (n:Event OR n:Organisation OR n:Person OR n:Resource) RETURN DISTINCT id(n) AS _id, n.label AS label, labels(n) as labels, n.systemType as systemType, n.eventType as eventType`;
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });
  session.close();
  const nodes = nodesPromise.map((record) => {
    helpers.prepareOutput(record);
    let outputItem = record.toObject();
    outputItem.type = outputItem.labels[0];
    delete outputItem.labels;
    return outputItem;
  });
  let events = [];
  let organisations = [];
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
    let organisationsResult = [];
    for (let i = 0; i < organisationsFind.length; i++) {
      let org = organisationsFind[i];
      organisationsResult.push(org._id);
    }
    organisations = organisationsResult;
  }

  const output = {
    events,
    organisations,
  };
  return resp.status(200).json({
    status: true,
    data: output,
    error: [],
    msg: 'Query results',
  });
};

const relatedPerson = async (resourceId = null) => {
  if (resourceId === null) {
    return false;
  }
  const session = driver.session();
  const query = `MATCH (n:Resource)-[r:isRepresentationOf]->(rn) WHERE id(n)=${resourceId} return rn`;
  const person = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then(async (result) => {
      session.close();
      const { records } = result;
      if (records.length > 0) {
        const record = records[0].toObject();
        return helpers.outputRecord(record.rn);
      }
      return null;
    });
  return person;
};

const getClasspiecesPrepareQueryParams = async (req) => {
  const { query: parameters } = req;
  const {
    label = '',
    description = '',
    orderField = 'label',
    orderDesc = '',
    limit: limitParam = 25,
    page: pageParam = 0,
  } = parameters;
  let events = [];
  let organisations = [];
  let people = [];
  let resources = [];
  let page = Number(pageParam);
  const limit = Number(limitParam);
  let queryPage = 0;
  let queryOrder = '';
  let returnResults = true;

  let match = '(n:Resource)';

  let queryParams = " n.status='public'";

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
    if (
      typeof temporals.startDate !== 'undefined' &&
      temporals.startDate !== ''
    ) {
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

  // get classpiece resource type id
  const classpieceSystemType = new TaxonomyTerm({ labelId: 'Classpiece' });
  await classpieceSystemType.load();

  const { _id: systemType } = classpieceSystemType;
  if (label !== '') {
    if (queryParams !== '') {
      queryParams += ' AND ';
    }
    queryParams += `toLower(n.label) =~ toLower('.*${label}.*') `;
  }
  if (systemType !== '') {
    if (queryParams !== '') {
      queryParams += ' AND ';
    }
    queryParams += `n.systemType = '${systemType}' `;
  }
  if (description !== '') {
    if (queryParams !== '') {
      queryParams += ' AND ';
    }
    queryParams += `toLower(n.description) =~ toLower('.*${description}.*') `;
  }
  if (orderField !== '') {
    queryOrder = `ORDER BY n.${orderField}`;
    if (orderDesc === 'true') {
      queryOrder += ' DESC';
    }
  }

  if (page > 0) {
    queryPage = page - 1;
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

  const currentPage = page === 0 ? 1 : page;
  const skip = limit * queryPage;
  if (queryParams !== '') {
    queryParams = `WHERE ${queryParams}`;
  }

  return {
    match,
    queryParams,
    skip,
    limit,
    currentPage,
    queryOrder,
    returnResults,
  };
};

module.exports = {
  getClasspieces,
  getClasspiece,
  getClasspiecesActiveFilters,
};
