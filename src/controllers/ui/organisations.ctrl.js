const moment = require('moment');
const driver = require('../../config/db-driver');
const {
  prepareOutput,
  loadRelations,
  normalizeRecordsOutput,
  outputRecord,
} = require('../../helpers');
const TaxonomyTerm = require('../taxonomyTerm.ctrl').TaxonomyTerm;

const dateToIsoFormat = (str) => {
  const parts = str.split('-');
  const year = parts[2];
  const month =
    !parts[1].includes('0') && Number(parts[1]) < 10
      ? `0${parts[1]}`
      : parts[1];
  const day =
    !parts[0].includes('0') && Number(parts[0]) < 10
      ? `0${parts[0]}`
      : parts[0];
  return `${year}-${month}-${day}`;
};
/**
* @api {get} /organisations Get organisations
* @apiName get organisations
* @apiGroup Organisations
*
* @apiParam {string} [label] A string to match against the organisations' labels.
* @apiParam {string} [organisationType] An organisation type label.
* @apiParam {string} [orderField=firstName] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiSuccessExample {json} Success-Response:
{
  "status": true,
  "data": {
    "currentPage": 1,
    "data": [{
      "label": "Achadh Conaire",
      "labelSoundex": "A232",
      "alternateAppelations": [],
      "organisationType": "Diocese",
      "status": false,
      "_id": "135",
      "systemLabels": ["Organisation"],
      "resources": []
    }],
    "totalItems": 80,
    "totalPages": 4
  },
  "error": [],
  "msg": "Query results"
}
*/
const getOrganisations = async (req, resp) => {
  let parameters = req.query;
  let label = '';
  let organisationType = '';
  let page = 0;
  let orderField = 'label';
  let queryPage = 0;
  let queryOrder = '';
  let limit = 25;

  let query = '';
  let queryParams = " n.status='public'";

  if (typeof parameters.label !== 'undefined') {
    label = parameters.label;
    if (label !== '') {
      queryParams = "toLower(n.label) =~ toLower('.*" + label + ".*') ";
    }
  }
  if (typeof parameters.orderField !== 'undefined') {
    orderField = parameters.orderField;
  }
  if (typeof parameters.organisationType !== 'undefined') {
    organisationType = parameters.organisationType;
    if (organisationType !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams +=
        "toLower(n.organisationType) =~ toLower('.*" +
        organisationType +
        ".*') ";
    }
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
  let currentPage = page;
  if (page === 0) {
    currentPage = 1;
  }

  let skip = limit * queryPage;
  if (queryParams !== '') {
    queryParams = 'WHERE ' + queryParams;
  }
  query =
    'MATCH (n:Organisation) ' +
    queryParams +
    ' RETURN n ' +
    queryOrder +
    ' SKIP ' +
    skip +
    ' LIMIT ' +
    limit;
  let data = await getOrganisationsQuery(query, queryParams, limit);
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

const getOrganisationsQuery = async (query, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });

  let nodes = normalizeRecordsOutput(nodesPromise);
  // get related resources
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    node.resources = await loadRelations(
      node._id,
      'Organisation',
      'Resource',
      true
    );
  }
  let count = await session
    .writeTransaction((tx) =>
      tx.run('MATCH (n:Organisation) ' + queryParams + ' RETURN count(*)')
    )
    .then((result) => {
      session.close();
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      prepareOutput(countObj);
      let output = countObj['count(*)'];
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

/**
* @api {get} /organisation Get organisation
* @apiName get organisation
* @apiGroup Organisations
*
* @apiParam {string} _id The _id of the requested organisation.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"375","label":"Cill Da Lua","labelSoundex":"C434","description":null,"organisationType":"Diocese","status":false,"alternateAppelations":[],"createdBy":null,"createdAt":null,"updatedBy":null,"updatedAt":null,"events":[],"organisations":[],"people":[],"resources":[]},"error":[],"msg":"Query results"}
*/
const getOrganisation = async (req, resp) => {
  const parameters = req.query;
  if (typeof parameters._id === 'undefined' || parameters._id === '') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
    return false;
  }
  const _id = parameters._id;
  const session = driver.session();
  const query =
    'MATCH (n:Organisation) WHERE id(n)=' +
    _id +
    " AND n.status='public' return n";
  const organisation = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
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
  session.close();
  if (typeof organisation !== 'undefined') {
    const events = await loadRelations(_id, 'Organisation', 'Event', true);
    const organisations = await loadRelations(
      _id,
      'Organisation',
      'Organisation',
      true
    );
    const people = await loadRelations(
      _id,
      'Organisation',
      'Person',
      true,
      null,
      'rn.lastName'
    );
    const resources = await loadRelations(
      _id,
      'Organisation',
      'Resource',
      true
    );
    const spatial = await loadRelations(_id, 'Organisation', 'Spatial', false);

    for (let i = 0; i < events.length; i++) {
      const eventItem = events[i];
      eventItem.temporal = await loadRelations(
        eventItem.ref._id,
        'Event',
        'Temporal',
        true
      );
      if (eventItem.temporal.length > 0) {
        eventItem.temporal.sort((a, b) => {
          const { startDate: akey = null } = a.ref;
          const { startDate: bkey = null } = b.ref;
          if (akey !== null && bkey !== null) {
            const aDate = moment(dateToIsoFormat(akey));
            const bDate = moment(dateToIsoFormat(bkey));
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
    events.sort((a, b) => {
      const akey = a.temporal[0]?.ref?.startDate || null;
      const bkey = b.temporal[0]?.ref?.startDate || null;
      if (akey !== null && bkey !== null) {
        const aDate = moment(dateToIsoFormat(akey));
        const bDate = moment(dateToIsoFormat(bkey));
        if (aDate.diff(bDate) > 0) {
          return 1;
        } else {
          return -1;
        }
      }
      return 0;
    });
    organisation.events = events;
    organisation.organisations = organisations;
    organisation.people = people;
    organisation.resources = resources;
    organisation.classpieces = classpieces;
    organisation.spatial = spatial;
    resp.json({
      status: true,
      data: organisation,
      error: [],
      msg: 'Query results',
    });
  } else {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Organisation not available!',
    });
  }
};

const getOrganisationsActiveFilters = async (req, resp) => {
  let parameters = req.body;
  let _ids = [];
  if (typeof parameters._ids !== 'undefined' && parameters._ids.length > 0) {
    _ids = parameters._ids;
  }
  let query = `MATCH (o:Organisation)-->(n) WHERE o.status='public' AND id(o) IN [${_ids}] AND (n:Event OR n:Organisation OR n:Person OR n:Resource OR n:Temporal OR n:Spatial) RETURN DISTINCT id(n) AS _id, n.label AS label, labels(n) as labels`;
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });

  let nodes = nodesPromise.map((record) => {
    prepareOutput(record);
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

const getOrganisationsFilters = async (req, resp) => {
  const session = driver.session();
  const query = `MATCH (o:Organisation {status:'public'})-[r]-(t) RETURN DISTINCT id(o) AS _id, o.label AS label`;
  const nodes = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      let output = [];
      if (result.records.length > 0) {
        const records = [];
        for (let i = 0; i < result.records.length; i += 1) {
          const record = result.records[i].toObject();
          prepareOutput(record);
          records.push(record);
        }
        output = records;
      }
      return output;
    });
  session.close();
  resp.json({
    status: true,
    data: nodes,
    error: [],
    msg: 'Query results',
  });
};

module.exports = {
  getOrganisations: getOrganisations,
  getOrganisation: getOrganisation,
  getOrganisationsActiveFilters: getOrganisationsActiveFilters,
  getOrganisationsFilters: getOrganisationsFilters,
};
