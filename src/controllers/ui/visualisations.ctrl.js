const driver = require('../../config/db-driver');
const helpers = require('../../helpers');
const fs = require('fs');
const archivePath = process.env.ARCHIVEPATH;
const TaxonomyTerm = require('../taxonomyTerm.ctrl').TaxonomyTerm;
// const schedule = require('node-schedule');
const d3 = require('d3');
const d32 = require('d3-force-reuse');
const { performance } = require('perf_hooks');

const getGraphNetwork = async (req, resp) => {
  let networkFileDir = `${archivePath}network-graph.json`;
  let file = await helpers.readJSONFile(networkFileDir);
  resp.json({
    status: true,
    data: JSON.stringify(file.data),
    error: [],
    msg: 'Query results',
  });
};

const produceGraphNetwork = async () => {
  // Event, Organisation, Person, Resource
  let eventsCountQuery =
    "MATCH (n:Event {status:'public'}) RETURN count(n) AS count";
  let organisationsCountQuery =
    "MATCH (n:Organisation {status:'public'}) RETURN count(n) AS count";
  let peopleCountQuery =
    "MATCH (n:Person {status:'public'}) RETURN count(n) AS count";
  let resourcesCountQuery =
    "MATCH (n:Resource {status:'public'}) RETURN count(n) AS count";
  let session = driver.session();
  let eventsCount = await session
    .writeTransaction((tx) => tx.run(eventsCountQuery, {}))
    .then((result) => {
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['count'];
      return output;
    });
  let organisationsCount = await session
    .writeTransaction((tx) => tx.run(organisationsCountQuery, {}))
    .then((result) => {
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['count'];
      return output;
    });
  let peopleCount = await session
    .writeTransaction((tx) => tx.run(peopleCountQuery, {}))
    .then((result) => {
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['count'];
      return output;
    });
  let resourcesCount = await session
    .writeTransaction((tx) => tx.run(resourcesCountQuery, {}))
    .then((result) => {
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['count'];
      return output;
    });
  let count = {
    events: Number(eventsCount),
    organisations: Number(organisationsCount),
    people: Number(peopleCount),
    resources: Number(resourcesCount),
  };
  // read file and compare
  let countFile = `${archivePath}network-graph-count.json`;
  let readFile = await helpers.readJSONFile(countFile);
  if (readFile.data === null) {
    await new Promise((resolve) => {
      fs.writeFile(countFile, JSON.stringify(count), 'utf8', (error) => {
        if (error) throw error;
        resolve(true);
      });
    });
  } else {
    let fileData = readFile.data;
    if (
      fileData.events === count.events &&
      fileData.organisations === count.organisations &&
      fileData.people === count.people &&
      fileData.resources === count.resources
    ) {
      return false;
    } else {
      await new Promise((resolve) => {
        fs.writeFile(countFile, JSON.stringify(count), 'utf8', (error) => {
          if (error) throw error;
          resolve(true);
        });
      });
    }
  }

  let t0 = performance.now();
  let classpieceTerm = new TaxonomyTerm({ labelId: 'Classpiece' });
  await classpieceTerm.load();
  let query = `OPTIONAL MATCH (n1:Event {status:'public'})
  WITH collect(distinct n1) as c1
  OPTIONAL MATCH (n2:Organisation {status:'public'})
  WITH collect(distinct n2) + c1 as c2
  OPTIONAL MATCH (n3:Person {status:'public'})
  WITH collect(distinct n3) + c2 as c3
  OPTIONAL MATCH (n4:Resource {status:'public'})
  WITH collect(distinct n4) + c3 as c4
  UNWIND c4 as n
  OPTIONAL MATCH (n)-[r]-(t {status:'public'}) RETURN n, r, t`;
  let resultsPromise = await loadNodes(query);
  let results = prepareItemsOutput(resultsPromise.records);
  let nodes = results.nodes;
  let relations = results.relations;
  let nodesOutput = [];
  for (let i = 0; i < nodes.length; i++) {
    let n = nodes[i];
    let count = n.count || 1;
    let size = 20 + 10 * count;
    let nType = n.type;
    let colors = nodeColors(n.type);
    if (
      typeof n.systemType !== 'undefined' &&
      parseInt(n.systemType, 10) === parseInt(classpieceTerm._id, 10)
    ) {
      nType = 'Classpiece';
    }
    let newNode = {
      id: n._id,
      label: n.label,
      itemId: n._id,
      type: nType,
      color: colors.color,
      strokeColor: colors.strokeColor,
      size: size,
      count: count,
    };
    nodesOutput.push(newNode);
  }
  nodesOutput.sort((a, b) => {
    let akey = a.count;
    let bkey = b.count;
    if (akey < bkey) {
      return -1;
    }
    if (bkey < bkey) {
      return 1;
    }
    return 0;
  });
  let links = [];
  for (let i = 0; i < relations.length; i++) {
    let rel = relations[i];
    let link = {
      source: rel.start,
      target: rel.end,
      refId: rel._id,
      label: rel.type,
    };
    links.push(link);
  }
  let t1 = performance.now();
  let diff = t1 - t0;
  let data = {
    nodes: nodesOutput,
    links: links,
    statistics: {
      fileCreateTime: diff + 'ms',
    },
  };
  let targetDir = `${archivePath}network-graph.json`;
  let writeFile = await new Promise((resolve) => {
    fs.writeFile(targetDir, JSON.stringify(data), 'utf8', (error) => {
      if (error) throw error;
      console.log('Network graph saved successfully!');
      resolve(true);
    });
  }).then(async () => {
    await graphSimulation(data);
  });
  return writeFile;
};

const graphSimulation = async (data) => {
  let t0 = performance.now();
  let nodes = data.nodes;
  let links = data.links;
  let statistics = data.statistics;
  nodes[0].x = 0;
  nodes[0].y = 0;
  const simulation = d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3
        .forceLink(links)
        .id((d) => d.id)
        .strength(() => 1)
        .distance(() => 300)
    )
    // .force("charge", d32.forceManyBodyReuse().strength(strength))
    .force('center', d3.forceCenter(0, 0))
    .force('collide', d3.forceCollide(80))
    // .alphaDecay(0.06)
    .stop();

  let max = Math.ceil(
    Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())
  );
  for (let i = 0; i < max; i++) {
    simulation.tick();
  }
  delete nodes['update'];
  simulation.stop();

  let t1 = performance.now();
  let diff = t1 - t0;
  let now = new Date();
  let dateString =
    now.getUTCFullYear() +
    '/' +
    (now.getUTCMonth() + 1) +
    '/' +
    now.getUTCDate() +
    ' ' +
    now.getUTCHours() +
    ':' +
    now.getUTCMinutes() +
    ':' +
    now.getUTCSeconds();
  let newData = {
    nodes: nodes,
    links: links,
    statistics: {
      fileCreateTime: statistics.fileCreateTime,
      simulationTime: diff + 'ms',
    },
    updatedAt: dateString,
  };
  let targetDir = `${archivePath}network-graph.json`;
  let writeFile = await new Promise((resolve) => {
    fs.writeFile(targetDir, JSON.stringify(newData), 'utf8', (error) => {
      if (error) throw error;
      console.log('Network graph simulation completed successfully!');
      resolve(true);
    });
  });
  return writeFile;
};

const itemGraphSimulation = (req, resp) => {
  let data = req.body;
  let t0 = performance.now();
  let nodes = data.nodes;
  let links = data.links;
  nodes[0].x = data.centerX;
  nodes[0].y = data.centerY;
  let strength = -500;
  const simulation = d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3
        .forceLink(links)
        .id((d) => d.id)
        .strength(() => 1)
        .distance(() => 200)
    )
    .force('charge', d32.forceManyBodyReuse().strength(strength))
    .force('center', d3.forceCenter(data.centerX, data.centerY))
    .force('collide', d3.forceCollide(80))
    // .alphaDecay(1)
    .stop();

  let max =
    Math.ceil(
      Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())
    ) / 2;
  if (max > 80) max = 80;
  for (let i = 0; i < max; i++) {
    simulation.tick();
  }
  delete nodes['update'];
  simulation.stop();
  let t1 = performance.now();
  let diff = t1 - t0;
  return resp.json({
    status: true,
    data: JSON.stringify({ nodes: nodes, links: links, executionTime: diff }),
    error: [],
    msg: 'Query results',
  });
};

// const cronJob = schedule.scheduleJob('0 4 * * *', async () => {
//  produceGraphNetwork();
// });

const getHeatmap = async (req, resp) => {
  let query =
    "MATCH (n:Organisation)-[r]->(p:Person) WHERE n.status='public' AND n.organisationType='Diocese' RETURN n, count(r) AS count ORDER BY n.label";
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });
  let organisations = await prepareOrganisations(nodesPromise);
  resp.json({
    status: true,
    data: organisations,
    error: [],
    msg: 'Query results',
  });
};

const prepareOrganisations = async (records) => {
  let output = [];
  for (let i = 0; i < records.length; i++) {
    let record = records[i];
    let labels = null;
    if (typeof record._fields[0].labels !== 'undefined') {
      labels = record._fields[0].labels;
    }
    let key = record.keys[0];
    helpers.prepareOutput(record);
    let recordObject = record.toObject();
    let outputItem = helpers.outputRecord(recordObject[key]);
    if (labels !== null) {
      outputItem.systemLabels = labels;
    }
    outputItem.count = Number(recordObject.count);
    let spatial = await helpers.loadRelations(
      outputItem._id,
      'Organisation',
      'Spatial',
      null,
      'hasLocation'
    );
    outputItem.features = spatial;
    output.push(outputItem);
  }
  return output;
};

const getItemNetwork = async (req, resp) => {
  let params = req.query;
  let _id = 0;
  if (typeof params._id === 'undefined' || params._id === '') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
    return false;
  } else {
    _id = params._id;
  }
  let path = `${archivePath}network-graph.json`;
  let networkGraph = await helpers.readJSONFile(path);

  let node = networkGraph.data.nodes.find((n) => n.id === _id);
  node.size = 50;
  let relatedNodesIds = [];
  let links = networkGraph.data.links.filter((l) => {
    if (l.source.itemId === _id || l.target.itemId === _id) {
      if (
        l.source.itemId !== _id &&
        relatedNodesIds.indexOf(l.source.itemId) === -1
      ) {
        relatedNodesIds.push(l.source.itemId);
      }
      if (
        l.target.itemId !== _id &&
        relatedNodesIds.indexOf(l.target.itemId) === -1
      ) {
        relatedNodesIds.push(l.target.itemId);
      }
      return true;
    }
    return false;
  });

  let nodes = networkGraph.data.nodes.filter(
    (n) => relatedNodesIds.indexOf(n.id) > -1
  );
  nodes = [node, ...nodes];
  let data = JSON.stringify({ nodes: nodes, links: links });
  return resp.json({
    status: true,
    data: data,
    error: [],
    msg: 'Query results',
  });
};
/* const getItemNetwork_old = async (req, resp) => {
  let t0 = performance.now();
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
  let session = driver.session();
  let nodeQuery = `MATCH (n {status:'public'}) WHERE id(n)=${_id} RETURN n._id as _id, n.label as label, labels(n)[0] as recordType`;
  let node = await session.writeTransaction(tx=>tx.run(nodeQuery,{}))
  .then(result=> {
    let output;
    if (result.records.length>0) {
      let record = result.records[0];
      output = {
        _id: record._fields[0],
        label: record._fields[1],
        recordType: record._fields[2],
      }
      console.log(output)
    }
    return output;
  });
  if (typeof params.step!=="undefined" || params.step==="") {
    step = parseInt(params.step,10);
    if (step<1) step=1;
    if (step>6) step=6;
  }
  // nodes
  //let query = `MATCH (n) WHERE id(n)=${_id} AND n.status="public" CALL apoc.neighbors.tohop(n, "${taxonomyTerms}", ${step}) YIELD node WHERE node.status="public" RETURN DISTINCT id(node) AS _id, node.label AS label, labels(node) as type`;/
  let firstLevelQuery = `MATCH (n {status:'public'}) WHERE id(n)=${_id} OPTIONAL MATCH (n)-[r]-(t) WHERE (t:Event OR t:Organisation OR t:Person OR t:Resource) AND t.status='public' RETURN n, r, t`;
  let firstLevelNodes = await loadNodes(firstLevelQuery);

  let query = `MATCH (n {status:'public'}) WHERE id(n)=${_id}
  MATCH (whitelist {status:"private"})
  WHERE (whitelist:Event OR whitelist:Organisation OR whitelist:Person OR whitelist:Resource)
  WITH n, collect(whitelist) AS whitelistNodes
  CALL apoc.path.subgraphAll(n, {
    labelFilter:"+Event|+Organisation|+Person|+Resource",
    minLevel:1,
    maxLevel:${step},
    whitelistNodes: whitelistNodes,
    uniqueness: "true"
  }) YIELD nodes, relationships
  RETURN nodes, relationships`;
  let nodesPromise = await loadNodes(query);
  let t1 = performance.now();
  let classpieceTerm = new TaxonomyTerm({labelId: "Classpiece"});
  await classpieceTerm.load();
  let defaultItemType = node.recordType;
  if (typeof node.systemType!=="undefined" && node.systemType===classpieceTerm._id) {
    defaultItemType = "Classpiece";
  }
  let colors = nodeColors(defaultItemType);
  let defaultItem = {
    id: node._id,
    label: node.label,
    itemId: node._id,
    type: defaultItemType,
    color: colors.color,
    strokeColor: colors.strokeColor,
    size: 50
  }
  let prepareItemOutputParams = {
    defaultItem: defaultItem,
    firstLevel: firstLevelNodes,
    subgraphs: nodesPromise.records,
    classpieceTermId:classpieceTerm._id
  };
  let data = await prepareItemOutput(prepareItemOutputParams);
  //let t2 = performance.now();
  //let responseData = itemGraphSimulation(data);
  //let t3 = performance.now();
  //let perf = {load: (t1-t0), parse: (t2-t1), simulate: (t3-t2)};
  //responseData.perf = perf;
  resp.json({
    status: true,
    data: JSON.stringify(data),
    error: [],
    msg: "Query results",
  })
}*/

const loadNodes = async (query) => {
  let session = driver.session();
  let nodes = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result;
    });
  return nodes;
};

const prepareItemsOutput = (records) => {
  let nodesIds = [];
  let relationsPairs = [];
  let nodes = [];
  let relations = [];
  let allowedTypes = ['Event', 'Organisation', 'Person', 'Resource'];
  for (let i = 0; i < records.length; i++) {
    let record = records[i];
    helpers.prepareOutput(record);
    let recordObject = record.toObject();
    let node = helpers.outputRecord(recordObject['n']);
    if (typeof recordObject['n'].labels !== 'undefined') {
      node.type = recordObject['n'].labels[0];
    }
    let target = null;
    if (recordObject['t'] !== null && recordObject['t'] !== 0) {
      target = helpers.outputRecord(recordObject['t']);
      if (typeof recordObject['t'].labels !== 'undefined') {
        target.type = recordObject['t'].labels[0];
      }
    }
    let relation = null;
    if (recordObject['r'] !== null) {
      relation = helpers.outputRelation(recordObject['r']);
    }
    if (nodesIds.indexOf(node._id) === -1) {
      nodesIds.push(node._id);
      nodes.push(node);
    }
    if (target !== null && target._id !== 0) {
      if (
        nodesIds.indexOf(target._id) === -1 &&
        allowedTypes.indexOf(target.type) > -1
      ) {
        nodesIds.push(target._id);
        nodes.push(target);
      }
      let pair = `${relation.start},${relation.end}`;
      let reversePair = `${relation.end},${relation.start}`;
      if (
        relationsPairs.indexOf(pair) === -1 &&
        relationsPairs.indexOf(reversePair) === -1
      ) {
        relationsPairs.push(pair);
        relations.push(relation);
      }
    }
  }

  let relationsOutput = relations.filter((rel) => {
    if (nodesIds.indexOf(rel.start) > -1 && nodesIds.indexOf(rel.end) > -1) {
      return true;
    }
    return false;
  });
  for (let i = 0; i < nodes.length; i++) {
    let n = nodes[i];
    let count = 1;
    let countQuery = relationsOutput.find((r) => {
      if (r.start === n._id || r.end === n.id) {
        return true;
      }
      return false;
    });
    if (typeof countQuery !== 'undefined') {
      count = countQuery.length;
    }
    n.count = count;
  }
  return { nodes: nodes, relations: relationsOutput };
};

/*
const prepareItemOutput = async ({
  defaultItem = null,
  firstLevel = [],
  subgraphs = [],
  classpieceTermId = null,
}) => {
  if (firstLevel.length === 0) {
    return [];
  }
  let recordsNodes = [];
  let recordsLinks = [];
  if (firstLevel.records.length > 0) {
    for (let i = 0; i < firstLevel.records.length; i++) {
      let firstLevelRow = firstLevel.records[i];
      recordsNodes.push(firstLevelRow._fields[0]);
      recordsNodes.push(firstLevelRow._fields[2]);
      recordsLinks.push(firstLevelRow._fields[1]);
    }
  }
  if (subgraphs.length > 0) {
    recordsNodes = [...recordsNodes, ...subgraphs[0]._fields[0]];
    recordsLinks = [...recordsLinks, ...subgraphs[0]._fields[1]];
  }
  let nodes = [defaultItem];
  let links = [];
  let nodeIds = [];
  let linksIds = [];
  for (let i = 0; i < recordsNodes.length; i++) {
    let record = recordsNodes[i];
    if (record !== null) {
      let item = helpers.outputRecord(record);
      item.type = record.labels[0];
      let itemType = item.type;
      if (
        itemType === 'Resource' &&
        typeof item.systemType !== 'undefined' &&
        item.systemType === classpieceTermId
      ) {
        itemType = 'Classpiece';
      }
      if (item._id !== defaultItem.id && nodeIds.indexOf(item._id) === -1) {
        nodeIds.push(item._id);
        let colors = nodeColors(itemType);
        let node = {
          id: item._id,
          label: item.label,
          itemId: item._id,
          type: itemType,
          color: colors.color,
          strokeColor: colors.strokeColor,
          size: 30,
        };
        nodes.push(node);
      }
    }
  }
  for (let j = 0; j < recordsLinks.length; j++) {
    if (recordsLinks[j] === null) {
      continue;
    }
    let rel = helpers.outputRelation(recordsLinks[j]);
    let start = rel.start;
    let end = rel.end;
    let pair = `${start}-${end}`;
    let inversePair = `${end}-${start}`;
    if (linksIds.indexOf(pair) > -1 || linksIds.indexOf(inversePair) > -1) {
      continue;
    }
    let link = {
      source: start,
      target: end,
      id: rel._id,
      refId: `ref_${rel._id}_${start}_${end}`,
      label: rel.type,
    };
    links.push(link);
    linksIds.push(pair);
  }
  let output = {nodes: nodes, links: links};
  return output;
};
*/

const nodeColors = (type) => {
  let colors = {
    Event: {
      color: '#f9cd1b',
      strokeColor: '#c9730a',
    },
    Organisation: {
      color: '#9b8cf2',
      strokeColor: '#5343b7',
    },
    Person: {
      color: '#5dc910',
      strokeColor: '#519b1b',
    },
    Resource: {
      color: '#00cbff',
      strokeColor: '#0982a0',
    },
    Classpiece: {
      color: '#1ed8bf',
      strokeColor: '#1e9dd8',
    },
  };
  return colors[type];
};

const getRelatedNodes = async (req, resp) => {
  let params = req.query;
  if (typeof params._id === 'undefined') {
    resp.json({
      status: false,
      data: [],
      error: 'Please provide a valid node id to continue',
      msg: 'Query results',
    });
    return false;
  }
  let _id = params._id;
  let step = 1;
  if (typeof params.step !== 'undefined' || params.step === '') {
    step = parseInt(params.step, 10);
    if (step < 1) step = 1;
    if (step > 6) step = 6;
  }
  let relatedNodes = await loadRelatedNodes(_id, step);
  let classpieceTerm = new TaxonomyTerm({ labelId: 'Classpiece' });
  await classpieceTerm.load();
  for (let i = 0; i < relatedNodes.length; i++) {
    let relatedNode = relatedNodes[i];
    if (
      relatedNode.type === 'Resource' &&
      relatedNode.systemType === classpieceTerm._id
    ) {
      relatedNode.type = 'Classpiece';
    }
  }
  resp.json({
    status: true,
    data: relatedNodes,
    error: [],
    msg: 'Query results',
  });
};

const getRelatedPaths = async (req, resp) => {
  let params = req.query;
  let step = params.step;
  if (
    typeof params.sourceId === 'undefined' ||
    typeof params.targetId === 'undefined'
  ) {
    resp.json({
      status: false,
      data: [],
      error: 'Please provide a valid source and target id to continue',
      msg: 'Query results',
    });
    return false;
  }
  if (typeof params.step !== 'undefined' || params.step === '') {
    step = parseInt(params.step, 10);
    if (step < 1) step = 1;
    if (step > 6) step = 6;
  }
  let sourceId = params.sourceId;
  let targetId = params.targetId;
  let session = driver.session();
  let query = `MATCH (n {status: 'public'}) WHERE id(n)=${sourceId}
  MATCH (t {status:'public'}) WHERE id(t)=${targetId}
  MATCH p=allShortestPaths((n)-[*]->(t)) RETURN p ORDER BY length(p) SKIP 0 LIMIT 25`;
  let results = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    });
  let relatedNodes = await normalizeRelatedPathsOutput(results);
  resp.json({
    status: true,
    data: relatedNodes,
    error: [],
    msg: 'Query results',
  });
};

const loadRelatedNodes = async (_id, step) => {
  let session = driver.session();
  let query = `MATCH (n)-[*..${step}]->(rn) WHERE id(n)=${_id} AND n.status='public' AND rn.status='public' AND NOT id(rn)=${_id} RETURN distinct rn ORDER BY rn.label`;
  let results = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    });
  let relatedNodes = normalizeRelatedRecordsOutput(results);
  return relatedNodes;
};

const normalizeRelatedRecordsOutput = (records) => {
  let output = [];
  for (let i = 0; i < records.length; i++) {
    let record = records[i];
    helpers.prepareOutput(record);
    let recordObject = record.toObject();
    let node = recordObject['rn'];
    let outputItem = helpers.outputRecord(node);
    if (typeof node.labels !== 'undefined') {
      outputItem.type = node.labels[0];
    }
    output.push(outputItem);
  }
  return output;
};

const normalizeRelatedPathsOutput = async (records) => {
  let paths = [];
  let classpieceTerm = new TaxonomyTerm({ labelId: 'Classpiece' });
  await classpieceTerm.load();
  for (let i = 0; i < records.length; i++) {
    let record = records[i];
    helpers.prepareOutput(record);
    let recordObject = record.toObject();
    let path = recordObject['p'];
    let source = path.start;
    if (typeof source.labels !== 'undefined') {
      if (
        source.labels[0] === 'Resource' &&
        source.properties.systemType === classpieceTerm._id
      ) {
        source.properties.type = 'Classpiece';
      } else source.properties.type = source.labels[0];
    }
    helpers.prepareOutput(source);
    source = helpers.outputRecord(source);
    let target = path.end;
    if (typeof target.labels !== 'undefined') {
      if (
        target.labels[0] === 'Resource' &&
        target.properties.systemType === classpieceTerm._id
      ) {
        target.properties.type = 'Classpiece';
      } else target.properties.type = target.labels[0];
    }
    helpers.prepareOutput(target);
    target = helpers.outputRecord(target);
    let segments = path.segments
      // .filter(s=>s.start.properties.status==="public" && s.end.properties.status==="public")
      .map((s) => normalizeSegment(s, classpieceTerm));
    paths.push({ source: source, target: target, segments: segments });
  }
  return paths;
};

const normalizeSegment = (segment, classpieceTerm) => {
  let source = segment.start;
  if (typeof source.labels !== 'undefined') {
    if (
      source.labels[0] === 'Resource' &&
      source.properties.systemType === classpieceTerm._id
    ) {
      source.properties.type = 'Classpiece';
    } else source.properties.type = source.labels[0];
  }
  helpers.prepareOutput(source);
  source = helpers.outputRecord(source);
  let target = segment.end;
  if (typeof target.labels !== 'undefined') {
    if (
      target.labels[0] === 'Resource' &&
      target.properties.systemType === classpieceTerm._id
    ) {
      target.properties.type = 'Classpiece';
    } else target.properties.type = target.labels[0];
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
  };

  return triple;
};

const getTimeline = async (req, resp) => {
  let session = driver.session();
  let query =
    'MATCH (e:Event)-->(t:Temporal) WHERE e.status=\'public\' RETURN distinct t,e ORDER BY date(datetime({epochmillis: apoc.date.parse(t.startDate,"ms","dd-MM-yyyy")}))';
  let results = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    });
  let temporals = [];
  let events = [];
  let temporalIds = [];
  for (let i = 0; i < results.length; i++) {
    let result = results[i];
    helpers.prepareOutput(result);
    let obj = result.toObject();
    let temporal = helpers.outputRecord(obj['t']);
    let event = helpers.outputRecord(obj['e']);
    let tId = temporal._id;
    event.temporalId = tId;
    if (temporalIds.indexOf(tId) === -1) {
      temporalIds.push(tId);
      temporals.push(temporal);
    }
    events.push(event);
  }

  for (let i = 0; i < temporals.length; i++) {
    let temporal = temporals[i];
    let temporalEvents = events.filter((e) => e.temporalId === temporal._id);
    if (typeof temporalEvents === 'undefined') {
      temporalEvents = [];
    }
    temporal.events = temporalEvents;
  }
  resp.json({
    status: true,
    data: temporals,
    error: [],
    msg: 'Query results',
  });
};

const getItemTimeline = async (req, resp) => {
  let params = req.query;
  if (typeof params._id === 'undefined') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: ['Please provide a valid _id and type to continue'],
    });
    return false;
  }
  let _id = params._id;
  let session = driver.session();
  let query = `MATCH (p)-->(e:Event) WHERE p.status="public" AND id(p)=${_id}
  MATCH (e)-->(t:Temporal) WHERE exists(t.startDate) AND NOT t.startDate="" RETURN distinct t, e ORDER BY date(datetime({epochmillis: apoc.date.parse(t.startDate,"ms","dd-MM-yyyy")}))`;
  let results = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    });
  let temporals = [];
  let events = [];
  let temporalIds = [];
  for (let i = 0; i < results.length; i++) {
    let result = results[i];
    helpers.prepareOutput(result);
    let obj = result.toObject();
    let temporal = helpers.outputRecord(obj['t']);
    let event = helpers.outputRecord(obj['e']);
    let tId = temporal._id;
    event.temporalId = tId;
    if (temporalIds.indexOf(tId) === -1) {
      temporalIds.push(tId);
      temporals.push(temporal);
    }
    events.push(event);
  }

  for (let i = 0; i < temporals.length; i++) {
    let temporal = temporals[i];
    let temporalEvents = events.filter((e) => e.temporalId === temporal._id);
    if (typeof temporalEvents === 'undefined') {
      temporalEvents = [];
    }
    temporal.events = temporalEvents;
  }
  resp.json({
    status: true,
    data: temporals,
    error: [],
    msg: 'Query results',
  });
};

module.exports = {
  getItemNetwork: getItemNetwork,
  getRelatedNodes: getRelatedNodes,
  getRelatedPaths: getRelatedPaths,
  getHeatmap: getHeatmap,
  getGraphNetwork: getGraphNetwork,
  getTimeline: getTimeline,
  getItemTimeline: getItemTimeline,
  produceGraphNetwork: produceGraphNetwork,
  itemGraphSimulation: itemGraphSimulation,
};
