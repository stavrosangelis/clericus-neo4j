const driver = require("../../config/db-driver");
const helpers = require("../../helpers");
const fs = require('fs');
const archivePath = process.env.ARCHIVEPATH;
const TaxonomyTerm = require("../taxonomyTerm.ctrl").TaxonomyTerm;

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
  OPTIONAL MATCH (n)-[r]->(t) WHERE t.status='public' RETURN n, r, t`;
  let nodesPromise = await loadNodes(query);
  let results = prepareItemOutput(nodesPromise.records);
  let nodes = [];
  let links = [];
  let item = results.node;
  let colors = nodeColors(item.type);
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
  for (let i=0;i<relations.length; i++) {
    let relation = relations[i];
    let ref = relation.relation;
    let target = relation.target;
    if (target!==null) {
      if (allowedTypes.indexOf(target.type)>-1) {
        let newRelation = {
          source: ref.start,
          target: ref.end,
          refId: ref._id,
          label: ref.type,
        };
        let colors = nodeColors(target.type);
        let newTarget = {
          id: target._id,
          label: target.label,
          itemId: target._id,
          type: target.type,
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

  }

  if (step>1) {
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
  if (typeof params.step!=="undefined" || params.step==="") {
    step = parseInt(params.step,10);
    if (step<1) step=1;
    if (step>6) step=6;
  }
  let relatedNodes = await loadRelatedNodes(_id, 1);
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
    let segments = path.segments.map(s=>normalizeSegment(s,classpieceTerm));
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

module.exports = {
  getItemNetwork: getItemNetwork,
  getRelatedNodes: getRelatedNodes,
  getRelatedPaths: getRelatedPaths,
  getHeatmap: getHeatmap
}
