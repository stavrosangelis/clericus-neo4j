const driver = require("../config/db-driver");
const helpers = require("../helpers");

/**
* @api {get} /graph Get graph
* @apiName get graph
* @apiGroup Network graph
*
* @apiParam {boolean} [events] Whether to load events data.
* @apiParam {boolean} [organisations] Whether to load organisations data.
* @apiParam {boolean} [people] Whether to load people data.
* @apiParam {boolean} [resources] Whether to load resources data.
* @apiSuccessExample {json} Success-Response:
{
	"status": true,
	"data": {
		"nodes": [...],
		"links": [...]
	},
	"error": [],
	"msg": "Query results"
}
*/
const getGraphData = async (req, resp) => {
  let params = req.query;
  let eventsLoad = true;
  let organisationsLoad = true;
  let peopleLoad = true;
  let resourcesLoad = true;
  if (typeof params.events!=="undefined") {
    eventsLoad = params.events;
  }
  if (typeof params.organisations!=="undefined") {
    organisationsLoad = params.organisations;
  }
  if (typeof params.people!=="undefined") {
    peopleLoad = params.people;
  }
  if (typeof params.resources!=="undefined") {
    resourcesLoad = params.resources;
  }
  let events = [];
  let eventsRelations = [];
  let organisations = [];
  let organisationsRelations = [];
  let people = [];
  let peopleRelations = [];
  let resources = [];
  let resourcesRelations = [];
  if (eventsLoad==="true") {
    let eventsPromise = await loadNodes("MATCH (n:Event), (n)-[r]-() RETURN n, count(r) as count");
    events = helpers.normalizeGraphRecordsOutput(eventsPromise.records);
    eventsRelations = await loadNodes("MATCH (n:Event)-[r]-() RETURN r");
    if (typeof eventsRelations.records!=="undefined")
      eventsRelations = helpers.normalizeRelationsOutput(eventsRelations.records);
  }
  if (organisationsLoad==="true") {
    let organisationsPromise = await loadNodes("MATCH (n:Organisation), (n)-[r]-() RETURN n, count(r) as count");
    organisations = helpers.normalizeGraphRecordsOutput(organisationsPromise.records);
    organisationsRelations = await loadNodes("MATCH (n:Organisation)-[r]-() RETURN r");
    if (typeof organisationsRelations.records!=="undefined")
      organisationsRelations = helpers.normalizeRelationsOutput(organisationsRelations.records);
  }
  if (peopleLoad==="true") {
    peoplePromise = await loadNodes("MATCH (n:Person), (n)-[r]-() RETURN n, count(r) as count");
    people = helpers.normalizeGraphRecordsOutput(peoplePromise.records);
    peopleRelations = await loadNodes("MATCH (n:Person)-[r]-() RETURN r");
    if (typeof peopleRelations.records!=="undefined")
      peopleRelations = helpers.normalizeRelationsOutput(peopleRelations.records);
  }
  if (resourcesLoad==="true") {
    let resourcesPromise = await loadNodes("MATCH (n:Resource), (n)-[r]-() RETURN n, count(r) as count");
    resources = helpers.normalizeGraphRecordsOutput(resourcesPromise.records);
    resourcesRelations = await loadNodes("MATCH (n:Resource)-[r]-() RETURN r");
    if (typeof resourcesRelations.records!=="undefined")
      resourcesRelations = helpers.normalizeRelationsOutput(resourcesRelations.records);
  }
  let nodes = [];
  let links = [];
  let linksRecords = [];
  let nodesIds = [];
  let eventNodes = events.map(item=> {
    let count = item.count;
    let size = 100 + (100*count);
    let newNode = {
      id: item._id,
      label: item.label,
      itemId: item._id,
      type: 'event',
      symbolType: 'circle',
      color: '#f9cd1b',
      strokeColor: '#c9730a',
      labelProperty: 'label',
      count: item.count,
      size: size
    }
    if (nodesIds.indexOf(item._id)===-1) {
      nodesIds.push(item._id)
    }
    return newNode;
  });

  let organisationNodes = organisations.map(item=> {
    let count = item.count;
    let size = 100 + (100*count);
    let newNode = {
      id: item._id,
      label: item.label,
      itemId: item._id,
      type: 'organisation',
      symbolType: 'diamond',
      color: '#9b8cf2',
      strokeColor: '#5343b7',
      labelProperty: 'label',
      count: count,
      size: size
    };
    if (nodesIds.indexOf(item._id)===-1) {
      nodesIds.push(item._id)
    }
    return newNode;
  });

  let peopleNodes = people.map(item=> {
    let count = item.count;
    let size = 100 + (100*count);
    let label = item.label;
    let newNode = {
      id: item._id,
      label: label,
      itemId: item._id,
      type: 'person',
      symbolType: 'wye',
      color: '#5dc910',
      strokeColor: '#519b1b',
      labelProperty: 'label',
      count: count,
      size: size
    }
    if (nodesIds.indexOf(item._id)===-1) {
      nodesIds.push(item._id)
    }
    return newNode;
  });

  let resourcesNodes = resources.map(item=> {
    let count = item.count;
    let size = 100 + (100*count);
    let newNode = {
      id: item._id,
      label: item.label,
      itemId: item._id,
      type: 'resource',
      symbolType: 'square',
      color: '#00cbff',
      strokeColor: '#0982a0',
      labelProperty: 'label',
      count: count,
      size: size
    }
    if (nodesIds.indexOf(item._id)===-1) {
      nodesIds.push(item._id)
    }
    return newNode;
  });

  nodes.push(eventNodes);
  nodes.push(organisationNodes);
  nodes.push(peopleNodes);
  nodes.push(resourcesNodes);
  nodes = flattenDeep(nodes)

  eventsRelations = eventsRelations.filter(rel=> {
    if (nodesIds.indexOf(rel.start)>-1 && nodesIds.indexOf(rel.end)>-1)
    return rel;
  })
  organisationsRelations = organisationsRelations.filter(rel=> {
    if (nodesIds.indexOf(rel.start)>-1 && nodesIds.indexOf(rel.end)>-1)
    return rel;
  });
  peopleRelations = peopleRelations.filter(rel=> {
    if (nodesIds.indexOf(rel.start)>-1 && nodesIds.indexOf(rel.end)>-1)
    return rel;
  });
  resourcesRelations = resourcesRelations.filter(rel=> {
    if (nodesIds.indexOf(rel.start)>-1 && nodesIds.indexOf(rel.end)>-1)
    return rel;
  });

  linksRecords.push(eventsRelations);
  linksRecords.push(organisationsRelations);
  linksRecords.push(peopleRelations);
  linksRecords.push(resourcesRelations);
  linksRecords = flattenDeep(linksRecords);
  links = parseReferences(linksRecords);
  let responseData = {
    nodes: nodes,
    links: links
  }
  resp.json({
    status: true,
    data: responseData,
    error: [],
    msg: "Query results",
  })
}

const loadNodes = async (query) => {
  let session = driver.session();
  let nodes = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result;
  });
  return nodes;
}

const parseReferences = (refs) =>{
  let output = refs.map(ref=> {
    let newRef = {
      source: ref.start,
      target: ref.end,
      refId: ref.identity,
      label: ref.type,
      labelProperty: 'refLabel',
      renderLabel: true
    };
    return newRef;
  });
  return output;
}

const flattenDeep = (arr1) => {
   return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
}
/**
* @api {get} /related-nodes Get related nodes
* @apiName get related-nodes
* @apiGroup Network graph
*
* @apiParam {string} _id The id of the source node.
* @apiParam {number=1..6} [steps] The number of steps to take in the graph to get the related nodes
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":[{"lastName":"Alamain","firstName":"Colm","honorificPrefix":[""],"middleName":"","label":"Colm  Alamain","alternateAppelations":[],"status":false,"_id":"45","systemLabels":["Person"]},{"firstName":"Tomas","lastName":"O Hogain","honorificPrefix":[""],"middleName":"","label":"Tomas  O Hogain","alternateAppelations":[],"status":false,"_id":"187","systemLabels":["Person"]}],"error":[],"msg":"Query results"}*/
const getRelatedNodes = async(req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id==="undefined") {
    resp.json({
      status: false,
      data: [],
      error: "Please provide a valid node id to continue",
      msg: "Query results",
    });
    return false;
  }
  let _id = parameters._id;
  let steps = 1;
  if (typeof parameters.steps!=="undefined") {
    steps = parseInt(parameters.steps,10);
    if (steps>6) {
      steps = 6;
    }
  }
  // 1. query for node
  let session = driver.session();
  let query = "MATCH (n)-[*.."+steps+"]->(rn) WHERE id(n)="+_id+" AND NOT id(rn)="+_id+" RETURN distinct rn ORDER BY rn.label";

  let results = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    return result.records;
  });
  let relatedNodes = helpers.normalizeRecordsOutput(results);
  resp.json({
    status: true,
    data: relatedNodes,
    error: [],
    msg: "Query results",
  });
}

module.exports = {
  getGraphData: getGraphData,
  getRelatedNodes: getRelatedNodes,
};
