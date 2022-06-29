const driver = require('../config/db-driver');
const helpers = require('../helpers');

const jsonStringToObject = (data) => {
  let output = null;
  if (typeof data === 'string') {
    output = JSON.parse(data);
  }
  if (typeof output === 'string') {
    output = jsonStringToObject(output);
  }
  return output;
};

const queryBuild = async (req, resp) => {
  const queryParams = await parseParams(req);
  const items = await getNodes(queryParams);
  return resp.json({
    status: true,
    data: items,
    error: [],
    msg: 'Query results',
  });
};

const spatialsFilter = async (params) => {
  const session = driver.session();
  const query = `MATCH (s:Spatial)-[r]-(e:Event) WHERE ${params} RETURN DISTINCT id(e) as _id`;
  const results = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      let output = [];
      if (result.records.length > 0) {
        output = result.records;
      }
      return output;
    });
  session.close();
  const _ids = results.map((r) => {
    helpers.prepareOutput(r);
    return r._fields[0];
  });
  return _ids;
};

const temporalsFilter = async (params) => {
  const session = driver.session();
  const query = `MATCH (t:Temporal)-[r]-(e:Event) WHERE ${params} RETURN DISTINCT id(e) as _id`;
  const results = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      let output = [];
      if (result.records.length > 0) {
        output = result.records;
      }
      return output;
    });
  session.close();
  const _ids = results.map((r) => {
    helpers.prepareOutput(r);
    return r._fields[0];
  });
  return _ids;
};

const parseParams = async (req) => {
  const { body: params } = req;
  const {
    entityType = 'Person',
    main = [],
    events = [],
    organisations = [],
    people = [],
    resources = [],
    spatials = [],
    temporals = [],
    page: pageParam = 1,
    limit: limitParam = 25,
    orderField = 'firstName',
    orderDirection = 'asc',
  } = params;
  let page = Number(pageParam);
  const limit = Number(limitParam);
  const currentPage = page === 0 ? 1 : page;
  const queryPage = page > 0 ? page - 1 : 0;
  const skip = limit * queryPage;

  const match = entityType !== '' ? `(n:${entityType})` : '(n)';

  // main query
  let mainQuery = mainQueryBuilder(main, 'n');

  if (mainQuery !== '') {
    mainQuery = ` WHERE ${mainQuery}`;
  }

  let eventIds = [];
  let organisationIds = [];

  if (spatials.length > 0) {
    let spatialsQuery = mainQueryBuilder(spatials, 's');
    const newFilters = await spatialsFilter(spatialsQuery);
    eventIds = [...newFilters];
    organisationIds = [...newFilters];
  }

  if (temporals.length > 0) {
    let temporalsQuery = mainQueryBuilder(temporals, 't');
    const newFilters = await temporalsFilter(temporalsQuery);
    eventIds = [...newFilters];
  }

  let eventsQuery = mainQueryBuilder(events, 'e');
  if (eventsQuery !== '' || (eventIds.length > 0 && entityType !== 'Event')) {
    let queryText = '';
    if (eventsQuery !== '') {
      queryText += eventsQuery;
    }
    if (eventIds.length > 0) {
      if (queryText !== '') {
        queryText += ' AND ';
      }
      queryText += `id(e) IN [${eventIds}]`;
    }
    eventsQuery = `\n MATCH (n)-[r1]->(e) WHERE ${queryText}`;
  }
  if (entityType === 'Event') {
    let queryText = '';
    if (mainQuery !== '' && !mainQuery.includes('WHERE')) {
      queryText += ' WHERE ';
    } else if (queryText !== '') {
      queryText += ' AND ';
    }
    if (eventIds.length > 0) {
      queryText += ` id(n) IN [${eventIds}]`;
    }
    mainQuery += queryText;
  }

  let organisationsQuery = mainQueryBuilder(organisations, 'o');
  if (
    organisationsQuery !== '' ||
    (organisationIds.length > 0 && entityType !== 'Organisation')
  ) {
    let queryText = '';
    if (organisationsQuery !== '') {
      queryText += organisationsQuery;
    }
    if (organisationIds.length > 0) {
      if (queryText !== '') {
        queryText += ' AND ';
      }
      queryText += `id(o) IN [${organisationIds}]`;
    }
    organisationsQuery = `\n MATCH (n)-[r2]->(o) WHERE ${queryText}`;
  }
  if (entityType === 'Organisation') {
    let queryText = '';
    if (mainQuery !== '' && !mainQuery.includes('WHERE')) {
      queryText += ' WHERE ';
    } else if (queryText !== '') {
      queryText += ' AND ';
    }
    if (eventIds.length > 0) {
      queryText += ` id(n) IN [${eventIds}]`;
    }
    mainQuery += queryText;
  }

  let peopleQuery = mainQueryBuilder(people, 'p');
  if (peopleQuery !== '') {
    peopleQuery = `\n MATCH (n)-[r3]->(p) WHERE ${peopleQuery}`;
  }

  let resourcesQuery = mainQueryBuilder(resources, 're');
  if (resourcesQuery !== '') {
    resourcesQuery = `\n MATCH (n)-[r4]->(re) WHERE ${resourcesQuery}`;
  }

  let temporalsQuery = mainQueryBuilder(temporals, 't');
  if (temporalsQuery !== '') {
    temporalsQuery = `\n MATCH (n)-[r6]->(t) WHERE ${temporalsQuery}`;
  }
  return {
    currentPage: currentPage,
    limit: limit,
    match: match,
    mainQuery: mainQuery,
    eventsQuery: eventsQuery,
    organisationsQuery: organisationsQuery,
    peopleQuery: peopleQuery,
    resourcesQuery: resourcesQuery,
    order: orderField,
    orderDirection: orderDirection,
    page: page,
    skip: skip,
    type: entityType,
  };
};

const outputDateValue = (value) => {
  const date = new Date(value);
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
};

const mainQueryBuilder = (main, nodeSymbol = 'n') => {
  let string = '';
  const temporalElements = ['startDate', 'endDate', 'createdAt', 'updatedAt'];
  const { length } = main;
  for (let i = 0; i < length; i += 1) {
    const item = main[i];
    const { elementLabel } = item;
    const value = helpers.addslashes(item.elementValue).trim();
    const prevIndex = i - 1;
    const prevItem = main[prevIndex] || null;
    const nextIndex = i + 1;
    const nextItem = main[nextIndex] || null;
    // group or together
    if (i > 0) {
      const boolean = main[prevIndex].boolean === 'and' ? 'AND' : 'OR';
      string += ` ${boolean} `;
    }
    if (item.boolean === 'or') {
      // check next item
      if (
        nextItem !== null &&
        item.boolean === 'or' &&
        (prevItem === null || prevItem.boolean === 'and')
      ) {
        string += ' (';
      }
    }
    if (temporalElements.indexOf(elementLabel) === -1) {
      switch (item.qualifier) {
        case 'contains': {
          if (elementLabel === '_id') {
            string += ` id(${nodeSymbol}) = ${Number(value)}`;
          } else {
            string += ` exists(${nodeSymbol}.${item.elementLabel}) AND toLower(${nodeSymbol}.${item.elementLabel}) =~ toLower(".*${value}.*") `;
          }

          break;
        }
        case 'exact': {
          if (elementLabel === '_id') {
            string += ` id(${nodeSymbol}) = ${Number(value)} `;
          } else {
            string += ` exists(${nodeSymbol}.${item.elementLabel}) AND ${nodeSymbol}.${item.elementLabel} = "${value}" `;
          }
          break;
        }
        case 'not_contains': {
          if (elementLabel === '_id') {
            string += ` NOT id(${nodeSymbol}) = ${Number(value)} `;
          } else {
            string += ` exists(${nodeSymbol}.${item.elementLabel}) AND NOT toLower(${nodeSymbol}.${item.elementLabel}) =~ toLower(".*${value}.*") `;
          }
          break;
        }
        case 'not_exact': {
          if (elementLabel === '_id') {
            string += ` NOT id(${nodeSymbol}) = ${Number(value)} `;
          } else {
            string += ` exists(${nodeSymbol}.${item.elementLabel}) AND NOT ${nodeSymbol}.${item.elementLabel} = "${value}" `;
          }
          break;
        }
        default: {
          string += '';
        }
      }
    } else {
      const timestamps = ['createdAt', 'updatedAt'];
      const dateFormat =
        timestamps.indexOf(elementLabel) === -1 ? 'dd-MM-yyyy' : 'yyyy-MM-dd';
      let operator;
      switch (item.qualifier) {
        case 'exact': {
          operator = '=';
          break;
        }
        case 'before': {
          operator = '<';
          break;
        }
        case 'after': {
          operator = '>';
          break;
        }
        default: {
          operator = '=';
        }
      }
      if (item.qualifier !== 'range') {
        string += ` exists(${nodeSymbol}.${elementLabel}) AND date(datetime({epochmillis: apoc.date.parse(${nodeSymbol}.${elementLabel},"ms","${dateFormat}")})) ${operator} date(datetime({epochmillis: apoc.date.parse('${outputDateValue(
          item.elementStartValue
        )}',"ms","yyyy-MM-dd")})) `;
      } else {
        string += ` exists(${nodeSymbol}.${elementLabel}) AND date(datetime({epochmillis: apoc.date.parse(${nodeSymbol}.${elementLabel},"ms","${dateFormat}")})) >= date(datetime({epochmillis: apoc.date.parse("${outputDateValue(
          item.elementStartValue
        )}","ms","yyyy-MM-dd")})) AND date(datetime({epochmillis: apoc.date.parse(${nodeSymbol}.${elementLabel},"ms","${dateFormat}")})) <= date(datetime({epochmillis: apoc.date.parse("${outputDateValue(
          item.elementEndValue
        )}","ms","yyyy-MM-dd")})) `;
      }
    }
    if (
      prevItem !== null &&
      prevItem.boolean === 'or' &&
      (nextItem === null || item.boolean === 'and')
    ) {
      string += ' )';
    }
  }
  return string.trim();
};

const getNodes = async (params) => {
  const {
    match = '',
    mainQuery = '',
    eventsQuery = '',
    organisationsQuery = '',
    peopleQuery = '',
    resourcesQuery = '',
    order = '',
    orderDirection = '',
    skip = '',
    limit = '',
  } = params;
  const orderBy = order !== '' ? ` ORDER BY n.${order} ${orderDirection}` : '';
  const query = `MATCH ${match} ${mainQuery} ${eventsQuery} ${organisationsQuery} ${peopleQuery} ${resourcesQuery} RETURN distinct n ${orderBy} SKIP ${skip} LIMIT ${limit}`;
  const queryCount = `MATCH ${match} ${mainQuery} ${eventsQuery} ${organisationsQuery} ${peopleQuery} ${resourcesQuery} RETURN count(distinct n) as c`;
  const session = driver.session();
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  const nodes = helpers.normalizeRecordsOutput(nodesPromise, 'n');
  const { length } = nodes;

  if (params.type === 'Event') {
    for (let i = 0; i < length; i += 1) {
      const node = nodes[i];
      node.temporal = await helpers.loadRelations(
        node._id,
        'Event',
        'Temporal'
      );
      node.spatial = await helpers.loadRelations(node._id, 'Event', 'Spatial');
    }
  }

  if (params.type === 'Person') {
    for (let i = 0; i < length; i += 1) {
      const node = nodes[i];
      node.label = helpers.stripslashes(node.label);
      node.firstName = helpers.stripslashes(node.firstName);
      node.middleName = helpers.stripslashes(node.middleName);
      node.lastName = helpers.stripslashes(node.lastName);
      node.description = helpers.stripslashes(node.description);
      const relatedResources =
        (await helpers.loadRelations(node._id, 'Person', 'Resource', true)) ||
        null;
      let resources = [];
      if (relatedResources !== null) {
        resources = relatedResources.map((item) => {
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
      node.affiliations = await helpers.loadRelations(
        node._id,
        'Person',
        'Organisation',
        false,
        'hasAffiliation'
      );
    }
  }

  if (params.type === 'Resource') {
    for (let i = 0; i < length; i += 1) {
      const node = nodes[i];
      if (typeof node.paths !== 'undefined') {
        node.paths = node.paths.map((p) => jsonStringToObject(p));
      }
    }
  }

  const count = await session
    .writeTransaction((tx) => tx.run(queryCount))
    .then((result) => {
      const resultRecord = result.records[0];
      const countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      const output = countObj['c'];
      return output;
    });
  session.close();
  const totalPages = Math.ceil(count / params.limit);
  const currentPage = params.page <= totalPages ? params.page : totalPages;
  const result = {
    currentPage: currentPage,
    nodes: nodes,
    count: count,
    totalPages: totalPages,
  };
  return result;
};

module.exports = {
  queryBuild: queryBuild,
};
