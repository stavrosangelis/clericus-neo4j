const moment = require('moment');
const driver = require('../../config/db-driver');
const {
  addslashes,
  eventsFromTypes,
  loadRelations,
  normalizeRecordsOutput,
  outputRecord,
  prepareOutput,
  soundex,
  temporalEvents,
} = require('../../helpers');
const TaxonomyTerm = require('../taxonomyTerm.ctrl').TaxonomyTerm;

/**
* @api {post} /people Get people
* @apiName get people
* @apiGroup People
*
* @apiParam {string} [label] A string to match against the peoples' labels.
* @apiParam {string} [firstName] A string to match against the peoples' first names.
* @apiParam {string} [lastName] A string to match against the peoples' last names.
* @apiParam {string} [fnameSoundex] A string to match against the peoples' first name soundex.
* @apiParam {string} [lnameSoundex] A string to match against the peoples' last name soundex.
* @apiParam {string} [description] A string to match against the peoples' description.
* @apiParam {string} [personType] The person type.
* @apiParam {string} [orderField=firstName] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiSuccessExample {json} Success-Response:
{
  "status": true,
  "data": {
    "currentPage": 1,
    "data": [
      {"lastName": "Fox", "firstName": "Aidan", "honorificPrefix": [""], "middleName": "", "label": "Aidan Fox",…},
    …],
    "totalItems": "221",
    "totalPages": 9
  },
  "error": [],
  "msg": "Query results"
}
*/
const getPeople = async (req, resp) => {
  let params = await getPeoplePrepareQueryParams(req);
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
    let optionalMatchQuery = '';
    if (params.optionalMatch !== '') {
      optionalMatchQuery = params.optionalMatch;
    }
    const query = `${optionalMatchQuery} MATCH ${params.match} ${params.queryParams} RETURN distinct n ${params.queryOrder} SKIP ${params.skip} LIMIT ${params.limit}`;
    const queryCount = `${optionalMatchQuery} MATCH ${params.match} ${params.queryParams} RETURN count(distinct n) as c`;
    let data = await getPeopleQuery(query, queryCount, params.limit);
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

const getPeopleQuery = async (query, queryCount, limit) => {
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });

  let nodes = normalizeRecordsOutput(nodesPromise, 'n');

  // get related resources/thumbnails
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    let resources =
      (await loadRelations(node._id, 'Person', 'Resource', true)) || null;
    if (resources !== null) {
      resources = resources.map((item) => {
        let ref = item.ref;
        let paths = ref.paths.map((path) => {
          let pathOut = null;
          if (typeof path === 'string') {
            pathOut = JSON.parse(path);
            if (typeof pathOut === 'string') {
              pathOut = JSON.parse(pathOut);
            }
          } else {
            pathOut = path;
          }
          return pathOut;
        });

        ref.paths = paths;
        return item;
      });
    }
    node.resources = resources;
    node.affiliations = await loadRelations(
      node._id,
      'Person',
      'Organisation',
      false,
      'hasAffiliation'
    );
  }

  let count = await session
    .writeTransaction((tx) => tx.run(queryCount))
    .then((result) => {
      session.close();
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      prepareOutput(countObj);
      let output = countObj['c'];
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
* @api {get} /person Get person
* @apiName get person
* @apiGroup People
*
* @apiParam {string} _id The _id of the requested person.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"2069","honorificPrefix":["My"],"firstName":"fname","middleName":"mname","lastName":"lname","label":"fname mname lname","fnameSoundex":"F550","lnameSoundex":"L550","description":"description","status":"private","alternateAppelations":[{"appelation":"","firstName":"altfname","middleName":"altmname","lastName":"altlname","note":"note","language":{"value":"en","label":"English"}}],"createdBy":"260","createdAt":"2020-01-14T15:39:10.638Z","updatedBy":"260","updatedAt":"2020-01-14T15:42:42.939Z","events":[],"organisations":[],"people":[],"resources":[]},"error":[],"msg":"Query results"}
*/
const getPerson = async (req, resp) => {
  const parameters = req.query;
  if (typeof parameters._id === 'undefined' || parameters._id === '') {
    return resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
  }
  const _id = parameters._id;
  const session = driver.session();
  const query = `MATCH (n:Person {status:'public'}) WHERE id(n)=${_id} RETURN n`;
  const person = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      const records = result.records;
      if (records.length > 0) {
        const record = records[0].toObject();
        const output = outputRecord(record.n);
        return output;
      }
    })
    .catch((error) => {
      console.log(error);
    });
  if (typeof person !== 'undefined') {
    const events = await loadRelations(_id, 'Person', 'Event', true);
    const organisations = await loadRelations(
      _id,
      'Person',
      'Organisation',
      true
    );
    const people = await loadRelations(
      _id,
      'Person',
      'Person',
      true,
      null,
      'rn.lastName'
    );
    const resources = await loadRelations(_id, 'Person', 'Resource', true);
    const eventsLength = events.length;
    for (let i = 0; i < eventsLength; i++) {
      const eventItem = events[i];
      eventItem.temporal = await loadRelations(
        eventItem.ref._id,
        'Event',
        'Temporal',
        true
      );
      if (eventItem.temporal.length > 0) {
        eventItem.temporal.sort((a, b) => {
          const akey = a.ref.startDate || null;
          const bkey = b.ref.startDate || null;
          if (akey !== null && bkey !== null) {
            const aParts = akey.split('-');
            const aDate = moment(`${aParts[2]}-${aParts[1]}-${aParts[0]}`);
            const bParts = bkey.split('-');
            const bDate = moment(`${bParts[2]}-${bParts[1]}-${bParts[0]}`);
            if (aDate.diff(bDate) > 0) {
              return 1;
            } else {
              return -1;
            }
          }
          return 0;
        });
      }
      eventItem.spatial = await loadRelations(
        eventItem.ref._id,
        'Event',
        'Spatial',
        true
      );
      eventItem.organisations = await loadRelations(
        eventItem.ref._id,
        'Event',
        'Organisation',
        true
      );
      eventItem.people = await loadRelations(
        eventItem.ref._id,
        'Event',
        'Person',
        true
      );
    }
    const classpieceSystemType = new TaxonomyTerm({ labelId: 'Classpiece' });
    await classpieceSystemType.load();
    const classpieces = [];
    const systemType = classpieceSystemType._id;
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];
      if (resource.ref.systemType === systemType) {
        classpieces.push(resource);
        resources.splice(i, 1);
      }
    }
    // set undefined dates to today to sort the items to the end of the array
    const now = new Date();
    const nd = now.getDate();
    const nm = now.getMonth() + 1;
    const ny = now.getFullYear();
    const today = `${nd}-${nm}-${ny}`;
    events.sort((a, b) => {
      const akey = a.temporal[0]?.ref?.startDate || today;
      const bkey = b.temporal[0]?.ref?.startDate || today;

      // compare the date values to perform the sort
      if (akey !== null && bkey !== null) {
        const aParts = akey.split('-');
        const ad = aParts[0].length > 1 ? aParts[0] : `0${aParts[0]}`;
        const am = aParts[1].length > 1 ? aParts[1] : `0${aParts[1]}`;
        const ay = aParts[2];
        const aDate = moment(`${ay}-${am}-${ad}`);
        const bParts = bkey.split('-');
        const bd = bParts[0].length > 1 ? bParts[0] : `0${bParts[0]}`;
        const bm = bParts[1].length > 1 ? bParts[1] : `0${bParts[1]}`;
        const by = bParts[2];
        const bDate = moment(`${by}-${bm}-${bd}`);

        if (aDate.diff(bDate) > 0) {
          return 1;
        } else {
          return -1;
        }
      }
      return 0;
    });

    person.events = events;
    person.organisations = organisations;
    person.people = people;
    person.resources = resources;
    person.classpieces = classpieces;
    return resp.json({
      status: true,
      data: person,
      error: [],
      msg: 'Query results',
    });
  } else {
    return resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Person entry unavailable!',
    });
  }
};

const getPersonActiveFilters = async (req, resp) => {
  const params = await getPeoplePrepareQueryParams(req);
  const session = driver.session();
  const peopleIdsQuery = `MATCH ${params.match} ${params.queryParams} RETURN distinct id(n) as _id`;
  const peopleIdsResults = await session
    .writeTransaction((tx) => tx.run(peopleIdsQuery, {}))
    .then((result) => {
      return result.records;
    });
  const peopleIds = [];
  for (let i in peopleIdsResults) {
    const record = peopleIdsResults[i];
    prepareOutput(record);
    peopleIds.push(record.toObject()['_id']);
  }
  const query = `MATCH (p:Person {status:'public'})-->(n {status:'public'}) WHERE id(p) IN [${peopleIds}] AND (n:Event OR n:Organisation OR n:Person OR n:Resource) RETURN DISTINCT id(n) AS _id, labels(n) as labels, n.eventType as eventType, n.systemType as systemType`;
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });
  session.close();

  const nodes = nodesPromise.map((record) => {
    prepareOutput(record);
    let outputItem = record.toObject();
    outputItem.type = outputItem.labels[0];
    delete outputItem.labels;
    return outputItem;
  });
  const events = [];
  const organisations = [];
  const sources = [];
  const eventsFind = nodes.filter((n) => n.type === 'Event') || [];
  const { length: eventsFindLength } = eventsFind;
  if (eventsFindLength > 0) {
    for (let i = 0; i < eventsFindLength; i += 1) {
      const e = eventsFind[i];
      if (events.indexOf(e.eventType) === -1) {
        events.push(e.eventType);
      }
    }
  }
  const organisationsFind =
    nodes.filter((n) => n.type === 'Organisation') || [];
  const { length: organisationsFindLength } = organisationsFind;
  if (organisationsFindLength > 0) {
    for (let i = 0; i < organisationsFindLength; i += 1) {
      const org = organisationsFind[i];
      organisations.push(org._id);
    }
  }
  const resourcesFind = nodes.filter((n) => n.type === 'Resource') || [];
  const { length: resourcesFindLength } = resourcesFind;
  let documentSystemType = new TaxonomyTerm({ labelId: 'Document' });
  await documentSystemType.load();
  if (resourcesFindLength > 0) {
    for (let i = 0; i < resourcesFindLength; i += 1) {
      let r = resourcesFind[i];
      if (r.systemType === documentSystemType._id) {
        sources.push(r._id);
      }
    }
  }
  const output = {
    events,
    organisations,
    sources,
  };
  return resp.json({
    status: true,
    data: output,
    error: [],
    msg: 'Query results',
  });
};

const getPeoplePrepareQueryParams = async (req) => {
  let parameters = req.body;
  let label = '';
  let firstName = '';
  let lastName = '';
  let fnameSoundex = '';
  let lnameSoundex = '';
  let description = '';
  let personType = '';
  let page = 0;
  let orderField = 'lastName';
  let queryPage = 0;
  let queryOrder = '';
  let limit = 25;
  let returnResults = true;

  let match = '(n:Person)';
  let optionalMatch = '';

  let queryParams = " n.status='public' ";

  if (typeof parameters.advancedSearch !== 'undefined') {
    queryParams += advancedQueryBuilder(parameters.advancedSearch);
  }

  if (
    typeof parameters.label !== 'undefined' &&
    typeof parameters.advancedSearch === 'undefined'
  ) {
    label = addslashes(parameters.label).trim();
    if (label !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += ` (toLower(n.label) =~ toLower(".*${label}.*") OR single(x IN n.alternateAppelations WHERE toLower(x) =~ toLower(".*${label}.*"))) `;
    }
  }
  if (
    typeof parameters.firstName !== 'undefined' &&
    typeof parameters.advancedSearch === 'undefined'
  ) {
    firstName = addslashes(parameters.firstName).trim();
    if (firstName !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams +=
        "toLower(n.firstName) =~ toLower('.*" + firstName + ".*') ";
    }
  }
  if (
    typeof parameters.lastName !== 'undefined' &&
    typeof parameters.advancedSearch === 'undefined'
  ) {
    lastName = addslashes(parameters.lastName).trim();
    if (lastName !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += "toLower(n.lastName) =~ toLower('.*" + lastName + ".*') ";
    }
  }
  if (
    typeof parameters.fnameSoundex !== 'undefined' &&
    typeof parameters.advancedSearch === 'undefined'
  ) {
    fnameSoundex = soundex(parameters.fnameSoundex).trim();
    if (queryParams !== '') {
      queryParams += ' AND ';
    }
    queryParams +=
      "toLower(n.fnameSoundex) =~ toLower('.*" + fnameSoundex + ".*') ";
  }
  if (
    typeof parameters.lnameSoundex !== 'undefined' &&
    typeof parameters.advancedSearch === 'undefined'
  ) {
    lnameSoundex = soundex(parameters.lnameSoundex).trim();
    if (queryParams !== '') {
      queryParams += ' AND ';
    }
    queryParams +=
      "toLower(n.lnameSoundex) =~ toLower('.*" + lnameSoundex + ".*') ";
  }
  if (
    typeof parameters.description !== 'undefined' &&
    typeof parameters.advancedSearch === 'undefined'
  ) {
    description = addslashes(parameters.description).trim();
    if (queryParams !== '') {
      queryParams += ' AND ';
    }
    queryParams +=
      "toLower(n.description) =~ toLower('.*" + description + ".*') ";
  }
  if (typeof parameters.personType !== 'undefined') {
    personType = addslashes(parameters.personType).trim();
    if (queryParams !== '') {
      queryParams += ' AND ';
    }
    queryParams += ` toLower(n.personType)= toLower("${personType}") `;
  }
  if (parameters.sources?.length > 0) {
    optionalMatch = `OPTIONAL MATCH (s:Resource) WHERE id(s) IN [${parameters.sources}]`;
    queryParams += ' AND exists((n)-[:isReferencedIn]->(s))';
  }

  if (typeof parameters.orderField !== 'undefined') {
    orderField = parameters.orderField;
  }
  if (orderField !== '') {
    queryOrder = 'ORDER BY n.' + orderField;
    if (
      typeof parameters.orderDesc !== 'undefined' &&
      parameters.orderDesc === true
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
      temporalEventIds = await temporalEvents(temporals, eventTypes);
      if (temporalEventIds.length === 0) {
        returnResults = false;
      }
    } else if (typeof eventTypes !== 'undefined') {
      temporalEventIds = await eventsFromTypes(eventTypes);
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
      prepareOutput(sr);
      spatialEventIds.push(sr._fields[0]);
    }
  }

  let events = [];
  let organisations = [];
  let people = [];
  let resources = [];
  if (
    typeof parameters.events !== 'undefined' &&
    parameters.events.length > 0
  ) {
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
    match = '(n:Person)-[revent]->(e:Event)';
    if (events.length === 1) {
      queryParams += ` AND id(e)=${events[0]} `;
    } else if (events.length > 1) {
      queryParams += ` AND id(e) IN [${events}] `;
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
      match = '(n:Person)-[revent]->(e:Event)';
    }
    if (events.length === 1) {
      queryParams += ` AND id(e)=${events[0]} `;
    } else if (events.length > 1) {
      queryParams += ` AND id(e) IN [${events}] `;
    }
  }
  if (
    typeof parameters.organisations !== 'undefined' &&
    parameters.organisations.length > 0
  ) {
    organisations = parameters.organisations;
    if (events.length > 0) {
      match += ', (n:Person)-[rorganisation]->(o:Organisation)';
    } else {
      match = '(n:Person)-[rorganisation]->(o:Organisation)';
    }
    if (organisations.length === 1) {
      queryParams += ` AND id(o)=${organisations[0]} `;
    } else {
      queryParams += ` AND id(o) IN [${organisations}] `;
    }
  }
  if (
    typeof parameters.people !== 'undefined' &&
    parameters.people.length > 0
  ) {
    people = parameters.people;
    if (events.length > 0 || organisations.length > 0) {
      match += ', (n:Person)-[rperson]->(p:Person)';
    } else {
      match = '(n:Person)-[rperson]->(p:Person)';
    }
    if (people.length === 1) {
      queryParams += ` AND id(p)=${people[0]} `;
    } else {
      queryParams += ` AND id(p) IN [${people}] `;
    }
  }
  if (
    typeof parameters.resources !== 'undefined' &&
    parameters.resources.length > 0
  ) {
    resources = parameters.resources;
    if (events.length > 0 || organisations.length > 0 || people.length > 0) {
      match += ', (n:Person)-[rresource]->(re:Resource)';
    } else {
      match = '(n:Person)-[rresource]->(re:Resource)';
    }
    if (resources.length === 1) {
      queryParams += ` AND id(re)=${resources[0]} `;
    } else {
      queryParams += ` AND id(re) IN [${resources}] `;
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
    optionalMatch: optionalMatch,
    queryParams: queryParams,
    skip: skip,
    limit: limit,
    currentPage: currentPage,
    queryOrder: queryOrder,
    returnResults: returnResults,
  };
};

const advancedQueryBuilder = (advancedSearch) => {
  let query = '';
  for (let i = 0; i < advancedSearch.length; i++) {
    let item = advancedSearch[i];
    query += ` ${item.boolean.toUpperCase()}`;
    if (item.select === 'honorificPrefix') {
      if (item.qualifier === 'not_equals') {
        query += ` NOT single(x IN n.${item.select} WHERE x="${item.input}")`;
      }
      if (item.qualifier === 'not_contains') {
        query += ` NOT single(x IN n.${item.select} WHERE toLower(x) =~ toLower(".*${item.input}.*"))`;
      }
      if (item.qualifier === 'contains') {
        query += ` single(x IN n.${item.select} WHERE toLower(x) =~ toLower(".*${item.input}.*")) `;
      }
      if (item.qualifier === 'equals') {
        query += ` single(x IN n.${item.select} WHERE x="${item.input}") `;
      }
    } else if (
      item.select === 'fnameSoundex' ||
      item.select === 'lnameSoundex'
    ) {
      let inputVal = soundex(item.input).trim();
      if (item.qualifier === 'not_equals') {
        query += ` NOT n.${item.select} = "${inputVal}" `;
      }
      if (item.qualifier === 'not_contains') {
        query += ` NOT toLower(n.${item.select}) =~ toLower(".*${inputVal}.*") `;
      }
      if (item.qualifier === 'contains') {
        query += ` toLower(n.${item.select}) =~ toLower(".*${inputVal}.*") `;
      }
      if (item.qualifier === 'equals') {
        query += ` n.${item.select} = "${inputVal}" `;
      }
    } else {
      if (item.qualifier === 'not_equals') {
        query += ` NOT n.${item.select} = "${item.input}" `;
      }
      if (item.qualifier === 'not_contains') {
        query += ` NOT toLower(n.${item.select}) =~ toLower(".*${item.input}.*") `;
      }
      if (item.qualifier === 'contains') {
        query += ` toLower(n.${item.select}) =~ toLower(".*${item.input}.*") `;
      }
      if (item.qualifier === 'equals') {
        query += ` n.${item.select} = "${item.input}" `;
      }
    }
  }
  return query;
};

const getPeopleSources = async (req, resp) => {
  let documentSystemType = new TaxonomyTerm({ labelId: 'Document' });
  await documentSystemType.load();
  let query = `MATCH (r:Resource {systemType:"${documentSystemType._id}",status:"public"}) RETURN r`;
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  let sources = normalizeRecordsOutput(nodesPromise, 'n');
  session.close();
  return resp.json({
    status: true,
    data: sources,
    error: [],
    msg: 'Query results',
  });
};

module.exports = {
  getPeople: getPeople,
  getPerson: getPerson,
  getPersonActiveFilters: getPersonActiveFilters,
  getPeopleSources: getPeopleSources,
};
