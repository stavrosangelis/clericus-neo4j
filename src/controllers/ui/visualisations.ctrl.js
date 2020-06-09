const driver = require("../../config/db-driver");
const helpers = require("../../helpers");
const fs = require('fs');
const archivePath = process.env.ARCHIVEPATH;
const TaxonomyTerm = require("../taxonomyTerm.ctrl").TaxonomyTerm;
const schedule = require('node-schedule');
const d3 = require("d3");
const d32 = require("d3-force-reuse");
const { performance } = require('perf_hooks');

const getGraphNetwork = async (req, resp) => {
  let params = req.query;
  let networkFileDir = `${archivePath}network-graph.json`;
  let file = await helpers.readJSONFile(networkFileDir);
  //produceGraphNetwork();
  resp.json({
    status: true,
    data: JSON.stringify(file.data),
    error: [],
    msg: "Query results",
  })
}

const produceGraphNetwork = async () => {
  let t0 = performance.now()
  let classpieceTerm = new TaxonomyTerm({labelId: "Classpiece"});
  await classpieceTerm.load();
  let query = `OPTIONAL MATCH (n1:Event) WHERE n1.status='public'
  WITH collect(distinct n1) as c1
  OPTIONAL MATCH (n2:Organisation) WHERE n2.status='public'
  WITH collect(distinct n2) + c1 as c2
  OPTIONAL MATCH (n3:Person) WHERE n3.status='public'
  WITH collect(distinct n3) + c2 as c3
  OPTIONAL MATCH (n4:Resource) WHERE n4.status='public'
  WITH collect(distinct n4) + c3 as c4
  UNWIND c4 as n
  OPTIONAL MATCH (n)-[r]-(t) WHERE t.status='public' RETURN n, r, t`;
  let resultsPromise = await loadNodes(query);
  let results = prepareItemsOutput(resultsPromise.records);
  let nodes = results.nodes;
  let relations = results.relations;
  let nodesOutput = [];
  for (let i=0;i<nodes.length; i++) {
    let n = nodes[i];
    let count = n.count || 1;
    let size = 20+(10*count);
    let nType = n.type;
    let colors = nodeColors(n.type);
    if (typeof n.systemType!=="undefined" && parseInt(n.systemType,10)===parseInt(classpieceTerm._id,10)) {
      nType = "Classpiece";
    }
    let newNode = {
      id: n._id,
      label: n.label,
      itemId: n._id,
      type: nType,
      color: colors.color,
      strokeColor: colors.strokeColor,
      size: size
    }
    nodesOutput.push(newNode);
  }
  nodesOutput.sort((a, b) =>{
    let akey = a.size;
    let bkey = b.size;
    if (akey<bkey) {
      return -1;
    }
    if (bkey<bkey) {
      return 1;
    }
    return 0;
  });
  let links = [];
  for (let i=0;i<relations.length;i++) {
    let rel = relations[i];
    let link = {
      source: rel.start,
      target: rel.end,
      refId: rel._id,
      label: rel.type,
    };
    links.push(link)
  }
  let t1 = performance.now();
  let diff = t1-t0;
  let data = {
    nodes: nodesOutput,
    links: links,
    statistics: {
      fileCreateTime: diff+"ms"
    }
  }
  let targetDir = `${archivePath}network-graph.json`;
  let writeFile = await new Promise((resolve,reject)=>{
    fs.writeFile(targetDir, JSON.stringify(data), 'utf8', (error) => {
      if (error) throw err;
      console.log('Network graph saved successfully!');
      resolve(true);
    });
  })
  .then(async()=>{
    await graphSimulation(data);
  });
  return writeFile;
}

const graphSimulation = async(data) => {
  let t0 = performance.now();
  let nodes = data.nodes;
  let links = data.links;
  let statistics = data.statistics;
  nodes[0].x = 0;
  nodes[0].y = 0;
  let strength = -500;
  const simulation = d3.forceSimulation(nodes)
    .force("link",
    d3.forceLink(links)
        .id(d => d.id)
        .strength(d=>1)
        .distance(d=>200)
      )
    .force("charge", d32.forceManyBodyReuse().strength(strength))
    .force("center", d3.forceCenter(0, 0))
    .force('collide', d3.forceCollide(60))
    //.alphaDecay(0.06)
    .stop();

  let max = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()));
  for (let i = 0; i < max; i++) {
    simulation.tick();
  }
  delete nodes['update']
  simulation.stop();

  let t1 = performance.now();
  let diff = t1-t0;
  let now = new Date();
  let dateString = now.getUTCFullYear() +"/"+ (now.getUTCMonth()+1) +"/"+ now.getUTCDate() + " " + now.getUTCHours() + ":" + now.getUTCMinutes() + ":" + now.getUTCSeconds();
  let newData = {
    nodes: nodes,
    links: links,
    statistics: {
      fileCreateTime: statistics.fileCreateTime,
      simulationTime: diff+"ms",
    },
    updatedAt: dateString
  }
  let targetDir = `${archivePath}network-graph.json`;
  let writeFile = await new Promise((resolve,reject)=>{
    fs.writeFile(targetDir, JSON.stringify(newData), 'utf8', (error) => {
      if (error) throw err;
      console.log('Network graph simulation completed successfully!');
      resolve(true);
    });
  });
  return writeFile;
}

let cronJob = schedule.scheduleJob('0 4 * * *', async()=> {
  produceGraphNetwork();
});

const getHeatmap = async (req, resp) => {
  let data = [];

  let query = `MATCH (n:Organisation)-[r]->(p:Person) WHERE n.status='public' AND n.organisationType='Diocese' RETURN n, count(r) AS count`;
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  })
  let organisations = prepareOrganisations(nodesPromise);

  // load features
  let featuresDataPath = `${archivePath}documents/dioceses&cathedral-cities-features.json`;
  let featuresData = await fs.readFileSync(featuresDataPath, 'utf8');
  featuresData = JSON.parse(featuresData);
  for (let i=0;i<organisations.length; i++) {
    let organisation = organisations[i];
    organisation.features = null;
    let features = featuresData.find(o=>o.diocese===organisation.label);
    if (typeof features!=="undefined") {
      organisation.features = features;
    }
  }
  resp.json({
    status: true,
    data: organisations,
    error: [],
    msg: "Query results",
  })
}

const prepareOrganisations = (records) => {
  let output = [];
  for (let i=0; i<records.length; i++) {
    let record = records[i];
    let labels = null;
    if (typeof record._fields[0].labels!=="undefined") {
      labels = record._fields[0].labels;
    }
    let key = record.keys[0];
    helpers.prepareOutput(record);
    let recordObject = record.toObject();
    let outputItem = helpers.outputRecord(recordObject[key]);
    if (labels!==null) {
      outputItem.systemLabels = labels;
    }
    outputItem.count = recordObject.count;
    output.push(outputItem)
  }
  return output;
}

const getItemNetwork = async (req, resp) => {
  let params = req.query;
  let _id = 0;
  if (typeof params._id==="undefined" || params._id==="") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id to continue.",
    });
    return false;
  }
  else {
    _id = params._id;
  }
  if (typeof params.step!=="undefined" || params.step==="") {
    step = parseInt(params.step,10);
    if (step<1) step=1;
    if (step>6) step=6;
  }
  // nodes
  let query = `MATCH (n) WHERE id(n)=${_id} AND n.status='public'
  OPTIONAL MATCH (n)-[r*..${step}]->(t) WHERE t.status='public' RETURN n, r, t`;
  let nodesPromise = await loadNodes(query);
  let results = prepareItemOutput(nodesPromise.records);
  let nodes = [];
  let links = [];
  let item = results.node;
  let colors = nodeColors(item.type);
  let classpieceTerm = new TaxonomyTerm({labelId: "Classpiece"});
  await classpieceTerm.load();
  let itemType = item.type;
  if (typeof item.systemType!=="undefined" && item.systemType===classpieceTerm._id) {
    itemType = "classpiece";
  }
  let nodeOutput = {
    id: item._id,
    label: item.label,
    itemId: item._id,
    type: item.type,
    color: colors.color,
    strokeColor: colors.strokeColor,
    size: 40
  }
  nodes.push(nodeOutput);

  let relations = results.relations;
  let nodeIds = [item._id];
  for (let l=0;l<relations.length; l++) {
    let relation = relations[l];
    if (relation!==null) {
      if (relation.target!==null) {
        let targetId = relation.target._id;
        if (nodeIds.indexOf(targetId)===-1) {
          nodeIds.push(targetId);
        }
      }
    }
  }

  let allowedTypes = ["Event", "Organisation", "Person", "Resource"];
  /*for (let i=0;i<relations.length; i++) {
    let relation = relations[i];
    let ref = relation.relation[0];
    let target = relation.target;
    let targetType = target.type;
    if (target!==null) {
      if (allowedTypes.indexOf(targetType)>-1) {
        let newRelation = {
          source: ref.start,
          target: ref.end,
          refId: ref._id,
          label: ref.type,
        };
        if (typeof target.systemType!=="undefined" && target.systemType===classpieceTerm._id) {
          targetType = "Classpiece";
        }
        let colors = nodeColors(targetType);
        let newTarget = {
          id: target._id,
          label: target.label,
          itemId: target._id,
          type: targetType,
          color: colors.color,
          strokeColor: colors.strokeColor,
          size: 30
        }
        if (nodeIds.indexOf(ref.start)>-1 && nodeIds.indexOf(ref.end)) {
          links.push(newRelation);
          nodes.push(newTarget);
        }
      }
    }

  }*/
  if (step>0) {
    let nodeIds = [];
    let relatedNodes = await loadRelatedNodes(_id, step);
    for (let j=0;j<relatedNodes.length; j++) {
      let relatedNode = relatedNodes[j];
      let type = relatedNode.type;
      if (allowedTypes.indexOf(type)>-1 && nodeIds.indexOf(relatedNode._id)===-1) {
        nodeIds.push(relatedNode._id);
        let newRelation = {
          source: item._id,
          target: relatedNode._id,
          refId: `ref_${item._id}_${relatedNode._id}`,
          label: "",
        };
        if (typeof relatedNode.systemType!=="undefined" && relatedNode.systemType===classpieceTerm._id) {
          type = "Classpiece";
        }
        let colors = nodeColors(type);
        let newTarget = {
          id: relatedNode._id,
          label: relatedNode.label,
          itemId: relatedNode._id,
          type: type,
          color: colors.color,
          strokeColor: colors.strokeColor,
          size: 30
        }
        links.push(newRelation);
        nodes.push(newTarget);
      }
    }
  }

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

const prepareItemsOutput = (records) => {
  let nodesIds = [];
  let relationsPairs = [];
  let results = [];
  let nodes = [];
  let relations = [];
  let allowedTypes = ["Event", "Organisation", "Person", "Resource"];
  for (let i=0; i<records.length; i++) {
    let record = records[i];
    helpers.prepareOutput(record);
    let recordObject = record.toObject();
    let node = helpers.outputRecord(recordObject['n']);
    if (typeof recordObject['n'].labels!=="undefined") {
      node.type = recordObject['n'].labels[0];
    }
    let target = null;
    if (recordObject['t']!==null && recordObject['t']!==0) {
      target = helpers.outputRecord(recordObject['t']);
      if (typeof recordObject['t'].labels!=="undefined") {
        target.type = recordObject['t'].labels[0];
      }
    }
    let relation = null;
    if (recordObject['r']!==null) {
      relation = helpers.outputRelation(recordObject['r']);
    }
    if (nodesIds.indexOf(node._id)===-1) {
      nodesIds.push(node._id);
      nodes.push(node);
    }
    if (target!==null && target._id!==0) {
      if (nodesIds.indexOf(target._id)===-1 && allowedTypes.indexOf(target.type)>-1) {
        nodesIds.push(target._id);
        nodes.push(target);
      }
      let pair = `${relation.start},${relation.end}`;
      let reversePair = `${relation.end},${relation.start}`;
      if (relationsPairs.indexOf(pair)===-1 && relationsPairs.indexOf(reversePair)===-1) {
        relationsPairs.push(pair);
        relations.push(relation);
      }
    }
  }

  let relationsOutput = relations.filter(rel=> {
    if (nodesIds.indexOf(rel.start)>-1 && nodesIds.indexOf(rel.end)>-1) {
      return true;
    }
    return false;
  });
  for (let i=0; i<nodes.length; i++) {
    let n = nodes[i];
    let count = 1;
    let countQuery = relationsOutput.find(r=>{
      if (r.start===n._id || r.end===n.id) {
        return true;
      }
      return false;
    });
    if (typeof countQuery!=="undefined") {
      count = countQuery.length;
    }
  }
  return {nodes: nodes, relations: relationsOutput};
}

const prepareItemOutput = (records) => {
  let results = [];
  for (let i=0; i<records.length; i++) {
    let record = records[i];
    helpers.prepareOutput(record);
    let recordObject = record.toObject();
    let node = helpers.outputRecord(recordObject['n']);
    if (typeof recordObject['n'].labels!=="undefined") {
      node.type = recordObject['n'].labels[0];
    }
    let target = null;
    if (recordObject['t']!==null) {
      target = helpers.outputRecord(recordObject['t']);
      if (typeof recordObject['t'].labels!=="undefined") {
        target.type = recordObject['t'].labels[0];
      }
    }

    // relations are strange
    let relation = null;
    if (recordObject['r']!==null) {
      relation = helpers.outputRelation(recordObject['r']);
    }
    results.push({
      node: node,
      relation: relation,
      target: target,
    });
  }
  let node = results[0].node;
  let relations = results.map(r=>{
    return {
      relation: r.relation,
      target: r.target
    }
  });
  let output = {
    node: node,
    relations: relations
  }
  return output;
}

const nodeColors = (type) =>{
  let colors = {
    "Event":{
      color: '#f9cd1b',
      strokeColor: '#c9730a'
    },
    "Organisation":{
      color: '#9b8cf2',
      strokeColor: '#5343b7'
    },
    "Person":{
      color: '#5dc910',
      strokeColor: '#519b1b'
    },
    "Resource":{
      color: '#00cbff',
      strokeColor: '#0982a0'
    }
    ,
    "Classpiece":{
      color: '#1ed8bf',
      strokeColor: '#1e9dd8'
    }
  }
  return colors[type];
}

const getRelatedNodes = async(req, resp) => {
  let params = req.query;
  if (typeof params._id==="undefined") {
    resp.json({
      status: false,
      data: [],
      error: "Please provide a valid node id to continue",
      msg: "Query results",
    });
    return false;
  }
  let _id = params._id;
  let step = 1;
  if (typeof params.step!=="undefined" || params.step==="") {
    step = parseInt(params.step,10);
    if (step<1) step=1;
    if (step>6) step=6;
  }
  let relatedNodes = await loadRelatedNodes(_id, step);
  let classpieceTerm = new TaxonomyTerm({labelId: "Classpiece"});
  await classpieceTerm.load();
  for (let i=0;i<relatedNodes.length;i++) {
    let relatedNode = relatedNodes[i];
    if (relatedNode.type==="Resource" && relatedNode.systemType===classpieceTerm._id) {
      relatedNode.type = "Classpiece";
    }
  }
  resp.json({
    status: true,
    data: relatedNodes,
    error: [],
    msg: "Query results",
  });
};

const getRelatedPaths = async(req, resp) => {
  let params = req.query;
  if (typeof params.sourceId==="undefined" || typeof params.targetId==="undefined") {
    resp.json({
      status: false,
      data: [],
      error: "Please provide a valid source and target id to continue",
      msg: "Query results",
    });
    return false;
  }
  if (typeof params.step!=="undefined" || params.step==="") {
    step = parseInt(params.step,10);
    if (step<1) step=1;
    if (step>6) step=6;
  }
  let sourceId = params.sourceId;
  let targetId = params.targetId;
  let session = driver.session();
  let query = `MATCH (n) WHERE id(n)=${sourceId} AND n.status='public'
  MATCH (t) WHERE id(t)=${targetId} AND t.status='public'
  MATCH p=allShortestPaths((n)-[*..${step}]->(t)) RETURN p ORDER BY length(p) SKIP 0 LIMIT 25`;
  let results = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    return result.records;
  });
  let relatedNodes = await normalizeRelatedPathsOutput(results);
  resp.json({
    status: true,
    data: relatedNodes ,
    error: [],
    msg: "Query results",
  });
};

const loadRelatedNodes = async(_id, step) => {
	let session = driver.session();
  let query = `MATCH (n)-[*..${step}]->(rn) WHERE id(n)=${_id} AND n.status='public' AND rn.status='public' AND NOT id(rn)=${_id} RETURN distinct rn ORDER BY rn.label`;
  let results = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    return result.records;
  });
  let relatedNodes = normalizeRelatedRecordsOutput(results);
	return relatedNodes;
}

const normalizeRelatedRecordsOutput = (records) => {
  let output = [];
  for (let i=0; i<records.length; i++) {
    let record = records[i];
    helpers.prepareOutput(record);
    let recordObject = record.toObject();
    let node = recordObject['rn'];
    let outputItem = helpers.outputRecord(node);
    if (typeof node.labels!=="undefined") {
      outputItem.type = node.labels[0];
    }
    output.push(outputItem)
  }
  return output;
}

const normalizeRelatedPathsOutput = async(records) => {
  let paths = [];
  let classpieceTerm = new TaxonomyTerm({labelId: "Classpiece"});
  await classpieceTerm.load();
  for (let i=0; i<records.length; i++) {
    let record = records[i];
    helpers.prepareOutput(record);
    let recordObject = record.toObject();
    let path = recordObject['p']
    let source = path.start;
    if (typeof source.labels!=="undefined") {
      if (source.labels[0]==="Resource" && source.properties.systemType===classpieceTerm._id) {
        source.properties.type = "Classpiece";
      }
      else source.properties.type = source.labels[0];
    }
    helpers.prepareOutput(source);
    source = helpers.outputRecord(source);
    let target = path.end;
    if (typeof target.labels!=="undefined") {
      if (target.labels[0]==="Resource" && target.properties.systemType===classpieceTerm._id) {
        target.properties.type = "Classpiece";
      }
      else target.properties.type = target.labels[0];
    }
    helpers.prepareOutput(target);
    target = helpers.outputRecord(target);
    let segments = path.segments
      //.filter(s=>s.start.properties.status==="public" && s.end.properties.status==="public")
      .map(s=>normalizeSegment(s,classpieceTerm));
    paths.push({source: source, target: target, segments: segments})
  }
  return paths;
}

const normalizeSegment = (segment, classpieceTerm) => {
  let source = segment.start;
  if (typeof source.labels!=="undefined") {
    if (source.labels[0]==="Resource" && source.properties.systemType===classpieceTerm._id) {
      source.properties.type = "Classpiece";
    }
    else source.properties.type = source.labels[0];
  }
  helpers.prepareOutput(source);
  source = helpers.outputRecord(source);
  let target = segment.end;
  if (typeof target.labels!=="undefined") {
    if (target.labels[0]==="Resource" && target.properties.systemType===classpieceTerm._id) {
      target.properties.type = "Classpiece";
    }
    else target.properties.type = target.labels[0];
  }
  helpers.prepareOutput(target);
  target = helpers.outputRecord(target);
  let relationship = segment.relationship;
  helpers.prepareOutput(relationship);
  relationship = helpers.outputRelation(relationship);
  let triple = {
    source: source,
    relationship: relationship,
    target: target,
  }

  return triple;
}

const getTimeline = async(req,resp) => {
  let session = driver.session();
  let query = `MATCH (e:Event)-->(t:Temporal) WHERE e.status='public' RETURN distinct t,e ORDER BY date(datetime({epochmillis: apoc.date.parse(t.startDate,"ms","dd-MM-yyyy")}))`;
  let results = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    return result.records;
  });
  let temporals = [];
  let events = [];
  let temporalIds = [];
  for (let i=0;i<results.length;i++) {
    let result = results[i];
    helpers.prepareOutput(result);
    let obj = result.toObject();
    let temporal = helpers.outputRecord(obj['t']);
    let event = helpers.outputRecord(obj['e']);
    let tId = temporal._id;
    event.temporalId = tId;
    if (temporalIds.indexOf(tId)===-1) {
      temporalIds.push(tId);
      temporals.push(temporal);
    }
    events.push(event);
  }

  for (let i=0;i<temporals.length; i++) {
    let temporal = temporals[i];
    let temporalEvents = events.filter(e=>e.temporalId===temporal._id);
    if (typeof temporalEvents==="undefined") {
      temporalEvents = [];
    }
    temporal.events = temporalEvents;
  }
  resp.json({
    status: true,
    data: temporals,
    error: [],
    msg: "Query results",
  });
}

const getItemTimeline = async(req,resp) => {
  let params = req.query;
  if (typeof params._id==="undefined") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: ["Please provide a valid _id and type to continue"],
    });
    return false;
  }
  let _id = params._id;
  let session = driver.session();
  let query = `MATCH (p)-->(e:Event) WHERE id(p)=${_id} AND p.status='public' AND e.status='public'
  OPTIONAL MATCH (e)-->(t:Temporal) RETURN distinct t,e ORDER BY date(datetime({epochmillis: apoc.date.parse(t.startDate,"ms","dd-MM-yyyy")}))`;
  let results = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    return result.records;
  });
  let temporals = [];
  let events = [];
  let temporalIds = [];
  for (let i=0;i<results.length;i++) {
    let result = results[i];
    helpers.prepareOutput(result);
    let obj = result.toObject();
    let temporal = helpers.outputRecord(obj['t']);
    let event = helpers.outputRecord(obj['e']);
    let tId = temporal._id;
    event.temporalId = tId;
    if (temporalIds.indexOf(tId)===-1) {
      temporalIds.push(tId);
      temporals.push(temporal);
    }
    events.push(event);
  }

  for (let i=0;i<temporals.length; i++) {
    let temporal = temporals[i];
    let temporalEvents = events.filter(e=>e.temporalId===temporal._id);
    if (typeof temporalEvents==="undefined") {
      temporalEvents = [];
    }
    temporal.events = temporalEvents;
  }
  resp.json({
    status: true,
    data: temporals,
    error: [],
    msg: "Query results",
  });
}

module.exports = {
  getItemNetwork: getItemNetwork,
  getRelatedNodes: getRelatedNodes,
  getRelatedPaths: getRelatedPaths,
  getHeatmap: getHeatmap,
  getGraphNetwork: getGraphNetwork,
  getTimeline: getTimeline,
  getItemTimeline: getItemTimeline,
}
