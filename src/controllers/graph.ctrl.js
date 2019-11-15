const driver = require("../config/db-driver");
const helpers = require("../helpers");

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
    let eventsPromise = await loadNodes("MATCH (n:Event) RETURN n");
    events = helpers.normalizeRecordsOutput(eventsPromise.records);
    eventsRelations = await loadNodes("MATCH (n:Event)-[r]-() RETURN r");
    if (typeof eventsRelations.records!=="undefined")
      eventsRelations = helpers.normalizeRelationsOutput(eventsRelations.records);
  }
  if (organisationsLoad==="true") {
    let organisationsPromise = await loadNodes("MATCH (n:Organisation) RETURN n");
    organisations = helpers.normalizeRecordsOutput(organisationsPromise.records);
    organisationsRelations = await loadNodes("MATCH (n:Organisation)-[r]-() RETURN r");
    if (typeof organisationsRelations.records!=="undefined")
      organisationsRelations = helpers.normalizeRelationsOutput(organisationsRelations.records);
  }
  if (peopleLoad==="true") {
    peoplePromise = await loadNodes("MATCH (n:Person) RETURN n");
    people = helpers.normalizeRecordsOutput(peoplePromise.records);
    peopleRelations = await loadNodes("MATCH (n:Person)-[r]-() RETURN r");
    if (typeof peopleRelations.records!=="undefined")
      peopleRelations = helpers.normalizeRelationsOutput(peopleRelations.records);
  }
  if (resourcesLoad==="true") {
    let resourcesPromise = await loadNodes("MATCH (n:Resource) RETURN n");
    resources = helpers.normalizeRecordsOutput(resourcesPromise.records);
    resourcesRelations = await loadNodes("MATCH (n:Resource)-[r]-() RETURN r");
    if (typeof resourcesRelations.records!=="undefined")
      resourcesRelations = helpers.normalizeRelationsOutput(resourcesRelations.records);
  }
  let nodes = [];
  let links = [];
  let linksRecords = [];
  let nodesIds = [];
  let eventNodes = events.map(item=> {
    let count = 1
    let size = 100 + (10*count);
    let newNode = {
      id: item._id,
      label: item.label,
      itemId: item._id,
      type: 'event',
      symbolType: 'circle',
      color: '#f9cd1b',
      strokeColor: '#c9730a',
      labelProperty: 'label',
      count: count,
      size: size
    }
    if (nodesIds.indexOf(item._id)===-1) {
      nodesIds.push(item._id)
    }
    return newNode;
  });

  let organisationNodes = organisations.map(item=> {
    let count = 1;
    let size = 100 + (10*count);
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
    let count = 1 ;
    let size = 100 + (10*count);
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
    let count = 1;
    let size = 100 + (10*count);
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

module.exports = {
  getGraphData: getGraphData,
};
