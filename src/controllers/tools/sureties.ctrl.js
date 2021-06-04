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
// const { Resource } = require('../resource.ctrl');
// const { Spatial } = require('../spatial.ctrl');
const { Taxonomy } = require('../taxonomy.ctrl');
const { TaxonomyTerm } = require('../taxonomyTerm.ctrl');
const { updateReference } = require('../references.ctrl');

// const DEBUG = false;

// parse arguments
const argv = yargs
  .command('letterKey', 'Find the key of a column')
  .command(
    'laySuretiesLocations',
    '1704 dataset prepare lay sureties locations'
  )
  .command('mergeLaySureties', '1704 lay sureties merge people')
  .command('ingestLaySureties', 'ingest 1704 dataset lay sureties')
  .command('addIds', '')
  .command('addBom', '')
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

const addBom = async () => {
  const path = `${archivePath}documents/1704/lay-sureties-merged.csv`;
  const csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(path)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  const csvKeys = Object.keys(csv['0']);
  const head = csvKeys.map((h) => `"${h}"`).join(',');
  let csvText = `${head}\n`;
  for (let i = 0; i < csv.length; i += 1) {
    const row = csv[i];
    let rowText = '';
    // eslint-disable-next-line
    for (const [key, value] of Object.entries(row)) {
      rowText += `"${value}",`;
    }
    csvText += `${rowText}\n`;
  }
  const outputPath = `${archivePath}documents/1704/lay-sureties-merged-2.csv`;
  await new Promise((resolve, reject) => {
    fs.writeFile(outputPath, `\ufeff${csvText}`, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  // stop executing
  process.exit();
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

/*
const getTaxonomyTerms = async (_id) => {
  let session = driver.session();
  let query = `MATCH (t:Taxonomy) WHERE id(t)=${_id} MATCH (n:TaxonomyTerm)-[r:isChildOf]->(t) RETURN n ORDER BY n.label`;
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    });
  let taxonomyTerms = helpers.normalizeRecordsOutput(nodesPromise, 'n');
  return taxonomyTerms;
};

const normalizeOrdinationDate = (date = '') => {
  if (date === '') {
    return '';
  }
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const newDate = date.split(' ');
  let d = '',
    m = '',
    y = '';
  if (newDate.length === 1) {
    y = newDate[0].replace('c.', '');
  }
  if (newDate.length === 2) {
    m = months.indexOf(newDate[0]) + 1;
    y = newDate[1];
  }
  if (newDate.length === 3) {
    d = newDate[0];
    m = months.indexOf(newDate[1]) + 1;
    y = newDate[2];
  }
  let newTemporal = '';
  if (d !== '') {
    newTemporal = d;
  }
  if (m !== '') {
    if (newTemporal !== '') {
      newTemporal += '-';
    }
    newTemporal += m;
  }
  if (y !== '') {
    if (newTemporal !== '') {
      newTemporal += '-';
    }
    newTemporal += y;
  }
  let startDate = '',
    endDate = '';
  if (d === '' && m === '') {
    startDate = `01-01-${y}`;
    endDate = `31-12-${y}`;
  }
  if (d === '' && m !== '') {
    startDate = `01-${m}-${y}`;
    const lastDay = getDaysInMonth(m, y);
    endDate = `${lastDay}-${m}-${y}`;
  }
  if (d !== '' && m !== '') {
    startDate = `${d}-${m}-${y}`;
    endDate = startDate;
  }
  return { label: date, startDate, endDate };
};
*/
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

const laySuretiesLocations = async () => {
  const t0 = performance.now();
  const session = driver.session();

  const locationsCsvPath = `${archivePath}documents/1704/locations.csv`;
  const locationsCsv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(locationsCsvPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  const locationsKeys = Object.keys(locationsCsv['0']);

  const laySuretiesCsvPath = `${archivePath}documents/1704/lay-sureties.csv`;
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

  const newLocations = [];
  for (let i = 0; i < laySuretiesCsv.length; i += 1) {
    const row = laySuretiesCsv[i];
    let placeNameUpdated = row[laySuretiesKeys[5]] || '';
    placeNameUpdated = placeNameUpdated.trim();
    let locationType = row[laySuretiesKeys[6]] || '';
    locationType = locationType.trim();
    let placeNameAlternate = row[laySuretiesKeys[7]] || '';
    placeNameAlternate = placeNameAlternate.trim();
    let county = row[laySuretiesKeys[8]] || '';
    county = county.trim();
    let diocese = row[laySuretiesKeys[9]] || '';
    diocese = diocese.trim();
    const location =
      locationsCsv.find(
        (f) =>
          f[locationsKeys[1]].trim() === placeNameUpdated &&
          f[locationsKeys[2]].trim() === locationType &&
          f[locationsKeys[3]].trim() === diocese
      ) || null;
    if (location === null) {
      const query = `MATCH (n:Organisation {label:"${placeNameUpdated}",organisationType:"${locationType}"}) RETURN n`;
      const locationDB = await session
        .writeTransaction((tx) => tx.run(query, {}))
        .then((result) => {
          let records = result.records;
          if (records.length > 0) {
            let record = records[0].toObject();
            let outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          }
          return null;
        })
        .catch((error) => {
          console.log(error);
        });
      if (locationDB === null) {
        const newLocation = {
          'Place name updated': placeNameUpdated,
          'Location Type': locationType,
          'Place name alternate appellation': placeNameAlternate,
          County: county,
          Diocese: diocese,
        };
        const inNewLocations =
          newLocations.find(
            (f) =>
              f['Place name updated'] === placeNameUpdated &&
              f['Location Type'] === locationType
          ) || null;
        if (inNewLocations === null) {
          newLocations.push(newLocation);
        }
      }
    }
  }
  newLocations.sort((a, b) =>
    a['Place name updated'] > b['Place name updated'] ? 1 : -1
  );
  const outputPath = `${archivePath}documents/1704/lay-sureties-locations.csv`;
  let csvText =
    'Place name updated,Location Type,Place name alternate appellation,County,Diocese\n';
  for (let k in newLocations) {
    let row = newLocations[k];
    csvText += `${row['Place name updated']},${row['Location Type']},${row['Place name alternate appellation']},${row.County},${row.Diocese}\n`;
  }
  await new Promise((resolve, reject) => {
    fs.writeFile(outputPath, `\ufeff${csvText}`, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });

  const t1 = performance.now();
  const elapsed = helpers.msToTime(t1 - t0);
  console.log(`process completed in ${elapsed}`);
  session.close();
  // stop executing
  process.exit();
};

const mergeLaySureties = async () => {
  const t0 = performance.now();

  const laySuretiesCsvPath = `${archivePath}documents/1704/lay-sureties.csv`;
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

  const newData = [];
  for (let i = 0; i < laySuretiesCsv.length; i += 1) {
    const row = laySuretiesCsv[i];
    let dataItem = {
      Name: '',
      Count: '',
      Lines: '',
      'Name updated': '',
      'Alternate appellation': '',
      'Place name updated': '',
      'Location Type': '',
      'Place name alternate appellation': '',
      County: '',
      Diocese: '',
      'Title (honorific prefix)': '',
      Profesion: '',
      Number: '',
      Skip: '',
      Date: '',
    };

    const name = cellOutput(row[laySuretiesKeys[0]]);
    const count = cellOutput(row[laySuretiesKeys[1]]);
    const lines = cellOutput(row[laySuretiesKeys[2]]);
    const nameUpdated = cellOutput(row[laySuretiesKeys[3]]);
    const alternateAppellation = cellOutput(row[laySuretiesKeys[4]]);
    const placeNameUpdated = cellOutput(row[laySuretiesKeys[5]]);
    const locationType = cellOutput(row[laySuretiesKeys[6]]);
    const placeNameAlternateAppellation = cellOutput(row[laySuretiesKeys[7]]);
    const county = cellOutput(row[laySuretiesKeys[8]]);
    const diocese = cellOutput(row[laySuretiesKeys[9]]);
    const titleHonorificPrefix = cellOutput(row[laySuretiesKeys[10]]);
    const profesion = cellOutput(row[laySuretiesKeys[11]]);
    const numberId = cellOutput(row[laySuretiesKeys[12]]);
    const skip = cellOutput(row[laySuretiesKeys[13]]);
    const date = cellOutput(row[laySuretiesKeys[14]]);
    if (skip !== '' && Number(skip) === 1) {
      continue;
    }

    const existingLine = newData.find((l) => l['Number'] === numberId) || null;
    if (existingLine === null) {
      dataItem['Name'] = name;
      dataItem['Count'] = count;
      dataItem['Lines'] = lines;
      dataItem['Name updated'] = nameUpdated;
      dataItem['Alternate appellation'] = alternateAppellation;
      dataItem['Place name updated'] = placeNameUpdated;
      dataItem['Location Type'] = locationType;
      dataItem[
        'Place name alternate appellation'
      ] = placeNameAlternateAppellation;
      dataItem['County'] = county;
      dataItem['Diocese'] = diocese;
      dataItem['Title (honorific prefix)'] = titleHonorificPrefix;
      dataItem['Profesion'] = profesion;
      dataItem['Number'] = numberId;
      dataItem['Skip'] = skip;
      dataItem['Date'] = date;
      newData.push(dataItem);
    } else {
      const index = newData.indexOf(existingLine);
      if (!existingLine['Name'].includes(name)) {
        if (existingLine['Name'] !== '') {
          existingLine['Name'] += ';';
        }
        existingLine['Name'] += name;
      }
      existingLine['Count'] = Number(existingLine['Count']) + Number(count);
      if (!existingLine['Lines'].includes(lines)) {
        if (existingLine['Lines'] !== '') {
          existingLine['Lines'] += '|';
        }
        existingLine['Lines'] += lines;
      }
      if (!existingLine['Name updated'].includes(nameUpdated)) {
        if (existingLine['Name updated'] !== '') {
          if (!existingLine['Alternate appellation'].includes(nameUpdated)) {
            if (existingLine['Alternate appellation'] !== '') {
              existingLine['Alternate appellation'] += ';';
            }
            existingLine['Alternate appellation'] += nameUpdated;
          }
        } else {
          existingLine['Name updated'] += nameUpdated;
        }
      }
      if (
        !existingLine['Alternate appellation'].includes(alternateAppellation)
      ) {
        if (existingLine['Alternate appellation'] !== '') {
          existingLine['Alternate appellation'] += ';';
        }
        existingLine['Alternate appellation'] += alternateAppellation;
      }
      if (!existingLine['Place name updated'].includes(placeNameUpdated)) {
        if (existingLine['Place name updated'] !== '') {
          existingLine['Place name updated'] += ';';
        }
        existingLine['Place name updated'] += placeNameUpdated;
      }
      if (!existingLine['Location Type'].includes(locationType)) {
        if (existingLine['Location Type'] !== '') {
          existingLine['Location Type'] += ';';
        }
        existingLine['Location Type'] += locationType;
      }
      if (
        !existingLine['Place name alternate appellation'].includes(
          placeNameAlternateAppellation
        )
      ) {
        if (existingLine['Place name alternate appellation'] !== '') {
          existingLine['Place name alternate appellation'] += ';';
        }
        existingLine[
          'Place name alternate appellation'
        ] += placeNameAlternateAppellation;
      }
      if (!existingLine['County'].includes(county)) {
        if (existingLine['County'] !== '') {
          existingLine['County'] += ';';
        }
        existingLine['County'] += county;
      }
      if (!existingLine['Diocese'].includes(diocese)) {
        if (existingLine['Diocese'] !== '') {
          existingLine['Diocese'] += ';';
        }
        existingLine['Diocese'] += diocese;
      }
      if (
        !existingLine['Title (honorific prefix)'].includes(titleHonorificPrefix)
      ) {
        existingLine['Title (honorific prefix)'] += `|${titleHonorificPrefix}`;
      }
      if (!existingLine['Profesion'].includes(profesion)) {
        existingLine['Profesion'] += `|${profesion}`;
      }
      if (!existingLine['Number'].includes(numberId)) {
        existingLine['Number'] += `|${numberId}`;
      }
      if (!existingLine['Skip'].includes(skip)) {
        existingLine['Skip'] += `|${skip}`;
      }
      if (!existingLine['Date'].includes(date)) {
        existingLine['Date'] += `|${date}`;
      }
      newData[index] = existingLine;
    }
  }

  const outputPath = `${archivePath}documents/1704/lay-sureties-merged.csv`;
  let csvText = `Name,"Count","Lines","Name updated","Alternate appellation","Place name updated","Location Type","Place name alternate appellation","County","Diocese","Title (honorific prefix)","Profesion","Number","Skip","Date"\n`;
  for (let i = 0; i < newData.length; i += 1) {
    const row = newData[i];
    csvText += `"${row['Name']}","${row['Count']}","${row['Lines']}","${row['Name updated']}","${row['Alternate appellation']}","${row['Place name updated']}","${row['Location Type']}","${row['Place name alternate appellation']}","${row['County']}","${row['Diocese']}","${row['Title (honorific prefix)']}","${row['Profesion']}","${row['Number']}","${row['Skip']}","${row['Date']}",\n`;
  }
  await new Promise((resolve, reject) => {
    fs.writeFile(outputPath, `\ufeff${csvText}`, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  const t1 = performance.now();
  const elapsed = helpers.msToTime(t1 - t0);
  console.log(`process completed in ${elapsed}`);
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

const ingestLaySureties = async () => {
  const t0 = performance.now();
  const session = driver.session();
  const userId = await getAdminId();

  /* const locationsCsvPath = `${archivePath}documents/1704/locations.csv`;
  const locationsCsv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(locationsCsvPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  const locationsKeys = Object.keys(locationsCsv['0']); */

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

const addIds = async () => {
  const t0 = performance.now();

  const masterCsvPath = `${archivePath}documents/1704/1704-master.csv`;
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

  const data1 = [
    { line: 2, name: 'Patrick Dornan', id: 74399 },
    { line: 21, name: 'John Byrne', id: 74572 },
    { line: 33, name: 'Patrick Murphy', id: 74656 },
    { line: 52, name: 'Jacobus Ryan', id: 74814 },
    { line: 53, name: 'Patrick Brady', id: 74820 },
    { line: 54, name: 'Patrick Brady', id: 74828 },
    { line: 55, name: 'Hugh Brady', id: 74833 },
    { line: 56, name: 'Hugh Brady', id: 74840 },
    { line: 58, name: 'John Brady', id: 74852 },
    { line: 59, name: 'Patrick Brady', id: 74858 },
    { line: 81, name: 'John Smith', id: 75012 },
    { line: 134, name: 'Foelix Carty', id: 75423 },
    { line: 136, name: 'Foelix Carty', id: 75438 },
    { line: 150, name: 'Teige Daly', id: 75563 },
    { line: 170, name: 'Dermod Murphy', id: 75713 },
    { line: 171, name: 'Dermod Murphy', id: 75719 },
    { line: 179, name: 'Teige Sullivan', id: 75786 },
    { line: 181, name: 'Teige Sullivan', id: 75801 },
    { line: 183, name: 'Teige Sullivan', id: 75818 },
    { line: 263, name: 'Fergus Farrell', id: 76379 },
    { line: 458, name: 'Matthew Cullen', id: 77728 },
    { line: 473, name: 'John Kelly', id: 77845 },
    { line: 474, name: 'Bryan mac Cabe', id: 77851 },
    { line: 478, name: 'Richard Power', id: 77880 },
    { line: 503, name: 'Edmond Murphy', id: 78108 },
    { line: 507, name: 'Jacobus Ryan', id: 78136 },
    { line: 516, name: 'Anth. Coughlan', id: 78217 },
    { line: 517, name: 'Matthew Cullen', id: 78225 },
    { line: 518, name: 'Michael Dillon', id: 78232 },
    { line: 519, name: 'James Dillon', id: 78239 },
    { line: 527, name: 'John Kennedy', id: 78314 },
    { line: 548, name: 'Owen mac Hugh', id: 78448 },
    { line: 554, name: 'Miles Reily Infirme', id: 78482 },
    { line: 633, name: 'Garrett Ferrall', id: 79069 },
    { line: 634, name: 'Garrett Ferrall', id: 79075 },
    { line: 638, name: 'Lewis Ferrall', id: 79103 },
    { line: 648, name: 'James Reilly', id: 79175 },
    { line: 650, name: 'Patrick Burne', id: 79196 },
    { line: 673, name: 'Walter Costello', id: 79387 },
    { line: 678, name: 'Patrick Duffy', id: 79423 },
    { line: 679, name: 'Edmond Duffy', id: 79428 },
    { line: 680, name: 'Edmond Duffy', id: 79435 },
    { line: 690, name: 'Richard Jordan', id: 79500 },
    { line: 691, name: 'Richard Jordan', id: 79506 },
    { line: 695, name: 'Patrick Kirwan', id: 79532 },
    { line: 699, name: 'Eneas mac Donnell', id: 79559 },
    { line: 700, name: 'Eneas mac Donnell', id: 79566 },
    { line: 709, name: 'David Roch', id: 79632 },
    { line: 714, name: 'Richard Welsh', id: 79666 },
    { line: 777, name: 'Patrick Duffy', id: 80164 },
    { line: 778, name: 'James Duffy', id: 80171 },
    { line: 779, name: 'James Duffy', id: 80178 },
    { line: 782, name: 'Bryan mac Cabe', id: 80196 },
    { line: 786, name: 'Bryan mac Mahon', id: 80221 },
    { line: 787, name: 'Bryan mac Mahon', id: 80227 },
    { line: 790, name: 'John Brady', id: 80245 },
    { line: 836, name: 'Owen Kelly', id: 80578 },
    { line: 837, name: 'Thady Kelly', id: 80584 },
    { line: 1014, name: 'James Dalton', id: 81882 },
    { line: 1018, name: 'Michael Dillon', id: 81912 },
    { line: 1019, name: 'James Dillon', id: 81919 },
    { line: 1023, name: 'Lewis Ferrall', id: 81943 },
    { line: 1038, name: 'Miles Reilly', id: 82057 },
    { line: 1058, name: 'John Kelly', id: 82236 },
    { line: 1071, name: 'David Roch', id: 82355 },
    { line: 1076, name: 'Richard Welsh', id: 82413 },
  ];

  const data2 = [
    { line: 4, name: 'Parick mac Garry', id: 74421 },
    { line: 11, name: 'Phelomy ô Hamill', id: 74482 },
    { line: 16, name: 'Neale ô Neale', id: 74527 },
    { line: 24, name: 'Patrick Donelly', id: 74590 },
    { line: 28, name: 'Dennis Hughs', id: 74618 },
    { line: 71, name: 'Conner Reily', id: 74946 },
    { line: 76, name: 'Connor Riley', id: 74980 },
    { line: 79, name: 'Terrence Smith', id: 74999 },
    { line: 109, name: 'Brien mac Mahon', id: 75232 },
    { line: 111, name: 'Connor mac Nemara', id: 75247 },
    { line: 117, name: 'Connor Moylane', id: 75288 },
    { line: 119, name: 'Connor ô Brien', id: 75300 },
    { line: 159, name: 'Mortough Kiliher', id: 75637 },
    { line: 160, name: 'Dennis Leary', id: 75644 },
    { line: 277, name: 'Ever mac Mahoone', id: 76471 },
    { line: 278, name: 'Patrick mac Mahoone', id: 76476 },
    { line: 289, name: 'Dennis ô Hara', id: 76540 },
    { line: 489, name: 'Dennis Conlean', id: 77969 },
    { line: 524, name: 'Dennis Gilfoyle', id: 78282 },
    { line: 535, name: 'Dennis Cannan', id: 78375 },
    { line: 546, name: 'Dominick mac Garry', id: 78436 },
    { line: 550, name: 'Conner mac Loughlin', id: 78459 },
    { line: 622, name: 'Donaghy mac Closky', id: 78988 },
    { line: 658, name: 'Rosse mac Mahon', id: 79279 },
    { line: 659, name: 'Andrew Mathews', id: 79288 },
    { line: 668, name: 'Dominick Berne', id: 79355 },
    { line: 685, name: 'Dennis Ginnane', id: 79469 },
    { line: 776, name: 'Thorlaugh Connally', id: 80158 },
    { line: 792, name: 'Dennis Caffin', id: 80261 },
    { line: 806, name: 'Nicholas Berne', id: 80384 },
    { line: 807, name: 'John Berne', id: 80390 },
    { line: 808, name: 'Farrel Berne', id: 80397 },
    { line: 833, name: 'Carbry Kelly', id: 80559 },
    { line: 848, name: 'Thady Mullretine', id: 80655 },
    { line: 868, name: 'Dennis Dermot', id: 80789 },
    { line: 872, name: 'Cha. Hara', id: 80818 },
    { line: 881, name: 'Dennis Kerrigan', id: 80876 },
    { line: 884, name: 'Teague mac Donnagh', id: 80898 },
    { line: 1041, name: 'Phillip Tyrrell', id: 82077 },
  ];
  const data = [...data1, ...data2];
  const newData = [...masterCsv];
  for (let i = 0; i < data.length; i += 1) {
    const item = data[i];
    const line = Number(item.line) - 2;
    newData[line][masterCsvKeys[24]] = item.id;
    console.log(
      `${masterCsv[line][masterCsvKeys[1]]} ${
        masterCsv[line][masterCsvKeys[0]]
      }`
    );
  }
  const outputPath = `${archivePath}documents/1704/1704-master-ids.csv`;
  const head = masterCsvKeys.map((h) => `"${h}"`).join(',');
  let csvText = `${head}\n`;
  for (let i = 0; i < newData.length; i += 1) {
    const row = newData[i];
    let rowText = '';
    // eslint-disable-next-line
    for (const [key, value] of Object.entries(row)) {
      rowText += `"${value}",`;
    }
    csvText += `${rowText}\n`;
  }
  await new Promise((resolve, reject) => {
    fs.writeFile(outputPath, `\ufeff${csvText}`, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  const t1 = performance.now();
  const elapsed = helpers.msToTime(t1 - t0);
  console.log(`process completed in ${elapsed}`);
  process.exit();
};

if (argv._.includes('execQuery')) {
  execQuery();
}
if (argv._.includes('laySuretiesLocations')) {
  laySuretiesLocations();
}
if (argv._.includes('ingestLaySureties')) {
  ingestLaySureties();
}
if (argv._.includes('mergeLaySureties')) {
  mergeLaySureties();
}
if (argv._.includes('letterKey')) {
  letterKey();
}
if (argv._.includes('addIds')) {
  addIds();
}
if (argv._.includes('addBom')) {
  addBom();
}
