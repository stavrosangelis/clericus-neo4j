if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: '../../../.env.production' });
} else {
  require('dotenv').config({ path: '../../../.env.development' });
}
const yargs = require('yargs');
const helpers = require('../../helpers');
const driver = require('../../config/db-driver');
const fs = require('fs');
const archivePath = process.env.ARCHIVEPATH;
const TaxonomyTerm = require('../taxonomyTerm.ctrl').TaxonomyTerm;
const produceGraphNetwork =
  require('../ui/visualisations.ctrl').produceGraphNetwork;

// parse arguments
const argv = yargs
  .command('classpieces', 'Make private all classpieces dated from 1920-21')
  .command(
    'meath',
    `Make private all entries linked to the 'History of the Diocese of Meath, 1860-1993'`
  )
  .command(
    'events',
    'Make private all entries linked to matriculation or ordination events from 01-01-1922 onwards'
  )
  .command('updategraph', 'Update graph network to reflect the changes')
  .example('$0 classpieces', 'Make private all classpieces dated from 1920-21')
  .help('h')
  .alias('help', 'h').argv;

const unPublish = async (_id) => {
  const session = driver.session();
  const query = `MATCH (n) WHERE id(n)=${_id} SET n.status='private' RETURN n._id`;
  const exec = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then(() => {
      return true;
    });
  session.close();
  return exec;
};

const unPublishPeople = async (people) => {
  const output = [];
  for (let j = 0; j < people.length; j += 1) {
    const person = people[j].ref;
    // person events
    const personEvents = await helpers.loadRelations(
      person._id,
      'Person',
      'Event',
      true
    );
    for (let k = 0; k < personEvents.length; k += 1) {
      const personEvent = personEvents[k].ref;
      // unpublish person event
      await unPublish(personEvent._id);
    }
    const personEventsString = personEvents.map((e) => e.ref.label).join(' | ');
    // person thumbnails
    const personThumbnails = await helpers.loadRelations(
      person._id,
      'Person',
      'Resource',
      true,
      'hasRepresentationObject'
    );

    for (let l = 0; l < personThumbnails.length; l += 1) {
      const personThumbnail = personThumbnails[l].ref;
      // unpublish person thumbnail
      await unPublish(personThumbnail._id);
    }
    const personThumbnailsString = personThumbnails
      .map((e) => e.ref.label)
      .join(' | ');
    output.push(
      `"","","${j + 1}","${
        person.label
      }","${personEventsString}","${personThumbnailsString}"`
    );

    // unpublish person
    await unPublish(person._id);
  }
  return output;
};

const classpieces = async () => {
  const session = driver.session();
  const classpieceSystemType = new TaxonomyTerm({ labelId: 'Classpiece' });
  await classpieceSystemType.load();
  const query = `MATCH (n:Resource {systemType: "${classpieceSystemType._id}"}) RETURN n ORDER BY n.label`;
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    });
  const nodes = helpers.normalizeRecordsOutput(nodesPromise, 'n');
  let output = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    let classpieceOutput = `"${node.label}"`;
    // compilation date
    let compiled = null;
    const compilationEvents =
      (await helpers.loadRelations(
        node._id,
        'Resource',
        'Event',
        false,
        'wasCompiled'
      )) || null;
    if (compilationEvents.length > 0) {
      const compilationDates = await helpers.loadRelations(
        compilationEvents[0].ref._id,
        'Event',
        'Temporal'
      );
      if (compilationDates.length > 0) {
        compiled = compilationDates[0].ref.startDate;
      }
    }
    if (compiled !== null) {
      const compiledArr = compiled.split('-');
      const year = Number(compiledArr[2]);
      if (year < 1920) {
        continue;
      }
      classpieceOutput += `,"${compiled}"`;
    }
    if (compiled === null) {
      continue;
    }
    const classpieceEvents = await helpers.loadRelations(
      node._id,
      'Resource',
      'Event',
      true
    );
    for (let e = 0; e < classpieceEvents.length; e += 1) {
      const classpieceEvent = classpieceEvents[e].ref;
      // unpublish classpiece events
      await unPublish(classpieceEvent._id);
    }
    output.push(classpieceOutput);
    // people
    const people = await helpers.loadRelations(
      node._id,
      'Resource',
      'Person',
      true,
      null,
      'n.label'
    );
    const handlePeople = await unPublishPeople(people);
    output = [...output, ...handlePeople];
    // unpublish classpiece
    await unPublish(node._id);
  }

  // output results
  const csvPath = `${archivePath}documents/gdpr/classpieces.csv`;
  const csvHeaders = `"Classpiece","Compiled","","Person","Person events","Person thumbnails"`;
  output.unshift(csvHeaders);
  const csvText = output.join('\n');
  const writeFile = await new Promise((resolve, reject) => {
    fs.writeFile(csvPath, '\ufeff' + csvText, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  if (writeFile) {
    console.log('Completed successfully');
  }
  session.close();
  process.exit();
};

const meath = async () => {
  let output = [];
  const session = driver.session();
  const historyOfMeathPromise = await session
    .writeTransaction((tx) =>
      tx.run(
        `match (n:Resource {label: 'History of the Diocese of Meath 1860-1993'}) return n`,
        {}
      )
    )
    .then((result) => {
      return result.records;
    });
  const historyOfMeath = helpers.normalizeRecordsOutput(
    historyOfMeathPromise,
    'n'
  )[0];
  const people = await helpers.loadRelations(
    historyOfMeath._id,
    'Resource',
    'Person',
    true,
    null,
    'n.label'
  );
  const handlePeople = await unPublishPeople(people);
  output = [...output, ...handlePeople];
  await unPublish(historyOfMeath._id);

  // output results
  const csvPath = `${archivePath}documents/gdpr/meath.csv`;
  const csvHeaders = `"","","","Person","Person events","Person thumbnails"`;
  output.unshift(csvHeaders);
  const csvText = output.join('\n');
  const writeFile = await new Promise((resolve, reject) => {
    fs.writeFile(csvPath, '\ufeff' + csvText, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  if (writeFile) {
    console.log('Completed successfully');
  }
  session.close();
  process.exit();
};

const events = async () => {
  let output = [];
  const matriculationType = new TaxonomyTerm({ labelId: 'matriculation' });
  await matriculationType.load();
  const ordinationType = new TaxonomyTerm({ labelId: 'ordination' });
  await ordinationType.load();
  const dateRange = { dateType: 'after', startDate: '31/12/1921', endDate: '' };
  const eventIds = await helpers.temporalEvents(dateRange, [
    matriculationType._id,
    ordinationType._id,
  ]);
  for (let i = 0; i < eventIds.length; i += 1) {
    const eventId = Number(eventIds[i]);
    const people = await helpers.loadRelations(
      eventId,
      'Event',
      'Person',
      true,
      null,
      'n.label'
    );
    const handlePeople = await unPublishPeople(people);
    output = [...output, ...handlePeople];
    await unPublish(Number(eventId));
  }
  // output results
  const csvPath = `${archivePath}documents/gdpr/events.csv`;
  const csvHeaders = `"","","","Person","Person events","Person thumbnails"`;
  output.unshift(csvHeaders);
  const csvText = output.join('\n');
  const writeFile = await new Promise((resolve, reject) => {
    fs.writeFile(csvPath, '\ufeff' + csvText, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  if (writeFile) {
    console.log('Completed successfully');
  }
  process.exit();
};

const updateGraph = async () => {
  const update = await produceGraphNetwork();
  console.log(update);
  process.exit();
};

if (argv._.includes('classpieces')) {
  classpieces();
}
if (argv._.includes('meath')) {
  meath();
}
if (argv._.includes('events')) {
  events();
}
if (argv._.includes('updategraph')) {
  updateGraph();
}
