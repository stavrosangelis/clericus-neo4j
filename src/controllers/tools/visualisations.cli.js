if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: '../../../.env.production' });
} else {
  require('dotenv').config({ path: '../../../.env.development' });
}
const driver = require('../../config/db-driver');
const { prepareOutput, readJSONFile } = require('../../helpers');
const fs = require('fs');
const yargs = require('yargs');
const d3 = require('d3');
const { performance } = require('perf_hooks');

const TaxonomyTerm = require('../taxonomyTerm.ctrl').TaxonomyTerm;

const archivePath = process.env.ARCHIVEPATH;

const argv = yargs
  .command(
    'graph',
    'Produce a json file with all the information for the graph network'
  )
  .help('h')
  .alias('help', 'h').argv;

const countQuery = async (query) => {
  const session = driver.session();
  const count = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      const resultRecord = result.records[0];
      const countObj = resultRecord.toObject();
      prepareOutput(countObj);
      return Number(countObj['count']);
    });
  session.close();
  return count;
};

const loadResults = async (query) => {
  const session = driver.session();
  const nodes = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result;
    });
  return nodes;
};

const compareCount = async () => {
  // Event, Organisation, Person, Resource
  // count public items
  const eventsCQ = "MATCH (n:Event {status:'public'}) RETURN count(n) AS count";
  const organisationsCQ =
    "MATCH (n:Organisation {status:'public'}) RETURN count(n) AS count";
  const peopleCQ =
    "MATCH (n:Person {status:'public'}) RETURN count(n) AS count";
  const resourcesCQ =
    "MATCH (n:Resource {status:'public'}) RETURN count(n) AS count";

  const eventsCount = await countQuery(eventsCQ);
  const organisationsCount = await countQuery(organisationsCQ);
  const peopleCount = await countQuery(peopleCQ);
  const resourcesCount = await countQuery(resourcesCQ);
  const count = {
    events: eventsCount,
    organisations: organisationsCount,
    people: peopleCount,
    resources: resourcesCount,
  };

  // read file and compare
  const countFile = `${archivePath}network-graph-count.json`;
  const readFile = await readJSONFile(countFile);
  let output = false;
  if (readFile.data === null) {
    output = await new Promise((resolve) => {
      fs.writeFile(countFile, JSON.stringify(count), 'utf8', (error) => {
        if (error) throw error;
        resolve(true);
      });
    });
  } else {
    const fileData = readFile.data;
    if (
      fileData.events === count.events &&
      fileData.organisations === count.organisations &&
      fileData.people === count.people &&
      fileData.resources === count.resources
    ) {
      output = false;
    } else {
      output = await new Promise((resolve) => {
        fs.writeFile(countFile, JSON.stringify(count), 'utf8', (error) => {
          if (error) throw error;
          resolve(true);
        });
      });
    }
  }
  return output;
};

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

const prepareNodesOutput = async (records) => {
  console.log('preparing nodes output');
  const t0 = performance.now();
  const classpieceTerm = new TaxonomyTerm({ labelId: 'Classpiece' });
  await classpieceTerm.load();
  const nodes = [];
  const length = records.length;
  const firstRecord = records[0];
  prepareOutput(firstRecord);
  const firstRecordObject = firstRecord.toObject();
  const sizeMulti = 20 / Number(firstRecordObject.size);
  for (let i = 0; i < length; i += 1) {
    const record = records[i];
    prepareOutput(record);
    const recordObject = record.toObject();
    let nType = recordObject.type[0];
    if (
      recordObject.systemType !== null &&
      Number(recordObject.systemType) === Number(classpieceTerm._id)
    ) {
      nType = 'Classpiece';
    }
    const colors = nodeColors(nType);
    const size = Number(recordObject.size) * sizeMulti;
    const node = {
      id: recordObject._id,
      label: recordObject.label,
      type: nType,
      color: colors.color,
      strokeColor: colors.strokeColor,
      size: 30 + size,
    };
    nodes.push(node);
    if (i % 1000 === 0) {
      const diff = (performance.now() - t0) / 1000 / 60;
      console.log(`current node: ${i}. Elapsed: ${diff.toFixed(2)} mins`);
    }
  }
  const diff2 = (performance.now() - t0) / 1000 / 60;
  console.log(`nodes output completed in: ${diff2.toFixed(2)} mins`);
  return nodes;
};

const prepareRelationsOutput = async (records) => {
  console.log('preparing relations output');
  const t0 = performance.now();
  const relationsPairs = [];
  const relations = [];
  const length = records.length;
  for (let i = 0; i < length; i += 1) {
    const record = records[i];
    prepareOutput(record);
    const recordObject = record.toObject();

    const relation = {
      refId: recordObject.relId,
      source: recordObject._id,
      target: recordObject.t_id,
      label: recordObject.relType,
    };
    const pair = `${relation.source},${relation.target}`;
    let reversePair = `${relation.target},${relation.source}`;
    if (
      relationsPairs.indexOf(pair) === -1 &&
      relationsPairs.indexOf(reversePair) === -1
    ) {
      relationsPairs.push(pair);
      relations.push(relation);
    }
    if (i % 1000 === 0) {
      const diff = (performance.now() - t0) / 1000 / 60;
      console.log(`current relation: ${i}. Elapsed: ${diff.toFixed(2)} mins`);
    }
  }
  const diff2 = (performance.now() - t0) / 1000 / 60;
  console.log(`relations output completed in: ${diff2.toFixed(2)} mins`);
  return relations;
};

const graphSimulation = async (data) => {
  console.log('starting simulation');
  const t0 = performance.now();
  const nodes = data.nodes;
  const links = data.links;
  const statistics = data.statistics;
  nodes[0].x = 0;
  nodes[0].y = 0;
  const simulation = d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3
        .forceLink(links)
        .id((d) => d.id)
        .strength(() => 0.5)
        .distance(() => 300)
    )
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter())
    .force('collide', d3.forceCollide((n) => n.size).iterations(15))
    .alphaDecay(0.009)
    .stop();

  const max = Math.ceil(
    Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())
  );
  console.log(`maximum times the simulation will execute: ${max}`);
  for (let i = 0; i < max; i += 1) {
    simulation.tick();
  }
  delete nodes['update'];

  const diff2 = (performance.now() - t0) / 1000 / 60;
  console.log(`simulation completed in: ${diff2.toFixed(2)} mins`);

  simulation.stop();

  const t1 = performance.now();
  const diff = t1 - t0;
  const now = new Date();
  const dateString =
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
  const newData = {
    nodes: nodes,
    links: links,
    statistics: {
      fileCreateTime: statistics.fileCreateTime,
      simulationTime: diff + 'ms',
    },
    updatedAt: dateString,
  };
  const targetDir = `${archivePath}network-graph.json`;
  const writeFile = await new Promise((resolve) => {
    fs.writeFile(targetDir, JSON.stringify(newData), 'utf8', (error) => {
      if (error) throw error;
      console.log('Network graph simulation completed successfully!');
      resolve(true);
    });
  });
  return writeFile;
};

const produceGraphNetwork = async () => {
  const compareContinue = await compareCount();

  // remove the exclamation mark
  if (!compareContinue) {
    const t0 = performance.now();
    // fetch nodes
    const queryNodes = `MATCH (n {status: 'public'})-[r]-() WHERE n:Event OR n:Organisation OR n:Person OR n:Resource RETURN LABELS(n) as type, id(n) as _id, n.label as label, n.systemType as systemType, count(r) as size ORDER BY size DESC`;
    const nodesResults = await loadResults(queryNodes);
    const nodes = await prepareNodesOutput(nodesResults.records);

    // fetch relations
    const queryRelations = `MATCH (n {status: 'public'})-[r]->(t {status: 'public'}) WHERE n:Event OR n:Organisation OR n:Person OR n:Resource RETURN id(n) as _id, type(r) as relType, id(r) as relId, id(t) as t_id`;
    const relationsResults = await loadResults(queryRelations);
    const links = await prepareRelationsOutput(relationsResults.records);

    // const data = await prepareGraphData(results);
    const t1 = performance.now();
    const diff = t1 - t0;
    const outputData = {
      nodes,
      links,
      statistics: {
        fileCreateTime: diff + 'ms',
      },
    };
    const targetDir = `${archivePath}network-graph.json`;
    await new Promise((resolve) => {
      fs.writeFile(targetDir, JSON.stringify(outputData), 'utf8', (error) => {
        if (error) throw error;
        console.log('Network graph saved successfully!');
        resolve(true);
      });
    }).then(async () => {
      await graphSimulation(outputData);
    });

    const lastDiff = (performance.now() - t0) / 1000 / 60;
    console.log(`process completed in ${lastDiff.toFixed(2)} mins`);
    process.exit();
  }
};

if (argv._.includes('graph')) {
  produceGraphNetwork();
}
