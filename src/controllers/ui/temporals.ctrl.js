const driver = require('../../config/db-driver');
const helpers = require('../../helpers');
const TaxonomyTerm = require('../taxonomyTerm.ctrl').TaxonomyTerm;

/**
* @api {get} /temporals Get temporals
* @apiName get temporals
* @apiGroup Temporals
*
* @apiParam {string} [label] A label to match against the temporals' label.
* @apiParam {string} [orderField=firstName] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
*
* @apiExample {request} Example:
http://localhost:5100/api/temporals?page=1&limit=25
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"currentPage":1,"data":[{"createdAt":"2020-01-17T10:07:49.237Z","updatedBy":"260","createdBy":"260","endDate":"1999","format":"","label":"00s","startDate":"1990","updatedAt":"2020-01-17T10:07:49.237Z","_id":"2514","systemLabels":["Temporal"]}],"totalItems":"1","totalPages":1},"error":[],"msg":"Query results"}
*/
const getTemporals = async (req, resp) => {
  let params = await getTemporalsPrepareQueryParams(req);
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
    let data = await getTemporalsQuery(
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

const getTemporalsQuery = async (query, match, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });
  let nodes = helpers.normalizeRecordsOutput(nodesPromise);
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

const getTemporalsPrepareQueryParams = async (req) => {
  let parameters = req.query;
  let page = 0;
  let queryPage = 0;
  let queryOrder = '';
  let limit = 25;
  let returnResults = true;
  let match = '(n:Temporal)';
  let queryParams = '';
  // temporal
  if (typeof parameters.temporals !== 'undefined') {
    let temporals = parameters.temporals;
    if (typeof temporals === 'string') {
      temporals = JSON.parse(temporals);
    }
    let startDate = temporals.startDate;
    let endDate = temporals.endDate;
    let dateType = temporals.dateType;
    let operator = '=';
    if (dateType === 'before') {
      operator = '<';
    }
    if (dateType === 'after') {
      operator = '>';
    }
    if (startDate !== '' && dateType !== 'range') {
      queryParams += ` NOT n.startDate="" AND date(datetime({epochmillis: apoc.date.parse(n.startDate,"ms","dd-MM-yyyy")}))${operator}date(datetime({epochmillis: apoc.date.parse('${startDate}',"ms","dd/MM/yyyy")})) `;
    }
    if (dateType === 'range') {
      queryParams += ` NOT n.startDate="" AND date(datetime({epochmillis: apoc.date.parse(n.startDate,"ms","dd-MM-yyyy")}))>=date(datetime({epochmillis: apoc.date.parse("${startDate}","ms","dd/MM/yyyy")})) AND date(datetime({epochmillis: apoc.date.parse(n.startDate,"ms","dd-MM-yyyy")}))<=date(datetime({epochmillis: apoc.date.parse("${endDate}","ms","dd/MM/yyyy")})) `;
    }
  }

  queryOrder =
    ' ORDER BY date(datetime({epochmillis: apoc.date.parse(n.startDate,"ms","dd-MM-yyyy")})) ';

  if (
    typeof parameters.orderDesc !== 'undefined' &&
    parameters.orderDesc === 'true'
  ) {
    queryOrder += ' DESC';
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
  let currentPage = page;
  if (page === 0) {
    currentPage = 1;
  }

  let skip = limit * queryPage;
  if (queryParams !== '') {
    queryParams = `WHERE ${queryParams}`;
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
* @api {get} /temporal Get temporal
* @apiName get temporal
* @apiGroup Temporals
*
* @apiParam {string} _id The _id of the requested temporal
*
* @apiExample {request} Example:
http://localhost:5100/api/temporal?_id=2514
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"2514","label":"00s","startDate":"1990","endDate":"1999","format":"","createdBy":"260","createdAt":"2020-01-17T10:07:49.237Z","updatedBy":"260","updatedAt":"2020-01-17T10:07:49.237Z","events":[]},"error":[],"msg":"Query results"}
*/
const getTemporal = async (req, resp) => {
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
  let query = 'MATCH (n:Temporal) WHERE id(n)=' + _id + ' return n';
  let temporal = await session
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
  if (typeof temporal !== 'undefined') {
    let events = await helpers.loadRelations(_id, 'Temporal', 'Event', false);
    let organisations = await helpers.loadRelations(
      _id,
      'Event',
      'Organisation',
      true
    );
    let people = await helpers.loadRelations(
      _id,
      'Temporal',
      'Person',
      false,
      null,
      'rn.lastName'
    );
    let resources = await helpers.loadRelations(
      _id,
      'Temporal',
      'Resource',
      false
    );

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

    temporal.events = events;
    temporal.organisations = organisations;
    temporal.people = people;
    temporal.resources = resources;
    temporal.classpieces = classpieces;

    resp.json({
      status: true,
      data: temporal,
      error: [],
      msg: 'Query results',
    });
  } else {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Date not available!',
    });
  }
};

module.exports = {
  getTemporals: getTemporals,
  getTemporal: getTemporal,
};
