const driver = require("../config/db-driver");
const helpers = require("../helpers");
/**
* @api {get} /graph Get graph
* @apiName get graph
* @apiGroup Network graph
*
* @apiParam {boolean} [events=true] Whether to load events data.
* @apiParam {boolean} [organisations=true] Whether to load organisations data.
* @apiParam {boolean} [people=true] Whether to load people data.
* @apiParam {boolean} [resources=true] Whether to load resources data.
*
* @apiExample {request} Example:
* http://localhost:5100/api/graph?events=true&organisations=true&people=true&resources=true
*
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
		// nodes
		let eventsQuery = `MATCH (n:Event), (n)-[r]-() WHERE n.status='public' RETURN n, count(r) as count`;
		let eventsCount = await countNodes(`MATCH (n:Event) WHERE n.status='public' RETURN count(n) as count`);
		let eventsPromise = await loadBatch(eventsQuery, eventsCount);
  	events = helpers.normalizeGraphRecordsOutput(eventsPromise);

		// relations
		let eventsRQuery = `MATCH (n:Event)-[r]-(o) WHERE n.status='public' AND o.status='public' RETURN r`;
		let eventsRCount = await countNodes(`MATCH (n:Event)-[r]-(o) WHERE n.status='public' AND o.status='public' RETURN count(r) as count`);
    eventsRelations = await loadBatch(eventsRQuery,eventsRCount);
    eventsRelations = helpers.normalizeRelationsOutput(eventsRelations);
  }
  if (organisationsLoad==="true") {
		// nodes
		let organisationsQuery = `MATCH (n:Organisation), (n)-[r]-() WHERE n.status='public' RETURN n, count(r) as count`;
		let organisationsCount = await countNodes(`MATCH (n:Organisation) WHERE n.status='public' RETURN count(n) as count`);
    let organisationsPromise = await loadBatch(organisationsQuery, organisationsCount);
    organisations = helpers.normalizeGraphRecordsOutput(organisationsPromise);

		// relations
		let organisationsRQuery = `MATCH (n:Organisation)-[r]-(o) WHERE n.status='public' AND o.status='public' RETURN r`;
		let organisationsRCount = await countNodes(`MATCH (n:Organisation)-[r]-(o) WHERE n.status='public' AND o.status='public' RETURN count(r) as count`);
    organisationsRelations = await loadBatch(organisationsRQuery, organisationsRCount);
    organisationsRelations = helpers.normalizeRelationsOutput(organisationsRelations);
  }
  if (peopleLoad==="true") {
		// nodes
		let peopleQuery = `MATCH (n:Person), (n)-[r]-() WHERE n.status='public' RETURN n, count(r) as count`;
		let peopleCount = await countNodes(`MATCH (n:Person) WHERE n.status='public' RETURN count(n) as count`);
    let peoplePromise = await loadBatch(peopleQuery, peopleCount);
  	people = helpers.normalizeGraphRecordsOutput(peoplePromise);

		// relations
		let peopleRQuery = `MATCH (n:Person)-[r]-(o) WHERE n.status='public' AND o.status='public' RETURN r`;
		let peopleRCount = await countNodes(`MATCH (n:Person)-[r]-(o) WHERE n.status='public' AND o.status='public' RETURN count(r) as count`);
    peopleRelations = await loadBatch(peopleRQuery, peopleRCount);
    peopleRelations = helpers.normalizeRelationsOutput(peopleRelations);
  }
  if (resourcesLoad==="true") {
		// nodes
		let resourcesQuery = `MATCH (n:Resource), (n)-[r]-() WHERE n.status='public' RETURN n, count(r) as count`;
		let resourcesCount = await countNodes(`MATCH (n:Resource) WHERE n.status='public' RETURN count(n) as count`);
    let resourcesPromise = await loadBatch(resourcesQuery, resourcesCount);
    resources = helpers.normalizeGraphRecordsOutput(resourcesPromise);

		// relations
		let resourcesRQuery = `MATCH (n:Resource)-[r]-(o) WHERE n.status='public' AND o.status='public' RETURN r`;
		let resourcesRCount = await countNodes(`MATCH (n:Resource)-[r]-(o) WHERE n.status='public' AND o.status='public' RETURN count(r) as count`);
    resourcesRelations = await loadBatch(resourcesRQuery, resourcesRCount);
    resourcesRelations = helpers.normalizeRelationsOutput(resourcesRelations);
  }

  let nodes = [];
  let links = [];
  let linksRecords = [];
  let nodesIds = [];
  let eventNodes = [];
	for (let i=0;i<events.length; i++) {
		let item = events[i];
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
		eventNodes.push(newNode);
	}

  let organisationNodes = [];
	for (let i=0;i<organisations.length; i++) {
		let item = organisations[i];
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
	  organisationNodes.push(newNode);
	}

  let peopleNodes = [];
	for (let i=0;i<people.length; i++) {
		let item = people[i];
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
    peopleNodes.push(newNode);
	}

  let resourcesNodes = [];
	for (let i=0;i<resources.length; i++) {[];
		let item = resources[i];
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
    resourcesNodes.push(newNode);
	}

  nodes = [...eventNodes, ...organisationNodes, ...peopleNodes, ...resourcesNodes];

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
	linksRecords = [...eventsRelations, ...organisationsRelations, ...peopleRelations, ...resourcesRelations];

  links = parseReferences(linksRecords);

  let responseData = {
    nodes: nodes,
    links: links
  }

  resp.json({
    status: true,
    data: JSON.stringify(responseData),
    error: [],
    msg: "Query results",
  })
}

const loadBatch = async (query=null, count=0) => {
	if (query===null || count===0) {
		return [];
	}
	let skip = 0;
	let limit = 500;
	let results = [];
	let result = await loadNodes(query+` SKIP ${skip} LIMIT ${limit}`);
	if (typeof result.records!=="undefined") {
		results.push(result.records)
	}
	if (count>limit) {
		for (var i=0; i<count; i+=limit) {
			if (i>=limit) {
				skip = skip+limit;
				limit = limit+limit;
				if (limit>count) {
					limit=count
				}
				let query2 = query+` SKIP ${skip} LIMIT ${limit}`;
				let result2 = await loadNodes(query2);
				if (typeof result2.records!=="undefined") {
					results.push(result2.records);
				}
			}
		}
	}
	return flattenDeep(results);
}

const countNodes = async (query) => {
	let session = driver.session();
  let count = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
		let resultRecord = result.records[0];
    let countObj = resultRecord.toObject();
    helpers.prepareOutput(countObj);
    let output = countObj['count'];
    return parseInt(output,10);
  });
  return count;
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
* @apiParam {number=1..6} [steps] The number of steps to take in the graph to get the related nodes*
* @apiExample {request} Example:
* http://localhost:5100/api/related-nodes?_id=34&steps=1
*
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
  let query = "MATCH (n)-[*.."+steps+"]->(rn) WHERE id(n)="+_id+" AND n.status='public' AND rn.status='public' AND NOT id(rn)="+_id+" RETURN distinct rn ORDER BY rn.label";

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
