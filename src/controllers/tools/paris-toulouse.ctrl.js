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
const archivePath = process.env.ARCHIVEPATH;
const { Person } = require('../person.ctrl');
const { Organisation } = require('../organisation.ctrl');
const { Event } = require('../event.ctrl');
const { Temporal } = require('../temporal.ctrl');
const { Taxonomy } = require('../taxonomy.ctrl');
const { TaxonomyTerm } = require('../taxonomyTerm.ctrl');
const { updateReference } = require('../references.ctrl');

// const DEBUG = false;

// parse arguments
const argv = yargs
  .command('key', 'Find the key of a column')
  .command('ingest', 'Ingest the data')
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

const ingest = async () => {
  const t0 = performance.now();
  const session = driver.session();
  const userId = await getAdminId();

  const laySuretiesCsvPath = `${archivePath}documents/1704/lay-sureties-merged.csv`;
  const laySuretiesCsv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(laySuretiesCsvPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  const laySuretiesKeys = Object.keys(laySuretiesCsv['0']);

  const masterCsvPath = `${archivePath}documents/1704/1704-master-ids.csv`;
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

  // add new event types
  const newEventTypes = [
    { label: 'profession', inverseLabel: 'profession' },
    { label: 'sponsorship/guarantor', inverseLabel: 'sponsorship/guarantor' },
  ];
  await addNewEventTypes(newEventTypes);

  // add new relations types
  const newRelationsTypes = [
    {
      label: 'had profession',
      inverseLabel: 'was profession of',
      from: 'Person',
      to: 'Event',
    },
    {
      label: 'provided',
      inverseLabel: 'was provided by',
      from: 'Person',
      to: 'Event',
    },
    {
      label: 'was surety to',
      inverseLabel: 'had surety',
      from: 'Person',
      to: 'Person',
    },
    {
      label: 'received',
      inverseLabel: 'was received by',
      from: 'Person',
      to: 'Event',
    },
  ];
  await addNewRelationsTypes(newRelationsTypes);

  //add new reference resource
  const resourceSystemType = new TaxonomyTerm({
    labelId: 'Document',
  });
  await resourceSystemType.load();

  const newResourceQuery = `MATCH (n:Resource {label:
    'A List of the Names of the Popish Parish Priests Throughout the Several Counties in the Kingdom of Ireland (Dublin, 1705)', resourceType: 'document', systemType: '${resourceSystemType._id}'}) return n`;
  const newResources = await session
    .writeTransaction((tx) => tx.run(newResourceQuery, {}))
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
  const refResource = newResources[0];

  // handle name
  const handleName = (str = '') => {
    if (str === '') {
      return '';
    }
    const partsArr = str.split(' ');
    const parts = partsArr.map((p) => cellOutput(p));
    const fullName = {
      firstName: '',
      middleName: '',
      lastName: '',
    };
    switch (parts.length) {
      case 3:
        fullName.firstName = parts[0];
        fullName.middleName = parts[1];
        fullName.lastName = parts[2];
        break;
      case 2:
        fullName.firstName = parts[0];
        fullName.lastName = parts[1];
        break;
      case 1:
        if (parts[0].includes('f:')) {
          const newFirstName = parts[0].replace('f:', '');
          fullName.firstName = newFirstName;
        } else {
          fullName.lastName = parts[0];
        }
        break;
      default:
        fullName.firstName = parts[0];
        fullName.lastName = parts[1];
    }
    return fullName;
  };

  const handleAlternateAppelations = (str = '') => {
    if (str === '') {
      return [];
    }
    const partsArr = str.split(';');
    const alternateAppellations = partsArr.map((p) =>
      handleName(cellOutput(p))
    );
    return alternateAppellations;
  };

  // handle new person
  const newPerson = async (
    fullName,
    honorificPrefix,
    alternateAppellations
  ) => {
    // rule 1b
    const personData = {
      personType: 'Laity',
    };
    for (let key in fullName) {
      personData[key] = fullName[key];
    }
    // rule 1c
    if (honorificPrefix !== '') {
      personData.honorificPrefix = [honorificPrefix];
    }
    // rule 2
    if (alternateAppellations.length > 0) {
      personData.alternateAppelations = alternateAppellations;
    }
    const newPerson = new Person(personData);
    const personSave = await newPerson.save(userId);
    return personSave.data;
  };

  // matches
  const queryReferenceDocument = `MATCH (n:Resource {label:"A List of the Names of the Popish Parish Priests Throughout the Several Counties in the Kingdom of Ireland (Dublin, 1705)"}) RETURN n`;
  const referenceDocument = await session
    .writeTransaction((tx) => tx.run(queryReferenceDocument, {}))
    .then((result) => {
      const records = result.records;
      if (records.length > 0) {
        const output = records.map((r) => {
          const record = r.toObject();
          return helpers.outputRecord(record.n);
        });
        return output[0];
      }
      return null;
    });

  const handleMatches = (matches) => {
    if (matches === '') {
      return [];
    }
    const partsArr = matches.split('|');
    const parts = partsArr.map((p) => {
      const match = Number(cellOutput(p)) - 1;
      return masterCsv[match];
    });
    return parts;
  };

  const preparePriestData = (priest, keys) => {
    let surname = cellOutput(priest[keys[0]]);
    let firstName = cellOutput(priest[keys[1]]);
    const alternateAppellation = { firstName: '', lastName: '' };
    const surnameUpdated = cellOutput(priest[keys[3]]);
    const firstNameUpdated = cellOutput(priest[keys[5]]);
    if (surnameUpdated !== '') {
      alternateAppellation.lastName = surname;
      surname = surnameUpdated;
    }
    if (firstNameUpdated !== '') {
      alternateAppellation.firstName = firstName;
      firstName = firstNameUpdated;
    }
    if (
      alternateAppellation.firstName !== '' &&
      alternateAppellation.lastName === ''
    ) {
      alternateAppellation.lastName = surname;
    }
    if (
      alternateAppellation.firstName === '' &&
      alternateAppellation.lastName !== ''
    ) {
      alternateAppellation.firstName = firstName;
    }
    const output = {
      firstName,
      surname,
      alternateAppellation,
    };

    return output;
  };

  const matchPriestToDb = async (priest, referenceDocument, keys) => {
    const dbId = cellOutput(priest[keys[24]]);
    if (dbId !== '') {
      const query = `MATCH (n:Person) WHERE id(n)=${dbId} return n`;
      const priests = await session
        .writeTransaction((tx) => tx.run(query, {}))
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
      return priests;
    }
    const person = preparePriestData(priest, keys);
    const query = `MATCH (n:Person {firstName:"${person.firstName}", lastName:"${person.surname}"})-[r]->(t:Resource) WHERE id(t)=${referenceDocument._id} return n`;
    let priests = await session
      .writeTransaction((tx) => tx.run(query, {}))
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
    if (priests.length > 1) {
      const newMatches = [];
      for (let i = 0; i < priests.length; i += 1) {
        const p = priests[i];
        const pAlt = p.alternateAppelations.map((a) => JSON.parse(a));
        const match =
          pAlt.find(
            (f) =>
              f.firstName === person.alternateAppellation.firstName &&
              f.lastName === person.alternateAppellation.lastName
          ) || null;
        if (match !== null) {
          newMatches.push(p);
        }
      }
      if (newMatches.length > 0) {
        priests = newMatches;
      }
    }
    return priests;
  };

  const queryOrganisation = async (label, type) => {
    const query = `MATCH (n:Organisation {label: "${label}", organisationType: "${type}" }) RETURN n`;
    const organisationDB = await session.run(query, {});
    const records = organisationDB.records;
    let organisation = null;
    if (records.length > 0) {
      const record = records[0].toObject();
      organisation = helpers.outputRecord(record.n);
    }
    return organisation;
  };

  const newOrganisation = async (
    placeNameUpdated,
    locationType,
    placeNameAlt
  ) => {
    if (placeNameUpdated === '' && placeNameAlt === '') {
      return null;
    }
    let organisation = await queryOrganisation(placeNameUpdated, locationType);
    if (organisation === null && placeNameAlt !== '') {
      organisation = await queryOrganisation(placeNameAlt, locationType);
    }

    if (organisation !== null && placeNameAlt !== '') {
      const altAppellations = organisation.alternateAppelations.map((a) =>
        JSON.parse(a)
      );
      let update = false;
      if (organisation.label !== placeNameAlt) {
        const match =
          altAppellations.find((f) => f.label === placeNameAlt) || null;
        if (match === null) {
          altAppellations.push({ label: placeNameAlt });
          update = true;
        }
      } else {
        const match =
          altAppellations.find((f) => f.label === placeNameUpdated) || null;
        if (match === null) {
          altAppellations.push({ label: placeNameUpdated });
          update = true;
        }
      }
      if (update) {
        const organisationAlternateAppelations = organisation.alternateAppelations.map(
          (a) => JSON.parse(a)
        );
        organisation.alternateAppelations = organisationAlternateAppelations;
        const updatedOrganisation = new Organisation(organisation);
        const save = await updatedOrganisation.save(userId);
        organisation = save.data;
      }
    } else if (organisation === null) {
      const organisationData = {};
      if (placeNameUpdated !== '') {
        organisationData.label = placeNameUpdated;
        organisationData.status = 'private';
      }
      if (placeNameAlt !== '') {
        organisationData.alternateAppelations = [{ label: placeNameAlt }];
      }
      if (locationType !== '') {
        organisationData.organisationType = locationType;
      }
      const updatedOrganisation = new Organisation(organisationData);
      const save = await updatedOrganisation.save(userId);
      organisation = save.data;
    }
    return organisation;
  };

  const parseOrganisations = async (
    placeNameUpdated,
    locationType,
    placeNameAlt
  ) => {
    const output = [];
    const organisationsArray = placeNameUpdated.split(';');
    const organisations = organisationsArray.map((o) => cellOutput(o));
    let locationTypes = [];
    if (locationType !== '') {
      const locationTypesArray = locationType.split(';');
      locationTypes = locationTypesArray.map((l) => cellOutput(l));
    }
    let placeNameAlts = [];
    if (placeNameAlt !== '') {
      const placeNameAltsArray = placeNameAlt.split(';');
      placeNameAlts = placeNameAltsArray.map((p) => cellOutput(p));
    }
    for (let i = 0; i < organisations.length; i += 1) {
      const organisationLabel = organisations[i];
      const organisationLocationType =
        locationTypes[i] || locationTypes[locationTypes.length] || '';
      const organisationPlaceNameAlts = placeNameAlts[i] || '';
      const organisation = await newOrganisation(
        organisationLabel,
        organisationLocationType,
        organisationPlaceNameAlts
      );
      output.push(organisation);
    }
    return output;
  };

  const loadOrganisation = async (label = '', type = '') => {
    if (label === '' || type === '') {
      return null;
    }
    const query = `MATCH (n:Organisation {label: "${label}", organisationType: "${type}" }) RETURN n`;
    const organisationDB = await session.run(query, {});
    const records = organisationDB.records;
    let organisation = null;
    if (records.length > 0) {
      const record = records[0].toObject();
      organisation = helpers.outputRecord(record.n);
    }
    if (organisation === null) {
      const orgData = {
        label,
        organisationType: type,
        status: 'private',
      };
      const newOrganisation = new Organisation(orgData);
      const save = await newOrganisation.save(userId);
      organisation = save.data;
      organisation.spatial = [];
    } else {
      const spatial = await helpers.loadRelations(
        organisation._id,
        'Organisation',
        'Spatial'
      );
      organisation.spatial = spatial;
    }
    return organisation;
  };

  const addEvent = async (label, eventTypeId, description = '') => {
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

  const eventTypeId = async (label) => {
    const typeLabel = helpers.normalizeLabelId(label);
    const type = new TaxonomyTerm({
      labelId: typeLabel,
    });
    await type.load();
    return type._id.toString();
  };

  const habitationTypeId = await eventTypeId('habitation');
  const maintainedLabel = helpers.normalizeLabelId('maintained');
  const professionTypeId = await eventTypeId('profession');
  const hadProfessionLabel = helpers.normalizeLabelId('had profession');
  const sponsorshipTypeId = await eventTypeId('sponsorship/guarantor');
  const providedLabel = helpers.normalizeLabelId('provided');
  const wasSuretyToLabel = helpers.normalizeLabelId('was surety to');
  const receivedLabel = helpers.normalizeLabelId('received');

  const prepareDate = (date) => {
    const parts = date.split('-');
    const y = parts[0];
    const m = parts[1];
    const d = parts[2] === '??' ? '01' : parts[2];
    const startDate = `${d}-${m}-${y}`;
    let endDate = null;
    if (parts[2] === '??') {
      const endDay = getDaysInMonth(m, y);
      endDate = `${endDay}-${m}-${y}`;
    }
    return { startDate, endDate };
  };

  const addDate = async (startDateParam = '') => {
    if (startDateParam === '') {
      return null;
    }
    const { startDate, endDate } = prepareDate(startDateParam);
    let queryEndDate = '';
    if (endDate !== null) {
      queryEndDate = `AND n.endDate="${endDate}" `;
    }
    const query = `MATCH (n:Temporal) WHERE n.startDate="${startDate}" ${queryEndDate} RETURN n`;
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
      let label = startDate;
      if (endDate !== null) {
        label += ` - ${endDate}`;
      }
      let temporalData = {
        label: label,
        startDate: startDate,
        endDate: endDate,
      };
      const newTemporal = new Temporal(temporalData);
      const save = await newTemporal.save(userId);
      temporal = save.data;
    }
    return temporal;
  };

  for (let i = 0; i < laySuretiesCsv.length; i += 1) {
    const row = laySuretiesCsv[i];
    const skip = cellOutput(row[laySuretiesKeys[13]]);
    if (skip !== '' && Number(skip) === 1) {
      continue;
    }
    const nameUpdated = cellOutput(row[laySuretiesKeys[3]]);
    const honorificPrefix = cellOutput(row[laySuretiesKeys[10]]);
    const alternateAppellations = cellOutput(row[laySuretiesKeys[4]]);
    const matches = cellOutput(row[laySuretiesKeys[2]]);

    const placeNameUpdated = cellOutput(row[laySuretiesKeys[5]]);
    const locationType = cellOutput(row[laySuretiesKeys[6]]);
    const placeNameAlt = cellOutput(row[laySuretiesKeys[7]]);
    const county = cellOutput(row[laySuretiesKeys[8]]);
    const diocese = cellOutput(row[laySuretiesKeys[9]]);
    const profession = cellOutput(row[laySuretiesKeys[11]]);

    // rule 1
    const fullName = handleName(nameUpdated);

    // rule 2
    const newAlternateAppellations = handleAlternateAppelations(
      alternateAppellations
    );

    const person = await newPerson(
      fullName,
      honorificPrefix,
      newAlternateAppellations
    );

    // rule 5 event habitation
    const residenceEvent = await addEvent('residence', habitationTypeId);

    // rule 6 profession event
    let professionEvent = null;
    if (profession !== '') {
      professionEvent = await addEvent(profession, professionTypeId);
    }

    // rule 7 sponsorship/guarantor event
    const sponsorshipEvent = await addEvent(
      'surety',
      sponsorshipTypeId,
      'As per the 1704 Popery Act (2 Ann c.7), a lay surety provided a sum of money as guarantee for the ‘peaceable’ behaviour of a particular priest'
    );

    // rule 3
    const matchPriests = handleMatches(matches);
    for (let m = 0; m < matchPriests.length; m += 1) {
      const matchedPriest = matchPriests[m];
      const priests = await matchPriestToDb(
        matchedPriest,
        referenceDocument,
        masterCsvKeys
      );
      if (priests.length > 0) {
        for (let p = 0; p < priests.length; p += 1) {
          const priest = priests[p];
          // rule 8 link priest to person
          const priestRef = {
            items: [
              { _id: person._id, type: 'Person', role: '' },
              { _id: priest._id, type: 'Person', role: '' },
            ],
            taxonomyTermLabel: wasSuretyToLabel,
          };
          await updateReference(priestRef);
          // link sponsorship with priest
          const sponsorshipEventRef = {
            items: [
              { _id: priest._id, type: 'Person', role: '' },
              { _id: sponsorshipEvent._id, type: 'Event', role: '' },
            ],
            taxonomyTermLabel: receivedLabel,
          };
          await updateReference(sponsorshipEventRef);
        }
      }

      // rule 5 residence event time
      const dateServing = cellOutput(matchedPriest[13]);
      if (dateServing !== '') {
        const newTemporal = await addDate(dateServing);
        const residenceTemporalReference = {
          items: [
            { _id: residenceEvent._id, type: 'Event' },
            { _id: newTemporal._id, type: 'Temporal' },
          ],
          taxonomyTermLabel: 'hasTime',
        };
        await updateReference(residenceTemporalReference);
        if (professionEvent !== null) {
          const professionTemporalReference = {
            items: [
              { _id: professionEvent._id, type: 'Event' },
              { _id: newTemporal._id, type: 'Temporal' },
            ],
            taxonomyTermLabel: 'hasTime',
          };
          await updateReference(professionTemporalReference);
        }

        const sponsorshipTemporalReference = {
          items: [
            { _id: sponsorshipEvent._id, type: 'Event' },
            { _id: newTemporal._id, type: 'Temporal' },
          ],
          taxonomyTermLabel: 'hasTime',
        };
        await updateReference(sponsorshipTemporalReference);
      }
    }

    // link person with reference resource
    const newResourceRef = {
      items: [
        { _id: person._id, type: 'Person', role: '' },
        {
          _id: refResource._id,
          type: 'Resource',
          role: '',
        },
      ],
      taxonomyTermLabel: `isReferencedIn`,
    };
    await updateReference(newResourceRef);

    // link event with person
    const residenceEventRef = {
      items: [
        { _id: person._id, type: 'Person', role: '' },
        { _id: residenceEvent._id, type: 'Event', role: '' },
      ],
      taxonomyTermLabel: maintainedLabel,
    };
    await updateReference(residenceEventRef);
    // link profession with person
    if (professionEvent !== null) {
      const professionEventRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: professionEvent._id, type: 'Event', role: '' },
        ],
        taxonomyTermLabel: hadProfessionLabel,
      };
      await updateReference(professionEventRef);
    }

    // link sponsorship with person
    const sponsorshipEventRef = {
      items: [
        { _id: person._id, type: 'Person', role: '' },
        { _id: sponsorshipEvent._id, type: 'Event', role: '' },
      ],
      taxonomyTermLabel: providedLabel,
    };
    await updateReference(sponsorshipEventRef);

    // rule 4
    // multiple organisations
    const organisations = await parseOrganisations(
      placeNameUpdated,
      locationType,
      placeNameAlt
    );
    for (let io = 0; io < organisations.length; io += 1) {
      const organisation = organisations[io];
      if (organisation !== null) {
        // 1. add relation to person
        // John Doe was resident of Slane
        const personRef = {
          items: [
            { _id: person._id, type: 'Person' },
            { _id: organisation._id, type: 'Organisation' },
          ],
          taxonomyTermLabel: 'wasResidentOf',
        };
        await updateReference(personRef);

        // 2. Spatial1 = has its episcopal see in, inverse is the episcopal see of = corresponding episcopal see of diocese in column (column J)
        const diocesesArr = diocese.split(';');
        const dioceses = diocesesArr.map((d) => cellOutput(d));
        for (let d = 0; d < dioceses.length; d += 1) {
          const di = dioceses[d];
          const dioceseDb = await loadOrganisation(di, 'Diocese');
          if (dioceseDb !== null) {
            const hasItsEpiscopalSeeIn =
              dioceseDb.spatial.find(
                (s) => s.term.label === `hasItsEpiscopalSeeIn`
              ) || null;
            if (hasItsEpiscopalSeeIn !== null) {
              const episcopalSeeInRef = {
                items: [
                  { _id: organisation._id, type: 'Organisation' },
                  {
                    _id: hasItsEpiscopalSeeIn.ref._id,
                    type: 'Spatial',
                    role: '',
                  },
                ],
                taxonomyTermLabel: 'hasItsEpiscopalSeeIn',
              };
              await updateReference(episcopalSeeInRef);
            }
          }
        }

        // 3. Spatial2 = has location = county (column I), location type = county
        const countyDb = await loadOrganisation(county, 'County');
        if (countyDb !== null) {
          const hasLocation =
            countyDb.spatial.find((s) => s.term.label === `hasLocation`) ||
            null;
          if (hasLocation !== null) {
            const hasLocationRef = {
              items: [
                { _id: organisation._id, type: 'Organisation' },
                {
                  _id: hasLocation.ref._id,
                  type: 'Spatial',
                  role: '',
                },
              ],
              taxonomyTermLabel: 'hasLocation',
            };
            await updateReference(hasLocationRef);
          }
        }

        // link organisation to residence event
        const organisationResidenceRef = {
          items: [
            { _id: organisation._id, type: 'Organisation', role: '' },
            { _id: residenceEvent._id, type: 'Event', role: '' },
          ],
          taxonomyTermLabel: 'hasRelation',
        };
        await updateReference(organisationResidenceRef);

        // link organisation to profession event
        if (professionEvent !== null) {
          const organisationProfessionRef = {
            items: [
              { _id: organisation._id, type: 'Organisation', role: '' },
              { _id: professionEvent._id, type: 'Event', role: '' },
            ],
            taxonomyTermLabel: 'hasRelation',
          };
          await updateReference(organisationProfessionRef);
        }

        // add event episcopal see in
        for (let d = 0; d < dioceses.length; d += 1) {
          const di = dioceses[d];
          const dioceseDb = await loadOrganisation(di, 'Diocese');
          if (dioceseDb !== null) {
            const hasItsEpiscopalSeeIn =
              dioceseDb.spatial.find(
                (s) => s.term.label === `hasItsEpiscopalSeeIn`
              ) || null;
            if (hasItsEpiscopalSeeIn !== null) {
              const episcopalSeeInRef = {
                items: [
                  { _id: residenceEvent._id, type: 'Event' },
                  {
                    _id: hasItsEpiscopalSeeIn.ref._id,
                    type: 'Spatial',
                    role: '',
                  },
                ],
                taxonomyTermLabel: 'hasItsEpiscopalSeeIn',
              };
              await updateReference(episcopalSeeInRef);

              const sponsorshipEpiscopalSeeInRef = {
                items: [
                  { _id: sponsorshipEvent._id, type: 'Event' },
                  {
                    _id: hasItsEpiscopalSeeIn.ref._id,
                    type: 'Spatial',
                    role: '',
                  },
                ],
                taxonomyTermLabel: 'hasItsEpiscopalSeeIn',
              };
              await updateReference(sponsorshipEpiscopalSeeInRef);
            }
          }
        }

        // 3. Spatial2 = has location = county (column I), location type = county
        if (countyDb !== null) {
          const hasLocation =
            countyDb.spatial.find((s) => s.term.label === `hasLocation`) ||
            null;
          if (hasLocation !== null) {
            const hasLocationRef = {
              items: [
                { _id: residenceEvent._id, type: 'Event' },
                {
                  _id: hasLocation.ref._id,
                  type: 'Spatial',
                  role: '',
                },
              ],
              taxonomyTermLabel: 'hasLocation',
            };
            await updateReference(hasLocationRef);
            if (professionEvent !== null) {
              const professionHasLocationRef = {
                items: [
                  { _id: professionEvent._id, type: 'Event' },
                  {
                    _id: hasLocation.ref._id,
                    type: 'Spatial',
                    role: '',
                  },
                ],
                taxonomyTermLabel: 'hasLocation',
              };
              await updateReference(professionHasLocationRef);
            }

            const sponsorshipEpiscopalSeeInRef = {
              items: [
                { _id: sponsorshipEvent._id, type: 'Event' },
                {
                  _id: hasLocation.ref._id,
                  type: 'Spatial',
                  role: '',
                },
              ],
              taxonomyTermLabel: 'hasLocation',
            };
            await updateReference(sponsorshipEpiscopalSeeInRef);
          }
        }
      }
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
  const alphabet = 'a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z';
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
