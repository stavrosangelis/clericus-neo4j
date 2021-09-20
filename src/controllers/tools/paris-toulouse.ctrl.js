if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: '../../../.env.production' });
} else {
  require('dotenv').config({ path: '../../../.env.development' });
}
const yargs = require('yargs');
const { performance } = require('perf_hooks');

const helpers = require('../../helpers');
const csvParser = require('csv-parser');
const driver = require('../../config/db-driver');
const fs = require('fs');
const { readFile } = require('fs/promises');
const { ABSPATH: absPath, ARCHIVEPATH: archivePath } = process.env;
const { Person } = require('../person.ctrl');
const { Organisation } = require('../organisation.ctrl');
const { Event } = require('../event.ctrl');
const { Temporal } = require('../temporal.ctrl');
// const { Taxonomy } = require('../taxonomy.ctrl');
const { TaxonomyTerm } = require('../taxonomyTerm.ctrl');
const { updateReference } = require('../references.ctrl');

// const DEBUG = false;

// parse arguments
const argv = yargs
  .command('key', 'Find the key of a column')
  .command('ingest', 'Ingest the data')
  .command('check', 'Check part of the data')
  .example('$0 parse -i data.csv', 'parse the contents of the csv file')
  .option('letter', {
    alias: 'l',
    description: 'Provide a letter key',
    type: 'string',
  })
  .help('h')
  .alias('help', 'h').argv;

const cellOutput = (valueParam = '') => {
  let value = valueParam;
  if (value !== '') {
    value = value.trim();
  }
  return value;
};

// get admin id
const getAdminId = async () => {
  const session = driver.session();
  const userQuery = "MATCH (n:User {email:'admin@test.com'}) return n";
  let userNode = await session
    .writeTransaction((tx) => tx.run(userQuery, {}))
    .then((result) => {
      let records = result.records;
      if (records.length > 0) {
        let record = records[0];
        let user = record.toObject().n;
        user = helpers.outputRecord(user);
        return user;
      }
      return null;
    });
  session.close();
  return userNode._id;
};

const getDaysInMonth = (m, y) => {
  return new Date(y, m + 1, 0).getDate();
};

const execQuery = async () => {
  const session = driver.session();
  // const userId = await getAdminId();

  const queryResource = `MATCH (n:Resource {label:"A List of the Names of the Popish Parish Priests Throughout the Several Counties in the Kingdom of Ireland (Dublin, 1705)"}) RETURN n`;
  const data = await session
    .writeTransaction((tx) => tx.run(queryResource, {}))
    .then((result) => {
      const records = result.records;
      if (records.length > 0) {
        const output = records.map((r) => {
          const record = r.toObject();
          return helpers.outputRecord(record.n);
        });
        return output;
      }
      return [];
    });
  console.log(data[0]._id);
  session.close();
  // stop executing
  process.exit();
};

/*
const preparedDates = (value) => {
  const parts = value.split(';');
  const dates = parts.map((p) => p.trim());
  return dates;
};
*/
const prepareDate = (date) => {
  const parts = date.split(' - ');
  const start = parts[0].trim();
  const sParts = start.split('-');
  let sy = sParts[0];
  let sm = sParts[1];
  let sd = sParts[2];
  if (sy.includes('c.')) {
    sy = sy.replace('c.', '');
  }
  if (sm === '??') {
    sm = `01`;
  }
  if (sd === '??') {
    sd = `01`;
  }
  const startDate = `${sd}-${sm}-${sy}`;
  let endDate = null;
  if (parts.length === 1) {
    const lm = sParts[1] !== '??' ? sm : '12';
    const ld = getDaysInMonth(lm, sy);
    endDate = `${ld}-${lm}-${sy}`;
  }
  if (parts.length > 1) {
    const lParts = parts[1].trim().split('-');
    let ly = lParts[0];
    let lm = lParts[1];
    let ld = lParts[2];
    if (ly.includes('c.')) {
      ly = ly.replace('c.', '');
    }
    if (lm === '??') {
      lm = `12`;
    }
    if (ld === '??') {
      ld = getDaysInMonth(lm, ly);
    }
    endDate = `${ld}-${sm}-${sy}`;
  }
  let label = '';
  if (!date.includes('?')) {
    label = date;
  } else {
    label = date.replace(/-\?\?/g, '');
  }
  return { startDate, endDate, label };
};

const saveDate = async (dateParam = '', userId) => {
  const session = driver.session();
  if (dateParam === '') {
    return null;
  }
  const { startDate, endDate, label } = dateParam;
  let queryEndDate = '';
  if (endDate !== null) {
    queryEndDate = `AND n.endDate="${endDate}" `;
  }
  const query = dateParam.label.includes('c')
    ? `MATCH (n:Temporal) WHERE n.label="${dateParam.label}" AND n.startDate="${startDate}" ${queryEndDate} RETURN n`
    : `MATCH (n:Temporal) WHERE n.startDate="${startDate}" ${queryEndDate} RETURN n`;
  let temporal = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      let records = result.records;
      let outputRecord = null;
      if (records.length > 0) {
        let record = records[0].toObject();
        outputRecord = helpers.outputRecord(record.n);
      }
      return outputRecord;
    })
    .catch((error) => {
      console.log(error);
    });
  if (temporal === null) {
    const temporalData = {
      label,
      startDate,
      endDate,
    };
    const newTemporal = new Temporal(temporalData);
    const save = await newTemporal.save(userId);
    temporal = save.data;
  }
  session.close();
  return temporal;
};

/*
const addNewRelationsTypes = async (newTypes = []) => {
  if (newTypes.length > 0) {
    const userId = await getAdminId();
    const session = driver.session();
    // 1.  load relationTypes Taxonomy
    const relationsTypes = new Taxonomy({ systemType: 'relationsTypes' });
    await relationsTypes.load();
    const rtId = relationsTypes._id;

    // 2. load entities
    const entitiesQuery = 'MATCH (n:Entity) RETURN n ORDER BY n.label';
    const entities = await session
      .writeTransaction((tx) => tx.run(entitiesQuery, {}))
      .then((result) => {
        let records = result.records;
        let outputRecords = helpers.normalizeRecordsOutput(records);
        return outputRecords;
      });

    for (let i = 0; i < newTypes.length; i += 1) {
      const newType = newTypes[i];

      // 1. check if newType exists
      const labelId = helpers.normalizeLabelId(newType.label);
      const inverseLabelId = helpers.normalizeLabelId(newType.inverseLabel);
      let newTT = new TaxonomyTerm({
        label: newType.label,
        labelId: labelId,
        inverseLabel: newType.inverseLabel,
        inverseLabelId: inverseLabelId,
      });
      await newTT.load();
      // 2. if it doesn't exists add it
      if (newTT._id === null) {
        let ttSave = await newTT.save(userId);
        let tt = ttSave.data;
        // 1. add reference to relationsTypes Taxonomy
        const rtRef = {
          items: [
            { _id: tt._id, type: 'TaxonomyTerm', role: '' },
            { _id: rtId, type: 'Taxonomy', role: '' },
          ],
          taxonomyTermLabel: 'isChildOf',
        };
        await updateReference(rtRef);

        // 2. add reference in entities model
        const srcEntity = entities.find((e) => e.label === newType.from);
        const targetEntity = entities.find((e) => e.label === newType.to);
        const entitiesRef = {
          items: [
            { _id: srcEntity._id, type: 'Entity', role: '' },
            { _id: targetEntity._id, type: 'Entity', role: '' },
          ],
          taxonomyTermId: tt._id,
        };
        await updateReference(entitiesRef);
      }
    }
    session.close();
  }
};

const addNewEventTypes = async (newTypes = []) => {
  if (newTypes.length > 0) {
    const userId = await getAdminId();
    const session = driver.session();
    // 1.  load relationTypes Taxonomy
    const eventTypes = new Taxonomy({ systemType: 'eventTypes' });
    await eventTypes.load();
    const etId = eventTypes._id;
    for (let i = 0; i < newTypes.length; i += 1) {
      const newType = newTypes[i];

      // 1. check if newType exists
      const labelId = helpers.normalizeLabelId(newType.label);
      const inverseLabelId = helpers.normalizeLabelId(newType.inverseLabel);
      let newTT = new TaxonomyTerm({
        label: newType.label,
        labelId: labelId,
        inverseLabel: newType.inverseLabel,
        inverseLabelId: inverseLabelId,
      });
      await newTT.load();
      // 2. if it doesn't exists add it
      if (newTT._id === null) {
        let ttSave = await newTT.save(userId);
        let tt = ttSave.data;
        // 1. add reference to relationsTypes Taxonomy
        const etRef = {
          items: [
            { _id: tt._id, type: 'TaxonomyTerm', role: '' },
            { _id: etId, type: 'Taxonomy', role: '' },
          ],
          taxonomyTermLabel: 'isChildOf',
        };
        await updateReference(etRef);
      }
    }
    session.close();
  }
};
*/
const loadPerson = async (_id) => {
  const person = new Person({ _id });
  await person.loadUnpopulated();
  return person;
};

const findOrganisation = async ({ label = '', type = '' }) => {
  const session = driver.session();
  const queryLabel = helpers.addslashes(label);
  const queryType = type.includes(' ') ? helpers.normalizeLabelId(type) : type;
  let query = `MATCH (n:Organisation) WHERE toLower(n.label) =~ toLower('.*${queryLabel}.*') RETURN n`;
  if (type !== '') {
    query = `MATCH (n:Organisation) WHERE toLower(n.label) =~ toLower('.*${queryLabel}.*') AND n.organisationType = '${queryType}' RETURN n`;
  }
  let organisation = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      if (result.records.length > 0) {
        const record = result.records[0].toObject();
        const outputRecord = helpers.outputRecord(record.n);
        return outputRecord;
      }
      return null;
    })
    .catch((error) => {
      console.log(error);
    });
  if (organisation === null) {
    query = `MATCH (n:Organisation) WHERE n.label = '${queryLabel}' RETURN n`;
    if (type !== '') {
      query = `MATCH (n:Organisation) WHERE n.label = '${queryLabel}' AND n.organisationType = '${queryType}' RETURN n`;
    }
    organisation = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        if (result.records.length > 0) {
          const record = result.records[0].toObject();
          const outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
        return null;
      })
      .catch((error) => {
        console.log(error);
      });
  }
  session.close();
  return organisation;
};

const findSpatial = async (label) => {
  const session = driver.session();
  const query = `MATCH (n:Spatial {label: "${label}"}) RETURN n`;
  const spatial = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      if (result.records.length > 0) {
        const record = result.records[0].toObject();
        const outputRecord = helpers.outputRecord(record.n);
        return outputRecord;
      }
      return null;
    })
    .catch((error) => {
      console.log(error);
    });
  session.close();
  return spatial;
};

const firstNameParse = (firstNameParam = '') => {
  let firstName = '';
  let middleName = '';
  if (firstNameParam !== '') {
    const firstNameParts = firstNameParam.split(' ');
    if (firstNameParts.length > 1) {
      firstName = firstNameParts[0];
      middleName = firstNameParts[1];
    } else if (firstNameParts.length === 1) {
      firstName = firstNameParts[0];
    }
  }

  return { firstName, middleName };
};

const personLabel = (firstName, middleName, lastName) => {
  let label = '';
  if (firstName !== '') {
    label += firstName;
  }
  if (middleName !== '') {
    if (label !== '') {
      label += ' ';
    }
    label += middleName;
  }
  if (lastName !== '') {
    if (label !== '') {
      label += ' ';
    }
    label += lastName;
  }
  return label;
};

const alternateAppellationsParse = (
  alternateLastNameParam,
  alternateFirstNameParam,
  alternateFirstNameLangParam,
  alternateFirstNameParam2,
  alternateFirstNameLangParam2
) => {
  const lastNameParts = alternateLastNameParam.split(';');
  const { firstName: alternateFirstName, middleName: alternateMiddleName } =
    firstNameParse(alternateFirstNameParam);
  const { firstName: alternateFirstName2, middleName: alternateMiddleName2 } =
    firstNameParse(alternateFirstNameParam2);
  const alternateAppellations = [];

  const alternateAppellation1 = {};
  const alternateLastName =
    typeof lastNameParts[0] !== 'undefined' && lastNameParts[0] !== ''
      ? lastNameParts[0]
      : '';
  if (alternateLastName !== '') {
    alternateAppellation1.lastName = alternateLastName;
  }
  if (alternateFirstName !== '') {
    alternateAppellation1.firstName = alternateFirstName;
  }
  if (alternateMiddleName !== '') {
    alternateAppellation1.middleName = alternateMiddleName;
  }
  if (alternateFirstNameLangParam !== null) {
    alternateAppellation1.language = {
      value: alternateFirstNameLangParam.alpha2,
      label: alternateFirstNameLangParam.English,
    };
  }
  const alternateAppellationLabel = personLabel(
    alternateFirstName,
    alternateMiddleName,
    alternateLastName
  );
  if (alternateAppellationLabel !== '') {
    alternateAppellation1.appelation = alternateAppellationLabel;
  }
  if (Object.keys(alternateAppellation1).length > 0) {
    alternateAppellations.push(alternateAppellation1);
  }

  const alternateAppellation2 = {};
  const alternateLastName2 =
    typeof lastNameParts[1] !== 'undefined' && lastNameParts[1] !== ''
      ? lastNameParts[1]
      : '';
  if (alternateLastName2 !== '') {
    alternateAppellation2.lastName = alternateLastName2;
  }
  if (alternateFirstName2 !== '') {
    alternateAppellation2.firstName = alternateFirstName2;
  }
  if (alternateMiddleName2 !== '') {
    alternateAppellation2.middleName = alternateMiddleName2;
  }
  if (alternateFirstNameLangParam2 !== null) {
    alternateAppellation2.language = {
      value: alternateFirstNameLangParam2.alpha2,
      label: alternateFirstNameLangParam2.English,
    };
  }
  const alternateAppellationLabel2 = personLabel(
    alternateFirstName2,
    alternateMiddleName2,
    alternateLastName2
  );
  if (alternateAppellationLabel2 !== '') {
    alternateAppellation2.appelation = alternateAppellationLabel2;
  }
  if (Object.keys(alternateAppellation2).length > 0) {
    alternateAppellations.push(alternateAppellation2);
  }

  const alternateAppellation3 = {};
  const alternateLastName3 =
    typeof lastNameParts[2] !== 'undefined' && lastNameParts[2] !== ''
      ? lastNameParts[2]
      : '';
  if (alternateLastName3 !== '') {
    alternateAppellation3.lastName = alternateLastName3;
    alternateAppellation2.appelation = alternateLastName3;
  }
  if (Object.keys(alternateAppellation3).length > 0) {
    alternateAppellations.push(alternateAppellation3);
  }
  return alternateAppellations;
};

const loadOrganisation = async (_id) => {
  const organisation = new Organisation({ _id });
  await organisation.loadUnpopulated();
  return organisation;
};

const saveOrganisation = async (organisation = null, userId) => {
  if (
    organisation === null ||
    typeof organisation.label === 'undefined' ||
    organisation.label === null
  ) {
    return null;
  }
  const updatedOrganisation = new Organisation(organisation);
  const save = await updatedOrganisation.save(userId);
  const newOrganisation = save.data;
  return newOrganisation;
};

const eventTypeId = async (labelParam) => {
  const typeLabel = labelParam.includes(' ')
    ? helpers.normalizeLabelId(labelParam)
    : labelParam;
  const type = new TaxonomyTerm({
    labelId: typeLabel,
  });
  await type.load();
  // console.log(type);
  return type._id.toString();
};

const saveEvent = async (label, eventTypeId, description = '', userId) => {
  const eventData = {
    label,
    eventType: eventTypeId,
    status: 'private',
  };
  if (description !== '') {
    eventData.description = description;
  }
  const newEvent = new Event(eventData);
  const save = await newEvent.save(userId);
  const event = save.data;
  return event;
};

/*
const prepareTypeString = (strParam) => {
  if (typeof strParam !== 'string') {
    return strParam;
  }
  let str = strParam.replace(/\(/g, ' ');
  str = str.replace(/\)/g, ' ');
  str = str.replace(/-/g, ' ');
  const parts = str.split(' ');
  let output = '';
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const firstLetter = part.charAt(0).toUpperCase();
    const restOfString = part.slice(1);
    output += `${firstLetter}${restOfString}`;
  }
  output = output.replace(/\s/g, '');
  return output;
};
*/

const check = async () => {
  const masterCsvPath = `${archivePath}documents/paris-toulouse/source.csv`;
  const masterCsv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(masterCsvPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  const masterCsvKeys = Object.keys(masterCsv['0']);

  // output csv
  const data = [];
  // data loop
  // const controlGroup = [];
  const session = driver.session();
  for (let i = 0; i < masterCsv.length; i += 1) {
    // if (i > 1) break;
    const row = masterCsv[i];

    const role = cellOutput(row[masterCsvKeys[71]]);
    if (role !== '') {
      if (data.indexOf(role) === -1) {
        data.push(role);
      }
    }
  }
  session.close();
  const outputPath = `${archivePath}documents/paris-toulouse/roles.json`;
  await new Promise((resolve, reject) => {
    fs.writeFile(outputPath, JSON.stringify(data), 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  process.exit();
};

const addEvent = async ({
  label = '',
  eventType = null,
  eventTaxonomyTerm = 'hasParticipant',
  eventRole = '',
  userId,
  person,
  organisation = null,
  spatialCell = '',
  temporalCell = '',
}) => {
  let eventRoleId = '';
  if (eventRole !== '') {
    eventRoleId = await eventTypeId(eventRole);
  }
  const newEvent = await saveEvent(label, eventType, '', userId);
  if (newEvent !== null) {
    const newEventRef = {
      items: [
        { _id: newEvent._id, type: 'Event', role: '' },
        { _id: person._id, type: 'Person', role: eventRoleId },
      ],
      taxonomyTermLabel: eventTaxonomyTerm,
    };
    await updateReference(newEventRef);
  }
  // organisation
  if (organisation !== null) {
    const orgRef = {
      items: [
        { _id: newEvent._id, type: 'Event', role: '' },
        { _id: organisation._id, type: 'Organisation', role: '' },
      ],
      taxonomyTermLabel: 'hasRelation',
    };
    await updateReference(orgRef);
  }
  // spatial
  if (spatialCell !== '') {
    const spatial = await findSpatial(spatialCell);
    if (spatial !== null) {
      const spatialRef = {
        items: [
          { _id: newEvent._id, type: 'Event', role: '' },
          {
            _id: spatial._id,
            type: 'Spatial',
            role: '',
          },
        ],
        taxonomyTermLabel: 'hasLocation',
      };
      await updateReference(spatialRef);
    }
  }
  // temporal
  if (temporalCell !== '') {
    const date = prepareDate(temporalCell);
    const temporal = await saveDate(date, userId);
    const temporalRef = {
      items: [
        { _id: newEvent._id, type: 'Event' },
        { _id: temporal._id, type: 'Temporal' },
      ],
      taxonomyTermLabel: 'hasTime',
    };
    await updateReference(temporalRef);
  }
};

const ingest = async () => {
  const t0 = performance.now();
  const session = driver.session();
  const userId = await getAdminId();

  const masterCsvPath = `${archivePath}documents/paris-toulouse/source.csv`;
  const masterCsv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(masterCsvPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  const masterCsvKeys = Object.keys(masterCsv['0']);

  // languages
  const languagesPath = `${absPath}src/config/language-codes.json`;
  const languagesFile = await readFile(languagesPath);
  const languages = JSON.parse(languagesFile);

  const birthEventType = await eventTypeId('Birth');
  const deathEventType = await eventTypeId('Death');
  const residenceEventType = await eventTypeId('Habitation');
  const ordinationEventType = await eventTypeId('ordination');
  const matriculationEventType = await eventTypeId('matriculation');
  const registrationEventType = await eventTypeId('Registration_2');
  const maEventType = await eventTypeId('MastersOfArt');
  const posEventType = await eventTypeId('ProgramOfStudy');
  const attendanceEventType = await eventTypeId('Attendance');
  const membershipEventType = await eventTypeId('Membership');
  const wasServingAsEventType = await eventTypeId('wasServingAsEvent');

  const resourceQuery = `MATCH (n:Resource) WHERE toLower(n.label) =~ toLower('.*Prosopography of Irish Clerics in the Universities of Paris and Toulouse, 1573-1792.*') RETURN n`;
  const resource = await session
    .writeTransaction((tx) => tx.run(resourceQuery, {}))
    .then((result) => {
      const records = result.records;
      if (records.length > 0) {
        const record = records[0].toObject();
        const outputRecord = helpers.outputRecord(record.n);
        return outputRecord;
      }
    })
    .catch((error) => {
      console.log(error);
    });

  const uoPThumbQuery = `MATCH (n:Resource) WHERE toLower(n.label) =~ toLower('.*University of Paris Coat of Arms.png*') RETURN n`;
  const uoPThumb = await session
    .writeTransaction((tx) => tx.run(uoPThumbQuery, {}))
    .then((result) => {
      const records = result.records;
      if (records.length > 0) {
        const record = records[0].toObject();
        const outputRecord = helpers.outputRecord(record.n);
        return outputRecord;
      }
    })
    .catch((error) => {
      console.log(error);
    });

  for (let i = 0; i < masterCsv.length; i += 1) {
    /* if (i + 2 < 1321) {
      continue;
    }
    if (i + 2 > 1321) {
      break;
    } */
    const row = masterCsv[i];
    const dbId = cellOutput(row[masterCsvKeys[0]]);

    // 1-4) person
    const firstNameCell = cellOutput(row[masterCsvKeys[3]]);
    const lastName = cellOutput(row[masterCsvKeys[1]]);

    const { firstName, middleName } = firstNameParse(firstNameCell);

    console.log(`${i + 2}. ${firstName} ${middleName} ${lastName}`);

    const alternateLastName = cellOutput(row[masterCsvKeys[2]]);
    const alternateFirstName = cellOutput(row[masterCsvKeys[4]]);
    const alternateFirstNameLang = cellOutput(row[masterCsvKeys[5]]);
    const alternateFirstName2 = cellOutput(row[masterCsvKeys[6]]);
    const alternateFirstNameLang2 = cellOutput(row[masterCsvKeys[7]]);
    const alternateFirstNameLangValue =
      alternateFirstNameLang !== ''
        ? languages.find((l) => l.English === alternateFirstNameLang)
        : null;
    const alternateFirstNameLangValue2 =
      alternateFirstNameLang2 !== ''
        ? languages.find((l) => l.English === alternateFirstNameLang2)
        : null;
    const alternateAppellations = alternateAppellationsParse(
      alternateLastName,
      alternateFirstName,
      alternateFirstNameLangValue,
      alternateFirstName2,
      alternateFirstNameLangValue2
    );

    let person = {};
    if (dbId !== '') {
      person = await loadPerson(dbId);
      const newAlternateAppellations = person.alternateAppellations || [];
      for (let ap = 0; ap < alternateAppellations.length; ap += 1) {
        const alternateAppellation = alternateAppellations[ap];
        const find =
          newAlternateAppellations.find((nap) => {
            let label = '';
            let altLabel = '';
            if (nap.firstName !== 'undefined') {
              label += nap.firstName;
            }
            if (nap.lastName !== 'undefined') {
              label += nap.lastName;
            }
            if (alternateAppellation.lastName !== 'undefined') {
              altLabel += alternateAppellation.lastName;
            }
            if (alternateAppellation.lastName !== 'undefined') {
              altLabel += alternateAppellation.lastName;
            }

            if (label === altLabel) {
              return true;
            }
            return false;
          }) || null;
        if (find === null) {
          if (typeof person.alternateAppelations === 'undefined') {
            person.alternateAppelations = [];
          }
          person.alternateAppelations.push(alternateAppellation);
        }
      }
      const newPerson = new Person(person);
      const savedPerson = await newPerson.save(userId);
      person = savedPerson.data;
    } else {
      // load person details
      const personData = {
        honorificPrefix: [],
        firstName,
        middleName,
        lastName,
        label: personLabel(firstName, middleName, lastName),
        personType: 'Clergy',
        status: 'private',
        alternateAppelations: alternateAppellations,
      };
      const newPerson = new Person(personData);
      const savedPerson = await newPerson.save(userId);
      person = savedPerson.data;
    }
    // 5) Column I (Diocese)
    const dioceseCell = cellOutput(row[masterCsvKeys[8]]);
    const dioceseDBID = cellOutput(row[masterCsvKeys[9]]);

    let diocese = null;
    if (dioceseDBID !== '') {
      diocese = await loadOrganisation(dioceseDBID);
    } else if (dioceseCell !== '') {
      const dioceseData = {
        label: dioceseCell,
        organisationType: 'Diocese',
        status: 'private',
      };
      diocese = await saveOrganisation(dioceseData, userId);
    }
    // add relationship to diocese
    if (diocese !== null) {
      const dioceseRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: diocese._id, type: 'Organisation', role: '' },
        ],
        taxonomyTermLabel: 'hasAffiliation',
      };
      await updateReference(dioceseRef);
    }

    // 6) Native place
    const nativePlaceCell = cellOutput(row[masterCsvKeys[10]]);
    const nativePlaceDBID = cellOutput(row[masterCsvKeys[11]]);
    const nativePlaceAltLabel = cellOutput(row[masterCsvKeys[12]]);
    const nativePlaceType = cellOutput(row[masterCsvKeys[13]]);

    let nativePlace = null;
    if (nativePlaceDBID !== '') {
      nativePlace = await loadOrganisation(nativePlaceDBID);
    } else if (nativePlaceCell !== '') {
      const nativePlaceData = {
        label: nativePlaceCell,
        organisationType: nativePlaceType,
        status: 'private',
      };
      if (nativePlaceAltLabel) {
        nativePlaceCell.alternateAppelations[
          {
            label: nativePlaceAltLabel,
          }
        ];
      }
      nativePlace = await saveOrganisation(nativePlaceData, userId);
    }
    // add relationship to native place
    if (nativePlace !== null) {
      const nativePlaceRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: nativePlace._id, type: 'Organisation', role: '' },
        ],
        taxonomyTermLabel: 'wasNativeOf',
      };
      await updateReference(nativePlaceRef);
    }

    // dates
    // 7) Birth event
    const dob = cellOutput(row[masterCsvKeys[15]]);
    if (dob !== '') {
      await addEvent({
        label: 'Born',
        eventType: birthEventType,
        eventTaxonomyTerm: 'wasStatusOf',
        userId,
        person,
        temporalCell: dob,
      });
    }

    // 8) Death event
    const dod = cellOutput(row[masterCsvKeys[19]]);
    if (dod !== '') {
      await addEvent({
        label: 'Deceased',
        eventType: deathEventType,
        eventTaxonomyTerm: 'wasStatusOf',
        userId,
        person,
        temporalCell: dod,
      });
    }

    // 9) Person's Father
    const fatherFirstName = cellOutput(row[masterCsvKeys[24]]);
    const fatherLastName = cellOutput(row[masterCsvKeys[23]]);
    if (fatherFirstName !== '' || fatherLastName !== '') {
      const { fatherFName, fatherMName } = firstNameParse(fatherFirstName);
      const fatherData = {
        firstName: fatherFName,
        middleName: fatherMName,
        lastName: fatherLastName,
        label: personLabel(fatherFName, fatherMName, fatherLastName),
        personType: 'Laity',
        status: 'private',
      };
      const newFather = new Person(fatherData);
      const savedFather = await newFather.save(userId);
      const father = savedFather.data;
      const fatherRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: father._id, type: 'Person', role: '' },
        ],
        taxonomyTermLabel: 'isSonOf',
      };
      await updateReference(fatherRef);
    }

    // 10) Person's Mother
    const motherFirstName = cellOutput(row[masterCsvKeys[26]]);
    const motherAltLastName = cellOutput(row[masterCsvKeys[25]]);
    if (motherFirstName !== '') {
      const { motherFName, motherMName } = firstNameParse(motherFirstName);
      const motherData = {
        firstName: motherFName,
        middleName: motherMName,
        lastName: fatherLastName,
        label: personLabel(motherFName, motherMName, fatherLastName),
        personType: 'Laity',
        status: 'private',
      };
      if (motherAltLastName !== '') {
        const motherAppellation = personLabel(
          motherFName,
          '',
          motherAltLastName
        );
        const maidenName = {
          appellation: motherAppellation,
          firstName: motherFName,
          lastName: motherAltLastName,
        };
        motherData.alternateAppellations = [maidenName];
      }
      const newMother = new Person(motherData);
      const savedMother = await newMother.save(userId);
      const mother = savedMother.data;
      const motherRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: mother._id, type: 'Person', role: '' },
        ],
        taxonomyTermLabel: 'isSonOf',
      };
      await updateReference(motherRef);
    }

    // 11) Student of
    const studentOfCell = cellOutput(row[masterCsvKeys[27]]);
    let studentOfOrg = null;
    if (studentOfCell !== '') {
      studentOfOrg = await findOrganisation({ label: studentOfCell });
      if (studentOfOrg === null) {
        studentOfOrg = saveOrganisation({ label: studentOfCell }, userId);
      }
      const studentOfRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: studentOfOrg._id, type: 'Organisation', role: '' },
        ],
        taxonomyTermLabel: 'wasStudentOf',
      };
      await updateReference(studentOfRef);
      // link to thumbnail
      if (studentOfCell === 'University of Paris') {
        const studentOfThumbRef = {
          items: [
            { _id: person._id, type: 'Person', role: '' },
            { _id: uoPThumb._id, type: 'Resource', role: '' },
          ],
          taxonomyTermLabel: 'hasRepresentationObject',
        };
        await updateReference(studentOfThumbRef);
      }
    }

    // 12a) residence
    const residenceCell = cellOutput(row[masterCsvKeys[29]]);
    const residenceTypeCell = cellOutput(row[masterCsvKeys[30]]);
    const locationOfResidenceCell = cellOutput(row[masterCsvKeys[31]]);
    const dateOfResidenceCell = cellOutput(row[masterCsvKeys[32]]);
    if (residenceCell !== '') {
      // organisation
      let residenceOrg = await findOrganisation({
        label: residenceCell,
        type: residenceTypeCell,
      });
      if (residenceOrg === null) {
        residenceOrg = saveOrganisation(
          { label: residenceCell, type: residenceTypeCell },
          userId
        );
      }
      await addEvent({
        label: 'Residence',
        eventType: residenceEventType,
        eventTaxonomyTerm: 'WasMaintainedBy',
        userId,
        person,
        organisation: residenceOrg,
        spatialCell: locationOfResidenceCell,
        temporalCell: dateOfResidenceCell,
      });

      // 12b) was resident
      const dbresidencePersonRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: residenceOrg._id, type: 'Organisation', role: '' },
        ],
        taxonomyTermLabel: 'wasResidentOf',
      };
      await updateReference(dbresidencePersonRef);
    }

    // 13) ordination
    const ordination = cellOutput(row[masterCsvKeys[33]]);
    const ordinationDate = cellOutput(row[masterCsvKeys[34]]);
    if (ordination !== '' && (ordination === 'Y' || ordination === 'Yes')) {
      await addEvent({
        label: 'Ordination',
        eventType: ordinationEventType,
        userId,
        person,
        temporalCell: ordinationDate,
      });
    }

    // 14) matriculation
    const matriculationDateCell = cellOutput(row[masterCsvKeys[35]]);
    if (matriculationDateCell !== '') {
      const locationOfUniversityCell = cellOutput(row[masterCsvKeys[28]]);
      await addEvent({
        label: 'Matriculation',
        eventType: matriculationEventType,
        userId,
        person,
        organisation: studentOfOrg,
        spatialCell: locationOfUniversityCell,
        temporalCell: matriculationDateCell,
      });
    }

    // 15) Registration
    const registration = cellOutput(row[masterCsvKeys[36]]);
    const registrationDateCell = cellOutput(row[masterCsvKeys[37]]);
    if (registration !== '') {
      const registrationSpatialCell = cellOutput(row[masterCsvKeys[28]]);
      await addEvent({
        label: registration,
        eventType: registrationEventType,
        eventTaxonomyTerm: 'hadRegistrant',
        userId,
        person,
        organisation: studentOfOrg,
        spatialCell: registrationSpatialCell,
        temporalCell: registrationDateCell,
      });
    }

    // 16) Masters of Art
    const maDateCell = cellOutput(row[masterCsvKeys[38]]);
    if (maDateCell !== '') {
      const maSpatialCell = cellOutput(row[masterCsvKeys[28]]);
      await addEvent({
        label: 'Masters of Art',
        eventType: maEventType,
        eventTaxonomyTerm: 'hasRecipient',
        userId,
        person,
        spatialCell: maSpatialCell,
        temporalCell: maDateCell,
      });
    }

    // 17) Program of Study 2
    const pos2 = cellOutput(row[masterCsvKeys[39]]);
    if (pos2 !== '') {
      const pos2Type = pos2.split(' ')[0];
      const pos2EventType = await eventTypeId(pos2Type);
      const locationOfUniversityCell = cellOutput(row[masterCsvKeys[28]]);
      const pos2DateCell = cellOutput(row[masterCsvKeys[40]]);

      await addEvent({
        label: pos2,
        eventType: pos2EventType,
        eventTaxonomyTerm: 'hasRecipient',
        userId,
        person,
        organisation: studentOfOrg,
        spatialCell: locationOfUniversityCell,
        temporalCell: pos2DateCell,
      });
    }

    // 18) Program of Study 3
    const pos3 = cellOutput(row[masterCsvKeys[41]]);
    if (pos3 !== '') {
      const pos3Type = pos3.split(' ')[0];
      const pos3EventType = await eventTypeId(pos3Type);
      const locationOfUniversityCell = cellOutput(row[masterCsvKeys[28]]);
      const pos3DateCell = cellOutput(row[masterCsvKeys[42]]);

      await addEvent({
        label: pos3,
        eventType: pos3EventType,
        eventTaxonomyTerm: 'hasRecipient',
        userId,
        person,
        organisation: studentOfOrg,
        spatialCell: locationOfUniversityCell,
        temporalCell: pos3DateCell,
      });
    }

    // 19) Program of Study 4
    const pos4 = cellOutput(row[masterCsvKeys[43]]);
    if (pos4 !== '') {
      const pos4Type = pos4.split(' ')[0];
      const pos4EventType = await eventTypeId(pos4Type);
      const locationOfUniversityCell = cellOutput(row[masterCsvKeys[28]]);
      const pos4DateCell = cellOutput(row[masterCsvKeys[44]]);

      await addEvent({
        label: pos4,
        eventType: pos4EventType,
        eventTaxonomyTerm: 'hasRecipient',
        userId,
        person,
        organisation: studentOfOrg,
        spatialCell: locationOfUniversityCell,
        temporalCell: pos4DateCell,
      });
    }

    // 20) Student of
    const otherCollegeCell = cellOutput(row[masterCsvKeys[47]]);
    let otherCollege = null;
    if (otherCollegeCell !== '') {
      otherCollege = await findOrganisation({ label: otherCollegeCell });
      const otherCollegeRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: otherCollege._id, type: 'Organisation', role: '' },
        ],
        taxonomyTermLabel: 'wasStudentOf',
      };
      await updateReference(otherCollegeRef);
    }

    // 21) Program of Study Other
    const otherPoS = cellOutput(row[masterCsvKeys[49]]);
    if (otherPoS !== '') {
      const otherPoSSpatialCell = cellOutput(row[masterCsvKeys[48]]);
      const otherPoSSDateCell = cellOutput(row[masterCsvKeys[51]]);

      await addEvent({
        label: otherPoS,
        eventType: posEventType,
        eventTaxonomyTerm: 'wasStudiedBy',
        userId,
        person,
        organisation: otherCollege,
        spatialCell: otherPoSSpatialCell,
        temporalCell: otherPoSSDateCell,
      });
    }

    // 22) Award Other
    const awardOther = cellOutput(row[masterCsvKeys[50]]);
    if (awardOther !== '') {
      const awardOtherType = awardOther.split(' ')[0];
      const awardOtherEventType = await eventTypeId(awardOtherType);
      const awardOtherSpatialCell = cellOutput(row[masterCsvKeys[48]]);
      const awardOtherDateCell = cellOutput(row[masterCsvKeys[51]]);

      await addEvent({
        label: awardOther,
        eventType: awardOtherEventType,
        eventTaxonomyTerm: 'hasRecipient',
        userId,
        person,
        organisation: otherCollege,
        spatialCell: awardOtherSpatialCell,
        temporalCell: awardOtherDateCell,
      });
    }

    // 23) Other College 2
    const otherCollege2Cell = cellOutput(row[masterCsvKeys[52]]);
    let otherCollege2 = null;
    if (otherCollege2Cell !== '') {
      otherCollege2 = await findOrganisation({ label: otherCollege2Cell });
      const otherCollege2Ref = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: otherCollege2._id, type: 'Organisation', role: '' },
        ],
        taxonomyTermLabel: 'wasStudentOf',
      };
      await updateReference(otherCollege2Ref);
    }

    // 24) Other College 2 Attendance
    if (otherCollege2Cell !== '') {
      const otherCollege2AttendanceSpatialCell = cellOutput(
        row[masterCsvKeys[53]]
      );
      const otherCollege2AttendanceDateCell = cellOutput(
        row[masterCsvKeys[54]]
      );
      await addEvent({
        label: 'Student',
        eventType: attendanceEventType,
        eventTaxonomyTerm: 'wasStatusOf',
        userId,
        person,
        organisation: otherCollege2,
        spatialCell: otherCollege2AttendanceSpatialCell,
        temporalCell: otherCollege2AttendanceDateCell,
      });
    }

    // 25) Ordination
    const ordination2Cell = cellOutput(row[masterCsvKeys[60]]);
    if (ordination2Cell !== '') {
      const ordination2SpatialCell = cellOutput(row[masterCsvKeys[62]]);
      const ordination2DateCell = cellOutput(row[masterCsvKeys[61]]);
      await addEvent({
        label: 'Ordination',
        eventType: ordinationEventType,
        eventRole: ordination2Cell,
        userId,
        person,
        spatialCell: ordination2SpatialCell,
        temporalCell: ordination2DateCell,
      });
    }

    // 26) Membership
    const membershipCell = cellOutput(row[masterCsvKeys[67]]);
    if (membershipCell !== '') {
      const membershipSpatial = cellOutput(row[masterCsvKeys[69]]);
      const membershipTemporal = cellOutput(row[masterCsvKeys[68]]);
      const membershipOrganisation = await findOrganisation({
        label: membershipCell,
      });
      await addEvent({
        label: 'Member',
        eventType: membershipEventType,
        eventTaxonomyTerm: 'wasStatusOf',
        userId,
        person,
        organisation: membershipOrganisation,
        spatialCell: membershipSpatial,
        temporalCell: membershipTemporal,
      });
    }

    // 27) Membership (Organisation)
    const membershipOrgCell = cellOutput(row[masterCsvKeys[70]]);
    let membershipOrg = null;
    if (membershipOrgCell !== '') {
      membershipOrg = await findOrganisation({ label: membershipOrgCell });
      const membershipOrgRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: membershipOrg._id, type: 'Organisation', role: '' },
        ],
        taxonomyTermLabel: 'wasMemberOf',
      };
      await updateReference(membershipOrgRef);
    }

    // 28) Was serving asEvent
    const servingAsCell = cellOutput(row[masterCsvKeys[71]]);
    if (servingAsCell !== '') {
      const servingAsOrgCell = cellOutput(row[masterCsvKeys[73]]);
      const servingAsOrgType = cellOutput(row[masterCsvKeys[74]]);
      const servingAsOrg = await findOrganisation({
        label: servingAsOrgCell,
        type: servingAsOrgType,
      });
      const servingAsSpatial = cellOutput(row[masterCsvKeys[75]]);
      const servingAsTemporal = cellOutput(row[masterCsvKeys[72]]);

      await addEvent({
        label: servingAsCell,
        labelCell: servingAsCell,
        eventType: wasServingAsEventType,
        eventTaxonomyTerm: 'wasHeldBy',
        eventRole: servingAsCell,
        userId,
        person,
        organisation: servingAsOrg,
        spatialCell: servingAsSpatial,
        temporalCell: servingAsTemporal,
      });
    }

    // 29) Resource
    const resourceCell = cellOutput(row[masterCsvKeys[77]]);
    if (resourceCell !== '') {
      const resourceRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: resource._id, type: 'Resource', role: '' },
        ],
        taxonomyTermLabel: 'isReferencedIn',
      };
      await updateReference(resourceRef);
    }
  }

  const t1 = performance.now();
  const elapsed = helpers.msToTime(t1 - t0);
  console.log(`process completed in ${elapsed}`);
  session.close();
  // stop executing
  process.exit();
};

const letterKey = () => {
  const letter = argv.letter.toLowerCase() || '';
  const alphabet =
    'a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,aa,ab,ac,ad,ae,af,ag,ah,ai,aj,ak,al,am,an,ao,ap,aq,ar,as,at,au,av,aw,ax,ay,az,ba,bb,bc,bd,be,bf,bg,bh,bi,bj,bk,bl,bm,bn,bo,bp,bq,br,bs,bt,bu,bv,bw,bx,by,bz';
  const letters = alphabet.split(',');
  console.log(letters.indexOf(letter));
  process.exit();
};

if (argv._.includes('execQuery')) {
  execQuery();
}
if (argv._.includes('ingest')) {
  ingest();
}
if (argv._.includes('key')) {
  letterKey();
}
if (argv._.includes('check')) {
  check();
}
