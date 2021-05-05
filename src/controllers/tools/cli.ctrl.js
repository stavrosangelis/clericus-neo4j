if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: '../../../.env.production' });
} else {
  require('dotenv').config({ path: '../../../.env.development' });
}
const yargs = require('yargs');
const helpers = require('../../helpers');
const csvParser = require('csv-parser');
const driver = require('../../config/db-driver');
const fs = require('fs');
const archivePath = process.env.ARCHIVEPATH;
const Person = require('../person.ctrl').Person;
const Organisation = require('../organisation.ctrl').Organisation;
const Taxonomy = require('../taxonomy.ctrl').Taxonomy;
const TaxonomyTerm = require('../taxonomyTerm.ctrl').TaxonomyTerm;
const updateReference = require('../references.ctrl').updateReference;

const DEBUG = false;

// parse arguments
const argv = yargs
  .command('parse', 'Parse provided csv or csvs')
  .command('ec1', 'Export matriculation classes 1')
  .command('ec2', 'Export matriculation classes 2')
  .command('ic', 'Ingest classes from exported csvs')
  .command('duplim', 'Identify duplicates from the list of manual entries')
  .command('duplia', 'Identify duplicates from the list of automatic entries')
  .command('fixa', 'Fix automatic entries matriculation events')
  .command('fixm', 'Fix manual entries matriculation events')
  .command(
    'rmom',
    'Relate people related to matriculation and ordination events to maynooth university'
  )
  .command('rh2', 'Relate people added before October 2020 to Hamell 2')
  .command('1704ep', 'Export places from 1704 excel')
  .command('1704ls', 'Export Lay Sureties from 1704 excel')
  .command('ed', 'Export dioceses')
  .command('ep', 'Export parishes')
  .command('ingesticp', 'Ingest ICP data')
  .command('icpLocations', 'Fix ICP locations data')
  .command(
    'referenceMainICP',
    'Add a relationship to all items related with one or more ICP references to the main ICP reference'
  )
  .command('expOT', 'Export 1704 organisation types')
  .command('ingest1704', 'Ingest 1704 iptcData')
  .command('checkSpatial', '1704 dataset check if spatials are in the database')
  .command('check1704Locations', '1704 dataset check locations csv')
  .command('checkTemporal', '1704 dataset check temporal values')
  .command('checkOrdinationDates', '1704 dataset check ordination dates values')
  .command('cob', '1704 dataset check ordination bishops')
  .command('ib', '1704 dataset ingest ordination bishops')
  .command(
    'checkOrdinationLocation',
    '1704 dataset check ordination location values'
  )
  .example('$0 parse -i data.csv', 'parse the contents of the csv file')
  .option('csv', {
    alias: 'c',
    description: 'Provide the path to a csv',
    type: 'string',
  })
  .option('folder', {
    alias: 'f',
    description: 'Provide the path of the folder that contains the csv files',
    type: 'string',
  })
  .option('csvheaders', {
    alias: 'csvh',
    description:
      'State if the csv/csvs have headers and they need to be removed',
    type: 'boolean',
  })
  .help('h')
  .alias('help', 'h').argv;
// check if mandatory arguments are present
/* if (!argv.csv && !argv.folder) {
    console.log('You must either provide a path to a csv file or a path to a folder containing csv files.');
    return false;
}*/

if (argv.csv) {
  const exists = fs.existsSync(argv.csv);
  if (!exists) {
    console.log('The path to the csv file is not valid');
    // stop executing
    process.exit();
  }
}

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

const parseCsv = async () => {
  const path = argv.csv;
  const headers = [
    'Organisation',
    'Organisation type',
    'Cathedral city',
    'Corrected organisation label',
  ];
  var csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(path)
      .pipe(csvParser(headers))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  if (argv.csvh) {
    csv.splice(0, 1);
  }
  console.log(csv);
  // stop executing
  process.exit();
};

const ec1 = async () => {
  const path = `${archivePath}documents/hamell-correction/manual-entries.csv`;
  const headers = [
    'Surname',
    'First Name',
    'Diocese',
    'Entered',
    'Ordained',
    'Class',
    'Address',
    'Alternate Surname',
    'Alternate First Name',
    'Comment',
  ];

  var csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(path)
      .pipe(csvParser(headers))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  if (argv.csvh) {
    csv.splice(0, 1);
  }
  var newCsv = [];
  for (let rowKey in csv) {
    let row = csv[rowKey];
    let rowKeys = Object.keys(row);
    let newClass = row[rowKeys[5]].trim();
    if (newClass !== '' && newCsv.indexOf(newClass) === -1) {
      newCsv.push(newClass);
    }
  }
  let csvPath = `${archivePath}documents/hamell-correction/manual-entries-classes.csv`;
  let csvText = newCsv.join('\n');
  let writeFile = await new Promise((resolve, reject) => {
    fs.writeFile(csvPath, csvText, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  console.log(writeFile);
  // stop executing
  process.exit();
};

const ec2 = async () => {
  const path = `${archivePath}documents/hamell-correction/automatic-entries.csv`;
  const headers = [
    'Surname',
    'First Name',
    'Diocese',
    'Entered',
    'Ordained',
    'Class',
    'Address',
    'Alternate Surname',
    'Alternate First Name',
    'Comment',
  ];

  var csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(path)
      .pipe(csvParser(headers))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  if (argv.csvh) {
    csv.splice(0, 1);
  }
  var newCsv = [];
  for (let rowKey in csv) {
    let row = csv[rowKey];
    let rowKeys = Object.keys(row);
    let newClass = row[rowKeys[5]].trim();
    if (newClass !== '' && newCsv.indexOf(newClass) === -1) {
      newCsv.push(newClass);
    }
  }
  let csvPath = `${archivePath}documents/hamell-correction/automatic-entries-classes.csv`;
  let csvText = newCsv.join('\n');
  let writeFile = await new Promise((resolve, reject) => {
    fs.writeFile(csvPath, csvText, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  console.log(writeFile);
  // stop executing
  process.exit();
};

const ingestClasses = async () => {
  const userId = await getAdminId();
  const mcTaxonomy = new Taxonomy({ systemType: 'matriculationClass' });
  await mcTaxonomy.load();

  let newClasses = [];
  // classes csv 1
  const ec1Path = `${archivePath}documents/hamell-correction/manual-entries-classes.csv`;
  var c1 = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(ec1Path)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  // c1.splice(0,1);
  for (let ck in c1) {
    let row = c1[ck];
    let rowKeys = Object.keys(row);
    let rowDBClass = row[rowKeys[1]].trim();
    if (rowDBClass !== '' && newClasses.indexOf(rowDBClass) === -1) {
      newClasses.push(rowDBClass);
    }
  }
  // classes csv 2
  const ec2Path = `${archivePath}documents/hamell-correction/automatic-entries-classes.csv`;
  var c2 = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(ec2Path)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  for (let ck in c2) {
    let row = c2[ck];
    let rowKeys = Object.keys(row);
    let rowDBClass = row[rowKeys[1]].trim();
    if (rowDBClass !== '' && newClasses.indexOf(rowDBClass) === -1) {
      newClasses.push(rowDBClass);
    }
  }
  newClasses.sort();

  let nonDBClasses = [];
  for (let ck in newClasses) {
    let className = newClasses[ck];
    let session = driver.session();
    let query = `MATCH (n:TaxonomyTerm) WHERE n.label="${className}" return n`;
    let node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        let records = result.records;
        if (records.length > 0) {
          let record = records[0].toObject();
          let outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
        return null;
      });
    // console.log(node)
    if (node === null) {
      nonDBClasses.push(className);
    }
  }
  for (let i in nonDBClasses) {
    let newLabel = nonDBClasses[i];
    // add new taxonomy to the db
    let newDBClass = new TaxonomyTerm({
      label: newLabel,
      inverseLabel: newLabel,
    });
    let newDBClassData = await newDBClass.save(userId);
    // add reference to matriculation class taxonomy
    let newRef = {
      items: [
        { _id: newDBClassData.data._id, type: 'TaxonomyTerm', role: '' },
        { _id: mcTaxonomy._id, type: 'Taxonomy', role: '' },
      ],
      taxonomyTermLabel: 'isChildOf',
    };
    await updateReference(newRef);
  }
  // stop executing
  process.exit();
};

const identifyDuplicatesManual = async () => {
  const classesCsv = `${archivePath}documents/hamell-correction/manual-entries-classes.csv`;
  var classesData = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(classesCsv)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  let classes = [];
  for (let c in classesData) {
    let row = classesData[c];
    let rowKeys = Object.keys(row);
    let newKey = row[rowKeys[0]].trim();
    let newValue = row[rowKeys[1]];
    let newAltValue = row[rowKeys[2]] || '';
    if (newValue !== '') {
      classes.push({
        key: newKey,
        value: newValue.trim(),
        altValue: newAltValue,
      });
    }
  }
  const csvPath = `${archivePath}documents/hamell-correction/manual-entries.csv`;
  const session = driver.session();

  // load c1
  var csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  csv.splice(0, 1);
  let newCsv = [];
  let missingCsv = [];
  // loop over c1
  for (let ck in csv) {
    if (DEBUG) {
      if (Number(ck) < 6) {
        continue;
      }
      if (Number(ck) > 6) {
        break;
      }
    }
    let row = csv[ck];
    let rowKeys = Object.keys(row);
    let fname = row[rowKeys[1]].trim();
    let lname = row[rowKeys[0]].trim();
    let diocese = row[rowKeys[2]].trim();
    let entered = row[rowKeys[3]].trim();
    let ordained = row[rowKeys[4]].trim();
    let personClass = row[rowKeys[5]].trim();
    let address = row[rowKeys[6]].trim();
    let alLName = row[rowKeys[7]].trim();
    let alFName = row[rowKeys[8]].trim();
    let comment = row[rowKeys[9]].trim();
    let existingPersonRow = `"${lname}","${fname}","${diocese}","${entered}","${ordained}","${personClass}","${address}","${alLName}","${alFName}","${comment}"`;

    let qpAttributes = '';
    if (fname !== '') {
      qpAttributes = `toLower(n.firstName)=~toLower(".*${helpers.addslashes(
        fname
      )}.*")`;
      if (lname !== '') {
        qpAttributes += ' AND ';
      }
    }
    if (lname !== '') {
      qpAttributes += `toLower(n.lastName)=~toLower(".*${helpers.addslashes(
        lname
      )}.*")`;
    }

    let dioceseQuery = '';
    if (diocese !== '') {
      let dioceseQueryTerm = diocese;
      if (diocese === 'Down and Connor') {
        dioceseQueryTerm = 'Down';
      }
      if (diocese === 'Cork and Ross') {
        dioceseQueryTerm = 'Cork';
      }
      dioceseQuery = '-[r:hasAffiliation]-(t:Organisation)';
      if (diocese !== dioceseQueryTerm) {
        qpAttributes += `AND (toLower(t.label)=~toLower(".*${helpers.addslashes(
          dioceseQueryTerm
        )}.*") OR toLower(t.label)=~toLower(".*${helpers.addslashes(
          diocese
        )}.*"))`;
      } else {
        qpAttributes += `AND toLower(t.label)=~toLower(".*${helpers.addslashes(
          dioceseQueryTerm
        )}.*")`;
      }
    }
    if (qpAttributes !== '') {
      qpAttributes = `WHERE ${qpAttributes}`;
    }
    let queryPerson = `match (n:Person)${dioceseQuery} ${qpAttributes}`;
    queryPerson += ' return n';
    if (DEBUG) {
      console.log(queryPerson);
    }
    let queryPromise = await session
      .writeTransaction((tx) => tx.run(queryPerson, {}))
      .then((result) => {
        return result.records;
      });
    let people = helpers.normalizeRecordsOutput(queryPromise);
    let person = null;
    if (people.length === 1) {
      person = people[0];
    } else {
      if (DEBUG) {
        console.log('alternatives', alLName, alFName);
      }
      if (alLName !== '' && alFName !== '') {
        people = people.filter((person) => {
          for (let ap in person.alternateAppelations) {
            let alternateAppelation = person.alternateAppelations[ap];
            let alFirstName = '';
            let alLastName = '';

            let parsed = JSON.parse(alternateAppelation);
            alFirstName = parsed.firstName;
            alLastName = parsed.lastName;

            if (
              alLName.trim().toLowerCase() ===
                alLastName.trim().toLowerCase() &&
              alFName.trim().toLowerCase() === alFirstName.trim().toLowerCase()
            ) {
              return true;
            }
          }
          return false;
        });
        if (people.length === 1) {
          person = people[0];
        } else {
          for (let i in people) {
            let p = people[i];
            if (personClass.trim() === '') {
              continue;
            }
            let findPersonClassQT = classes.find(
              (c) => c.key === personClass.trim()
            );
            if (typeof findPersonClassQT === 'undefined') {
              console.log(`${personClass.trim()}`);
              continue;
            }
            let personClassQT = findPersonClassQT.altValue;
            if (personClassQT === '') {
              personClassQT = findPersonClassQT.value;
            }
            if (typeof personClassQT === 'undefined') {
              continue;
            }
            let eventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE n.label="Matriculation into ${personClassQT}" AND id(t)=${p._id} RETURN n`;
            if (DEBUG) {
              console.log('\n');
              console.log(personClass.trim());
              console.log(personClassQT);
              console.log(eventQuery);
              console.log('\n');
            }
            let eventPromise = await session
              .writeTransaction((tx) => tx.run(eventQuery, {}))
              .then((result) => {
                let records = result.records;
                if (records.length > 0) {
                  let record = records[0];
                  let newEvent = record.toObject().n;
                  newEvent = helpers.outputRecord(newEvent);
                  return newEvent;
                }
                return null;
              });
            if (eventPromise === null) {
              continue;
            } else {
              person = p;
            }
          }
        }
      } else {
        people = people.filter((person) => {
          if (
            typeof person.alternateAppelations === 'undefined' ||
            person.alternateAppelations.length === 0
          ) {
            return true;
          }
          return false;
        });
        if (people.length === 1) {
          person = people[0];
        } else {
          for (let i in people) {
            let p = people[i];
            if (personClass.trim() === '') {
              continue;
            }
            let findPersonClassQT = classes.find(
              (c) => c.key === personClass.trim()
            );
            if (typeof findPersonClassQT === 'undefined') {
              console.log(`${personClass.trim()}`);
              continue;
            }
            let personClassQT = findPersonClassQT.altValue;
            if (personClassQT === '') {
              personClassQT = findPersonClassQT.value;
            }
            if (typeof personClassQT === 'undefined') {
              continue;
            }
            let eventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE n.label="Matriculation into ${personClassQT}" AND id(t)=${p._id} RETURN n`;
            if (DEBUG) {
              console.log('\n');
              console.log(personClass.trim());
              console.log(personClassQT);
              console.log(eventQuery);
              console.log('\n');
            }
            let eventPromise = await session
              .writeTransaction((tx) => tx.run(eventQuery, {}))
              .then((result) => {
                let records = result.records;
                if (records.length > 0) {
                  let record = records[0];
                  let newEvent = record.toObject().n;
                  newEvent = helpers.outputRecord(newEvent);
                  return newEvent;
                }
                return null;
              });
            if (eventPromise === null) {
              continue;
            } else {
              person = p;
            }
          }
        }
      }
    }
    if (person !== null) {
      existingPersonRow += `,${person._id}`;
      newCsv.push(existingPersonRow);
    } else {
      // load people by last name and check the altername first name
      let queryAlPerson = `match (n:Person) WHERE toLower(n.lastName)=toLower("${helpers.addslashes(
        lname
      )}") return n`;
      let queryAlPromise = await session
        .writeTransaction((tx) => tx.run(queryAlPerson, {}))
        .then((result) => {
          return result.records;
        });
      console.log(queryAlPromise);
      let people = helpers.normalizeRecordsOutput(queryPromise);
      let newPerson = people.find((person) => {
        let alternateAppelation = person.alternateAppelations[0] || null;
        let alFirstName = '';
        if (alternateAppelation !== null) {
          let parsed = JSON.parse(alternateAppelation);
          alFirstName = parsed.firstName;
          if (fname.trim().toLowerCase() === alFirstName.trim().toLowerCase()) {
            return true;
          }
        }
        return false;
      });
      let consoleOut = newPerson;
      if (typeof consoleOut === 'undefined') {
        consoleOut = `${fname.trim()} ${lname.trim()}`;
      }
      console.log(ck, consoleOut);
      if (typeof newPerson !== 'undefined') {
        existingPersonRow += `,${newPerson._id}`;
        newCsv.push(existingPersonRow);
      } else {
        missingCsv.push(existingPersonRow);
      }
    }
  }
  const csvDuplicatesPath = `${archivePath}documents/hamell-correction/manual-entries-duplicates.csv`;
  let headers =
    '"Surname","First Name","Diocese","Entered","Ordained","Class","Address","Alternate Surname","Alternate First Name","Comment","DB ID"';
  newCsv.unshift(headers);
  let csvText = newCsv.join('\n');
  await new Promise((resolve, reject) => {
    fs.writeFile(csvDuplicatesPath, '\ufeff' + csvText, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  const missingCsvPath = `${archivePath}documents/hamell-correction/manual-entries-missing.csv`;
  let missingCsvHeaders =
    '"Surname","First Name","Diocese","Entered","Ordained","Class","Address","Alternate Surname","Alternate First Name","Comment"';
  missingCsv.unshift(missingCsvHeaders);
  let missingCsvText = missingCsv.join('\n');
  await new Promise((resolve, reject) => {
    fs.writeFile(
      missingCsvPath,
      '\ufeff' + missingCsvText,
      'utf8',
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      }
    );
  });
  session.close();
  console.log('--- completed ---');
  // stop executing
  process.exit();
};

const identifyDuplicatesAutomatic = async () => {
  const classesCsv = `${archivePath}documents/hamell-correction/automatic-entries-classes.csv`;
  var classesData = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(classesCsv)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  let classes = [];
  for (let c in classesData) {
    let row = classesData[c];
    let rowKeys = Object.keys(row);
    let newKey = row[rowKeys[0]].trim();
    let newValue = row[rowKeys[1]];
    let newAltValue = row[rowKeys[2]] || '';
    if (newValue !== '') {
      classes.push({
        key: newKey,
        value: newValue.trim(),
        altValue: newAltValue,
      });
    }
  }
  const csvPath = `${archivePath}documents/hamell-correction/automatic-entries.csv`;
  const session = driver.session();

  // load c1
  var csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  csv.splice(0, 1);
  let newCsv = [];
  let missingCsv = [];
  // loop over c1
  for (let ck in csv) {
    if (DEBUG) {
      if (Number(ck) < 6) {
        continue;
      }
      if (Number(ck) > 6) {
        break;
      }
    }

    let row = csv[ck];
    let rowKeys = Object.keys(row);
    let fname = row[rowKeys[1]].trim();
    let lname = row[rowKeys[0]].trim();
    let diocese = row[rowKeys[2]].trim();
    let entered = row[rowKeys[3]].trim();
    let ordained = row[rowKeys[4]].trim();
    let personClass = row[rowKeys[5]].trim();
    let address = row[rowKeys[6]].trim();
    let alLName = row[rowKeys[7]].trim();
    let alFName = row[rowKeys[8]].trim();
    let comment = row[rowKeys[9]].trim();
    let existingPersonRow = `"${lname}","${fname}","${diocese}","${entered}","${ordained}","${personClass}","${address}","${alLName}","${alFName}","${comment}"`;

    let qpAttributes = '';
    if (fname !== '') {
      qpAttributes = `toLower(n.firstName)=~toLower(".*${helpers.addslashes(
        fname
      )}.*")`;
      if (lname !== '') {
        qpAttributes += ' AND ';
      }
    }
    if (lname !== '') {
      qpAttributes += `toLower(n.lastName)=~toLower(".*${helpers.addslashes(
        lname
      )}.*")`;
    }

    let dioceseQuery = '';
    if (diocese !== '') {
      let dioceseQueryTerm = diocese;
      if (diocese === 'Down and Connor') {
        dioceseQueryTerm = 'Down';
      }
      if (diocese === 'Cork and Ross') {
        dioceseQueryTerm = 'Cork';
      }
      dioceseQuery = '-[r:hasAffiliation]-(t:Organisation)';
      if (diocese !== dioceseQueryTerm) {
        qpAttributes += `AND (toLower(t.label)=~toLower(".*${helpers.addslashes(
          dioceseQueryTerm
        )}.*") OR toLower(t.label)=~toLower(".*${helpers.addslashes(
          diocese
        )}.*"))`;
      } else {
        qpAttributes += `AND toLower(t.label)=~toLower(".*${helpers.addslashes(
          dioceseQueryTerm
        )}.*")`;
      }
    }
    if (qpAttributes !== '') {
      qpAttributes = `WHERE ${qpAttributes}`;
    }
    let queryPerson = `match (n:Person)${dioceseQuery} ${qpAttributes}`;
    queryPerson += ' return n';
    if (DEBUG) {
      console.log(queryPerson);
    }

    let queryPromise = await session
      .writeTransaction((tx) => tx.run(queryPerson, {}))
      .then((result) => {
        return result.records;
      });
    let people = helpers.normalizeRecordsOutput(queryPromise);
    let person = null;
    if (people.length === 1) {
      person = people[0];
    } else {
      if (DEBUG) {
        console.log('alternatives', alLName, alFName);
      }
      if (alLName !== '' && alFName !== '') {
        people = people.filter((person) => {
          for (let ap in person.alternateAppelations) {
            let alternateAppelation = person.alternateAppelations[ap];
            let alFirstName = '';
            let alLastName = '';

            let parsed = JSON.parse(alternateAppelation);
            alFirstName = parsed.firstName;
            alLastName = parsed.lastName;

            if (
              alLName.trim().toLowerCase() ===
                alLastName.trim().toLowerCase() &&
              alFName.trim().toLowerCase() === alFirstName.trim().toLowerCase()
            ) {
              return true;
            }
          }
          return false;
        });
        if (people.length === 1) {
          person = people[0];
        } else {
          for (let i in people) {
            let p = people[i];
            if (personClass.trim() === '') {
              continue;
            }
            let findPersonClassQT = classes.find(
              (c) => c.key === personClass.trim()
            );
            if (typeof findPersonClassQT === 'undefined') {
              console.log(`${personClass.trim()}`);
              continue;
            }
            let personClassQT = findPersonClassQT.altValue;
            if (personClassQT === '') {
              personClassQT = findPersonClassQT.value;
            }
            if (typeof personClassQT === 'undefined') {
              continue;
            }
            let eventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE n.label="Matriculation into ${personClassQT}" AND id(t)=${p._id} RETURN n`;
            if (DEBUG) {
              console.log('\n');
              console.log(personClass.trim());
              console.log(personClassQT);
              console.log(eventQuery);
              console.log('\n');
            }
            let eventPromise = await session
              .writeTransaction((tx) => tx.run(eventQuery, {}))
              .then((result) => {
                let records = result.records;
                if (records.length > 0) {
                  let record = records[0];
                  let newEvent = record.toObject().n;
                  newEvent = helpers.outputRecord(newEvent);
                  return newEvent;
                }
                return null;
              });
            if (eventPromise === null) {
              continue;
            } else {
              person = p;
            }
          }
        }
      } else {
        people = people.filter((person) => {
          if (
            typeof person.alternateAppelations === 'undefined' ||
            person.alternateAppelations.length === 0
          ) {
            return true;
          }
          return false;
        });
        if (people.length === 1) {
          person = people[0];
        } else {
          for (let i in people) {
            let p = people[i];
            if (personClass.trim() === '') {
              continue;
            }
            let findPersonClassQT = classes.find(
              (c) => c.key === personClass.trim()
            );
            if (typeof findPersonClassQT === 'undefined') {
              console.log(`${personClass.trim()}`);
              continue;
            }
            let personClassQT = findPersonClassQT.altValue;
            if (personClassQT === '') {
              personClassQT = findPersonClassQT.value;
            }
            if (typeof personClassQT === 'undefined') {
              continue;
            }
            let eventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE n.label="Matriculation into ${personClassQT}" AND id(t)=${p._id} RETURN n`;
            if (DEBUG) {
              console.log('\n');
              console.log(personClass.trim());
              console.log(personClassQT);
              console.log(eventQuery);
              console.log('\n');
            }
            let eventPromise = await session
              .writeTransaction((tx) => tx.run(eventQuery, {}))
              .then((result) => {
                let records = result.records;
                if (records.length > 0) {
                  let record = records[0];
                  let newEvent = record.toObject().n;
                  newEvent = helpers.outputRecord(newEvent);
                  return newEvent;
                }
                return null;
              });
            if (eventPromise === null) {
              continue;
            } else {
              person = p;
            }
          }
        }
      }
    }
    if (person !== null) {
      existingPersonRow += `,${person._id}`;
      newCsv.push(existingPersonRow);
    } else {
      // load people by last name and check the altername first name
      let queryAlPerson = `match (n:Person) WHERE toLower(n.lastName)=toLower("${helpers.addslashes(
        lname
      )}") return n`;
      await session
        .writeTransaction((tx) => tx.run(queryAlPerson, {}))
        .then((result) => {
          return result.records;
        });
      let people = helpers.normalizeRecordsOutput(queryPromise);
      let newPerson = people.find((person) => {
        let alternateAppelation = person.alternateAppelations[0] || null;
        let alFirstName = '';
        if (alternateAppelation !== null) {
          let parsed = JSON.parse(person.alternateAppelations[0]);
          alFirstName = parsed.firstName;
          if (fname.trim().toLowerCase() === alFirstName.trim().toLowerCase()) {
            return true;
          }
        }
        return false;
      });
      let consoleOut = newPerson;
      if (typeof consoleOut === 'undefined') {
        consoleOut = `${fname.trim()} ${lname.trim()}`;
      }
      console.log(ck, consoleOut);
      if (typeof newPerson !== 'undefined') {
        existingPersonRow += `,${newPerson._id}`;
        newCsv.push(existingPersonRow);
      } else {
        missingCsv.push(existingPersonRow);
      }
    }
  }
  const csvDuplicatesPath = `${archivePath}documents/hamell-correction/automatic-entries-duplicates.csv`;
  let headers =
    '"Surname","First Name","Diocese","Entered","Ordained","Class","Address","Alternate Surname","Alternate First Name","Comment","DB ID"';
  newCsv.unshift(headers);
  let csvText = newCsv.join('\n');
  await new Promise((resolve, reject) => {
    fs.writeFile(csvDuplicatesPath, '\ufeff' + csvText, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  const missingCsvPath = `${archivePath}documents/hamell-correction/automatic-entries-missing.csv`;
  let missingCsvHeaders =
    '"Surname","First Name","Diocese","Entered","Ordained","Class","Address","Alternate Surname","Alternate First Name","Comment"';
  missingCsv.unshift(missingCsvHeaders);
  let missingCsvText = missingCsv.join('\n');
  await new Promise((resolve, reject) => {
    fs.writeFile(
      missingCsvPath,
      '\ufeff' + missingCsvText,
      'utf8',
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      }
    );
  });
  session.close();
  console.log('--- completed ---');
  // stop executing
  process.exit();
};

const fixAutomaticEntries = async () => {
  const session = driver.session();
  // 1. load classes
  const classesCsv = `${archivePath}documents/hamell-correction/automatic-entries-classes.csv`;
  var classesData = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(classesCsv)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });

  let classes = [];
  for (let c in classesData) {
    let row = classesData[c];
    let rowKeys = Object.keys(row);
    let newKey = row[rowKeys[0]].trim();
    let newValue = row[rowKeys[1]];
    let newAltValue = row[rowKeys[2]] || '';
    if (newValue !== '') {
      classes.push({
        key: newKey,
        value: newValue.trim(),
        altValue: newAltValue,
      });
    }
  }

  // 2. load db matriculation classes
  let mct = new Taxonomy({ systemType: 'matriculationClass' });
  await mct.load();
  let mctq = `MATCH (t:Taxonomy) WHERE id(t)=${mct._id} MATCH (n:TaxonomyTerm)-[r:isChildOf]->(t) RETURN n ORDER BY n.label`;
  let mctPromise = await session
    .writeTransaction((tx) => tx.run(mctq, {}))
    .then((result) => {
      return result.records;
    });
  let matriculationClasses = helpers.normalizeRecordsOutput(mctPromise, 'n');

  // 4. load people from csv
  const csvPath = `${archivePath}documents/hamell-correction/automatic-entries-dbids.csv`;
  var csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  csv.splice(0, 1);

  let noEventMatch = [];
  for (let ck in csv) {
    let row = csv[ck];
    let rowKeys = Object.keys(row);
    let fname = row[rowKeys[1]].trim();
    let lname = row[rowKeys[0]].trim();
    let diocese = row[rowKeys[2]].trim();
    let entered = row[rowKeys[3]].trim();
    let ordained = row[rowKeys[4]].trim();
    let personClass = row[rowKeys[5]].trim();
    let address = row[rowKeys[6]].trim();
    let alLName = row[rowKeys[7]].trim();
    let alFName = row[rowKeys[8]].trim();
    let comment = row[rowKeys[9]].trim();
    let dbId = row[rowKeys[10]].trim();

    // skip rows that haven't been associated with the db
    // and don't have a matriculation event
    if (dbId === '' || personClass === '') {
      continue;
    }
    // 3.1 load person's matriculation event
    let findPersonClassQT = classes.find((c) => c.key === personClass);
    if (typeof findPersonClassQT === 'undefined') {
      continue;
    }
    let personClassQK = findPersonClassQT.key;
    let personClassQK2 = null;
    let personClassQK3 = null;
    if (personClassQK.includes('1') && !personClassQK.includes('1st')) {
      personClassQK2 = personClassQK.replace('1', '1st');
    }
    if (personClassQK.includes('2') && !personClassQK.includes('2nd')) {
      personClassQK2 = personClassQK.replace('2', '2nd');
    }
    if (personClassQK.includes('3') && !personClassQK.includes('3rd')) {
      personClassQK3 = personClassQK.replace('3', '3rd');
    }
    let personClassQT = findPersonClassQT.altValue;
    if (personClassQT === '') {
      personClassQT = findPersonClassQT.value;
    }
    let matchLabel = `n.label="Matriculation into ${personClassQT}" OR n.label="Matriculation into ${personClassQK}"`;
    if (personClassQK2 !== null) {
      matchLabel += ` OR n.label="Matriculation into ${personClassQK2}"`;
    }
    if (personClassQK3 !== null) {
      matchLabel += ` OR n.label="Matriculation into ${personClassQK3}"`;
    }
    let eventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE (${matchLabel}) AND id(t)=${dbId} RETURN n`;
    let newEvent = await session
      .writeTransaction((tx) => tx.run(eventQuery, {}))
      .then((result) => {
        let records = result.records;
        if (records.length > 0) {
          let record = records[0];
          let newEvent = record.toObject().n;
          newEvent = helpers.outputRecord(newEvent);
          return newEvent;
        }
        return null;
      });
    // if we cannot locate the new event then we add this entry to a new list to manually check at a later point and skip the row
    if (newEvent === null) {
      // if no db match check if original event exists and set matriculation class role
      let matClass = matriculationClasses.find(
        (m) => m.label === findPersonClassQT.value
      );

      let newLabel = `Matriculation into ${matClass.label}`;
      let meq = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE n.label="${newLabel}" AND id(t)=${dbId} SET r.role="${matClass._id}" RETURN n`;
      let existingEvent = await session
        .writeTransaction((tx) => tx.run(meq, {}))
        .then((result) => {
          let records = result.records;
          let output = {
            error: ['The record cannot be updated'],
            status: false,
            data: [],
          };
          if (records.length > 0) {
            let record = records[0];
            let key = record.keys[0];
            let resultRecord = record.toObject()[key];
            resultRecord = helpers.outputRecord(resultRecord);
            return resultRecord;
          }
          return output;
        });
      if (existingEvent === null) {
        noEventMatch.push(
          `"${lname}","${fname}","${diocese}","${entered}","${ordained}","${personClass}","${address}","${alLName}","${alFName}","${comment}","${dbId}"`
        );
      }
      continue;
    }

    // 3.2 match matriculation class with db matriculation class
    let matClass = matriculationClasses.find(
      (m) => m.label === findPersonClassQT.value
    );
    let newLabel = `Matriculation into ${matClass.label}`;

    // 3.3 update event label and relationship role
    let updateEventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE (${matchLabel}) AND id(t)=${dbId} SET n.label="${newLabel}", r.role="${matClass._id}" RETURN n`;
    await session
      .writeTransaction((tx) => tx.run(updateEventQuery, {}))
      .then((result) => {
        return result;
      });
    console.log(`${dbId} success`);
  }
  const noEventMatchPath = `${archivePath}documents/hamell-correction/automatic-entries-no-event-match.csv`;
  let headers =
    '"Surname","First Name","Diocese","Entered","Ordained","Class","Address","Alternate Surname","Alternate First Name","Comment","DB ID"';
  noEventMatch.unshift(headers);
  let csvText = noEventMatch.join('\n');
  await new Promise((resolve, reject) => {
    fs.writeFile(noEventMatchPath, '\ufeff' + csvText, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  session.close();
  // stop executing
  process.exit();
};

const fixManualEntries = async () => {
  const session = driver.session();
  const classesCsv = `${archivePath}documents/hamell-correction/manual-entries-classes.csv`;
  var classesData = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(classesCsv)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });

  let classes = [];
  for (let c in classesData) {
    let row = classesData[c];
    let rowKeys = Object.keys(row);
    let newKey = row[rowKeys[0]].trim();
    let newValue = row[rowKeys[1]];
    let newAltValue = row[rowKeys[2]] || '';
    if (newValue !== '') {
      classes.push({
        key: newKey,
        value: newValue.trim(),
        altValue: newAltValue,
      });
    }
  }

  // 2. load db matriculation classes
  let mct = new Taxonomy({ systemType: 'matriculationClass' });
  await mct.load();
  let mctq = `MATCH (t:Taxonomy) WHERE id(t)=${mct._id} MATCH (n:TaxonomyTerm)-[r:isChildOf]->(t) RETURN n ORDER BY n.label`;
  let mctPromise = await session
    .writeTransaction((tx) => tx.run(mctq, {}))
    .then((result) => {
      return result.records;
    });
  let matriculationClasses = helpers.normalizeRecordsOutput(mctPromise, 'n');

  // 4. load people from csv
  const csvPath = `${archivePath}documents/hamell-correction/manual-entries-dbids.csv`;
  var csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  csv.splice(0, 1);
  let noEventMatch = [];
  for (let ck in csv) {
    let row = csv[ck];
    let rowKeys = Object.keys(row);
    let fname = row[rowKeys[1]].trim();
    let lname = row[rowKeys[0]].trim();
    let diocese = row[rowKeys[2]].trim();
    let entered = row[rowKeys[3]].trim();
    let ordained = row[rowKeys[4]].trim();
    let personClass = row[rowKeys[5]].trim();
    let address = row[rowKeys[6]].trim();
    let alLName = row[rowKeys[7]].trim();
    let alFName = row[rowKeys[8]].trim();
    let comment = row[rowKeys[9]].trim();
    let dbId = row[rowKeys[10]].trim();

    // skip rows that haven't been associated with the db
    // and don't have a matriculation event
    if (dbId === '' || personClass === '') {
      continue;
    }
    // 3.1 load person's matriculation event
    let findPersonClassQT = classes.find((c) => c.key === personClass);
    if (typeof findPersonClassQT === 'undefined') {
      continue;
    }
    let personClassQK = findPersonClassQT.key;
    let personClassQK2 = null;
    let personClassQK3 = null;
    if (personClassQK.includes('1') && !personClassQK.includes('1st')) {
      personClassQK2 = personClassQK.replace('1', '1st');
    }
    if (personClassQK.includes('2') && !personClassQK.includes('2nd')) {
      personClassQK2 = personClassQK.replace('2', '2nd');
    }
    if (personClassQK.includes('3') && !personClassQK.includes('3rd')) {
      personClassQK3 = personClassQK.replace('3', '3rd');
    }
    let personClassQT = findPersonClassQT.altValue;
    if (personClassQT === '') {
      personClassQT = findPersonClassQT.value;
    }
    let matchLabel = `n.label="Matriculation into ${personClassQT}" OR n.label="Matriculation into ${personClassQK}"`;
    if (personClassQK2 !== null) {
      matchLabel += ` OR n.label="Matriculation into ${personClassQK2}"`;
    }
    if (personClassQK3 !== null) {
      matchLabel += ` OR n.label="Matriculation into ${personClassQK3}"`;
    }
    let eventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE (${matchLabel}) AND id(t)=${dbId} RETURN n`;
    let newEvent = await session
      .writeTransaction((tx) => tx.run(eventQuery, {}))
      .then((result) => {
        let records = result.records;
        if (records.length > 0) {
          let record = records[0];
          let newEvent = record.toObject().n;
          newEvent = helpers.outputRecord(newEvent);
          return newEvent;
        }
        return null;
      });
    // if we cannot locate the new event then we add this entry to a new list to manually check at a later point and skip the row
    if (newEvent === null) {
      // if no db match check if original event exists and set matriculation class role
      let matClass = matriculationClasses.find(
        (m) => m.label === findPersonClassQT.value
      );

      let newLabel = `Matriculation into ${matClass.label}`;
      let meq = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE n.label="${newLabel}" AND id(t)=${dbId} SET r.role="${matClass._id}" RETURN n`;
      let existingEvent = await session
        .writeTransaction((tx) => tx.run(meq, {}))
        .then((result) => {
          let records = result.records;
          if (records.length > 0) {
            let record = records[0];
            let key = record.keys[0];
            let resultRecord = record.toObject()[key];
            resultRecord = helpers.outputRecord(resultRecord);
            return resultRecord;
          }
          return null;
        });
      if (existingEvent === null) {
        noEventMatch.push(
          `"${lname}","${fname}","${diocese}","${entered}","${ordained}","${personClass}","${address}","${alLName}","${alFName}","${comment}","${dbId}"`
        );
      }
      continue;
    }

    // 3.2 match matriculation class with db matriculation class
    let matClass = matriculationClasses.find(
      (m) => m.label === findPersonClassQT.value
    );
    let newLabel = `Matriculation into ${matClass.label}`;

    // 3.3 update event label and relationship role
    let updateEventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE (${matchLabel}) AND id(t)=${dbId} SET n.label="${newLabel}", r.role="${matClass._id}" RETURN n`;
    await session.writeTransaction((tx) => tx.run(updateEventQuery, {}));

    console.log(`${dbId} success`);
  }
  const noEventMatchPath = `${archivePath}documents/hamell-correction/manual-entries-no-event-match.csv`;
  let headers =
    '"Surname","First Name","Diocese","Entered","Ordained","Class","Address","Alternate Surname","Alternate First Name","Comment","DB ID"';
  noEventMatch.unshift(headers);
  let csvText = noEventMatch.join('\n');
  await new Promise((resolve, reject) => {
    fs.writeFile(noEventMatchPath, '\ufeff' + csvText, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  session.close();
  // stop executing
  process.exit();
};

const relateMatOrdMay = async () => {
  const session = driver.session();
  // load spcm organisation
  let orgQuery =
    'MATCH (n:Organisation {label:"Saint Patrick\'s College Maynooth (SPCM)"}) RETURN n';
  let organisation = await session
    .writeTransaction((tx) => tx.run(orgQuery, {}))
    .then((result) => {
      let records = result.records;
      if (records.length > 0) {
        let record = records[0];
        let orgRecord = record.toObject().n;
        let org = helpers.outputRecord(orgRecord);
        return org;
      }
      return null;
    })
    .catch((error) => {
      console.log(error);
    });

  // load people
  let query =
    'MATCH (n:Person)-[r]->(e:Event) WHERE e.eventType="529" OR e.eventType="12035" return distinct n';
  let transaction = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  let people = helpers.normalizeRecordsOutput(transaction);
  session.close();

  for (let i = 0; i < people.length; i++) {
    let person = people[i];
    let newRef = {
      items: [
        { _id: person._id, type: 'Person', role: '' },
        { _id: organisation._id, type: 'Organisation', role: '' },
      ],
      taxonomyTermLabel: 'wasStudentOf',
    };
    await updateReference(newRef);
  }

  console.log('Update complete');
  // stop executing
  process.exit();
};

const relateHamell2 = async () => {
  const session = driver.session();

  // load classpieces
  let classpieceSystemType = new TaxonomyTerm({ labelId: 'Classpiece' });
  await classpieceSystemType.load();

  let classpiecesQuery = `MATCH (n:Resource {status:'public', systemType:'${classpieceSystemType._id}'}) RETURN distinct n ORDER BY n.label`;
  let classpiecesPromise = await session
    .writeTransaction((tx) => tx.run(classpiecesQuery, {}))
    .then((result) => {
      return result.records;
    });
  let classpieces = helpers.normalizeRecordsOutput(classpiecesPromise, 'n');
  let classpiecesPeople = [];
  for (let c = 0; c < classpieces.length; c++) {
    let cp = classpieces[c];
    if (!isNaN(Number(cp.label)) && Number(cp.label) > 2002) {
      let newPeopleRef = await helpers.loadRelations(
        cp._id,
        'Resource',
        'Person',
        true,
        'depicts'
      );
      for (let i = 0; i < newPeopleRef.length; i++) {
        let p = newPeopleRef[i];
        classpiecesPeople.push(p.ref._id);
      }
    }
  }
  // load spcm organisation
  let hamellQuery = 'MATCH (n:Resource {label:"Hamell 2"}) RETURN n';
  let hamell2 = await session
    .writeTransaction((tx) => tx.run(hamellQuery, {}))
    .then((result) => {
      let records = result.records;
      if (records.length > 0) {
        let record = records[0];
        let orgRecord = record.toObject().n;
        let org = helpers.outputRecord(orgRecord);
        return org;
      }
      return null;
    })
    .catch((error) => {
      console.log(error);
    });
  if (hamell2 === null) {
    console.log('Hamell 2 not found.');
    // stop executing
    process.exit();
    return false;
  }
  // load people
  let query =
    'MATCH (n:Person) WHERE date(datetime({epochmillis: apoc.date.parse(n.createdAt,"ms","yyyy-MM-dd")}))<date(datetime({epochmillis: apoc.date.parse("2020-10-15","ms","yyyy-MM-dd")})) return distinct n';
  let transaction = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  let people = helpers.normalizeRecordsOutput(transaction);
  session.close();

  for (let i = 0; i < people.length; i++) {
    let person = people[i];
    if (classpiecesPeople.indexOf(person._id) > -1) {
      console.log(person._id);
      continue;
    } else {
      let newRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: hamell2._id, type: 'Resource', role: '' },
        ],
        taxonomyTermLabel: 'isReferencedIn',
      };
      await updateReference(newRef);
    }
  }

  console.log('Update complete');
  // stop executing
  process.exit();
};

const extractLocations = async () => {
  const path = `${archivePath}documents/1704/1704-master.csv`;
  var csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(path)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  let newCsv = [];
  for (let rowKey in csv) {
    let row = csv[rowKey];
    let placeName = row['Place of ordination'].trim();
    if (placeName !== '' && newCsv.indexOf(`"${placeName}"`) === -1) {
      newCsv.push(`"${placeName}"`);
    }
  }
  newCsv.sort();
  let csvPath = `${archivePath}documents/1704/locations.csv`;
  let csvText = newCsv.join('\n');
  let writeFile = await new Promise((resolve, reject) => {
    fs.writeFile(csvPath, csvText, 'utf8', function (err) {
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
  // stop executing
  process.exit();
};

const extractLaySureties = async () => {
  const path = `${archivePath}documents/1704/1704-master.csv`;
  var csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(path)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  let newCsv = [];
  for (let rowKey in csv) {
    let row = csv[rowKey];
    let ls = row['Lay sureties'].trim();
    if (ls !== '') {
      let lss = ls.split(';');
      for (let key in lss) {
        let newLss = lss[key].trim();
        newCsv.push({ name: `"${newLss}"`, row: Number(rowKey) });
      }
    }
  }
  let newCsv2 = [];
  for (let i = 0; i < newCsv.length; i++) {
    let item = newCsv[i];
    let rows = [];
    let count =
      newCsv.filter((r) => {
        if (r.name === item.name) {
          rows.push(Number(r.row) + 1);
          return true;
        }
        return false;
      }).length || 0;
    let newItem = {
      name: item.name,
      row: item.row,
      count: count,
      rows: rows.join('|'),
    };
    let exists = newCsv2.find((i) => i.name === item.name) || false;
    if (!exists) {
      newCsv2.push(newItem);
    }
  }
  let csvPath = `${archivePath}documents/1704/lay-sureties.csv`;
  let csvText = 'Name,Count,Rows\n';
  for (let key in newCsv2) {
    let r = newCsv2[key];
    let text = `${r.name},${r.count},${r.rows}\n`;
    csvText += text;
  }
  let writeFile = await new Promise((resolve, reject) => {
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
  // stop executing
  process.exit();
};

const exportDioceses = async () => {
  const session = driver.session();
  let query =
    'MATCH (n:Organisation {organisationType:"Diocese"}) RETURN id(n) as _id, n.label as label ORDER BY n.label';
  let records = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then(async (result) => {
      let output = [];
      for (let i = 0; i < result.records.length; i++) {
        let r = result.records[i];
        let dbObject = r.toObject();
        let _id = dbObject['_id'];
        let label = dbObject['label'];
        let episcopalSeeIn = await helpers.loadRelations(
          _id,
          'Organisation',
          'Spatial',
          false,
          'hasItsEpiscopalSeeIn'
        );
        let episcopalSee = [];
        for (let key in episcopalSeeIn) {
          let ref = episcopalSeeIn[key].ref;
          episcopalSee.push(`${ref.label}`);
        }
        let episcopalSeeLabel = '';
        if (episcopalSee.length > 0) {
          episcopalSeeLabel = `, ${episcopalSee.join('; ')}`;
        }
        let newOutput = `"${label}"${episcopalSeeLabel}`;
        output.push(newOutput);
      }
      return output;
    });
  let csvPath = `${archivePath}documents/1704/dioceses.csv`;
  let csvText = records.join('\n');
  console.log(csvText);
  let writeFile = await new Promise((resolve, reject) => {
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
  // stop executing
  process.exit();
};

const exportParishes = async () => {
  const masterPath = `${archivePath}documents/1704/1704-master.csv`;
  const diocesesPath = `${archivePath}documents/1704/dioceses.csv`;
  var masterCsv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(masterPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  var diocesesCsv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(diocesesPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  // 1. load dioceses in memory
  let diocesesIndex = [];
  let dioceses = [];
  for (let key in diocesesCsv) {
    let row = diocesesCsv[key];
    let label = row['0'];
    let episcopalSeeIn = row['1'] || '';
    if (diocesesIndex.indexOf(label) === -1) {
      dioceses.push({ label: label, episcopalSeeIn: episcopalSeeIn });
      diocesesIndex.push(label);
    }
  }
  // 2. extract parish from master
  let parishesIndex = [];
  let parishes = [];
  let masterRowKeys = Object.keys(masterCsv[0]);
  for (let rowKey in masterCsv) {
    let row = masterCsv[rowKey];
    let parishCell = row[masterRowKeys[10]];
    let parishAltCell = row[masterRowKeys[11]];
    let diocese = row[masterRowKeys[12]].trim();
    let matchDiocese = dioceses.find((d) => d.label === diocese) || null;
    let newParishes = parishCell.split(';');
    let newParishAlts = parishAltCell.split(';');
    for (let pkey in newParishes) {
      let newParish = newParishes[pkey].trim();
      let newParishAlt = newParishAlts[pkey] || '';
      newParishAlt = newParishAlt.trim();
      newParishAlt = newParishAlt.replace('#', '');
      let dioceseLabel = matchDiocese?.label || '';
      let dioceseEpiscopalSeeIn = matchDiocese?.episcopalSeeIn || '';
      if (newParish !== '' && parishesIndex.indexOf(newParish) === -1) {
        parishes.push({
          label: `"${newParish}"`,
          alt: `"${newParishAlt}"`,
          diocese: `"${dioceseLabel}"`,
          episcopalSeeIn: `"${dioceseEpiscopalSeeIn}"`,
        });
        parishesIndex.push(newParish);
      }
    }
  }
  parishes.sort((a, b) => (a.label > b.label ? 1 : -1));
  let parishText = [];
  for (let k in parishes) {
    let p = parishes[k];
    parishText.push(`${p.label},${p.alt},${p.diocese},${p.episcopalSeeIn}`);
  }
  let csvPath = `${archivePath}documents/1704/parishes.csv`;
  let csvText = parishText.join('\n');
  console.log(csvText);
  let writeFile = await new Promise((resolve, reject) => {
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
  // stop executing
  process.exit();
};

const ingesticp = async () => {
  const userId = await getAdminId();
  const session = driver.session();

  let iLocations = [];
  let ipath = `${archivePath}documents/icp/i.csv`;
  let icsv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(ipath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  for (let key in icsv) {
    let row = icsv[key];
    iLocations.push({
      name: row['﻿Location name'].trim(),
      nameUpdated: row['Name updated'].trim(),
      type: row['Organisation type'].trim(),
    });
  }

  let eLocations = [];
  let ePath = `${archivePath}documents/icp/locations.csv`;
  var eCsv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(ePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  let ekeys = Object.keys(eCsv['0']);
  for (let key in eCsv) {
    let row = eCsv[key];
    if (row[ekeys[0]] !== '') {
      eLocations.push({
        name: row[ekeys[0]].trim(),
        nameUpdated: row[ekeys[1]].trim(),
      });
    }
  }

  const mcTaxonomy = new Taxonomy({ systemType: 'matriculationClass' });
  await mcTaxonomy.load();

  const matriculationClassDB = async (mc, userId) => {
    let newMC = null;
    let searchQuery = `MATCH (n:TaxonomyTerm {label:"${mc}"}) RETURN n`;
    newMC = await session
      .writeTransaction((tx) => tx.run(searchQuery, {}))
      .then((result) => {
        let records = result.records;
        if (records.length > 0) {
          let record = records[0];
          let key = record.keys[0];
          let output = record.toObject()[key];
          output = helpers.outputRecord(output);
          return output;
        } else {
          return null;
        }
      });
    if (newMC === null) {
      let newMCData = {
        label: mc,
        inverseLabel: mc,
      };
      let newMCTerm = new TaxonomyTerm(newMCData);
      let newMCSave = await newMCTerm.save(userId);
      newMC = newMCSave.data;
      let newRef = {
        items: [
          { _id: newMC._id, type: 'TaxonomyTerm', role: '' },
          { _id: mcTaxonomy._id, type: 'Taxonomy', role: '' },
        ],
        taxonomyTermLabel: 'isChildOf',
      };
      await updateReference(newRef);
    }
    return newMC;
  };

  let matriculationClasses = [];
  let vpath = `${archivePath}documents/icp/v.csv`;
  let vcsv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(vpath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  let vkeys = Object.keys(vcsv['0']);
  for (let key in vcsv) {
    let row = vcsv[key];
    // check if matriculation class is in the db or add it
    let mc = await matriculationClassDB(row[vkeys['1']].trim(), userId);
    matriculationClasses.push({
      name: row[vkeys['0']].trim(),
      nameUpdated: row[vkeys['1']].trim(),
      _id: mc._id,
    });
  }
  const normaliseDate = (date) => {
    date = date.replace(/ /g, '');
    let startDate = '';
    let endDate = null;
    if (date === '') {
      return date;
    }
    if (!date.includes('-')) {
      if (date.includes('?')) {
        let count = date.match(/\?/g).length || [].length;
        let year = date.replace(/\?/g, '');
        if (count === 1) {
          startDate = `01-01-${year}0`;
          endDate = `31-12-${year}9`;
        } else if (count === 2) {
          startDate = `01-01-${year}00`;
          endDate = `31-12-${year}99`;
        }
      } else {
        startDate = `01-01-${date}`;
        endDate = `31-12-${date}`;
      }
    } else {
      let parts = date.split('-');
      let d = parts[2];
      let m = parts[1];
      let y = parts[0];
      if (typeof m === 'undefined' || m === '??') {
        startDate = `1-1-${y}`;
        endDate = `31-12-${date}`;
      } else if (typeof d === 'undefined' || d === '??') {
        startDate = `1-${m}-${y}`;
        let lastDay = getDaysInMonth(m, y);
        endDate = `${lastDay}-${m}-${y}`;
      } else {
        startDate = `${d}-${m}-${y}`;
      }
    }
    let output = {
      startDate: startDate,
      endDate: endDate,
    };
    return output;
  };

  const ingestPerson = async (
    firstName = '',
    middleName = '',
    lastName = '',
    dbID = '',
    rowNum,
    total
  ) => {
    let person = {};
    // insert person
    if (dbID === '') {
      let fnameSoundex = helpers.soundex(firstName);
      let lnameSoundex = helpers.soundex(lastName);
      let personData = {
        status: 'private',
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        fnameSoundex: fnameSoundex,
        lnameSoundex: lnameSoundex,
        personType: 'Clergy',
      };
      let newPerson = new Person(personData);
      let personSave = await newPerson.save(userId);
      person = personSave.data;
    }
    // update person
    else {
      let personData = { _id: dbID };
      person = new Person(personData);
      await person.load();
    }
    let percentage = (rowNum / total) * 100;
    let perc = percentage.toFixed(2);
    console.log(person._id, dbID, person.label, `${perc}%`);
    return person;
  };

  const addArchivalReference = async (archivalReferenceId, person) => {
    let archivalReferenceIds = archivalReferenceId.split(';');
    for (let key in archivalReferenceIds) {
      let archivalReferenceId = archivalReferenceIds[key];
      archivalReferenceId = archivalReferenceId.replace('[ICPA] ', '').trim();
      let query = `match (n:Resource) WHERE toLower(n.label) =~ toLower('.*${archivalReferenceId}.*') return n`;
      if (archivalReferenceId === 'MS A2.d1') {
        query =
          "match (n:Resource) WHERE toLower(n.label) =~ toLower('.*MS A2.d1.*')  and not toLower(n.label) =~ toLower('.*MS A2.d15.*') return n";
      }
      let resource = await session
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
      if (resource !== null) {
        let reference = {
          items: [
            { _id: person._id, type: 'Person' },
            { _id: resource._id, type: 'Resource' },
          ],
          taxonomyTermLabel: 'isReferencedIn',
        };
        await updateReference(reference);
      }
    }
    return true;
  };

  const addNewEvent = async (label, type, userId, description = null) => {
    let session = driver.session();
    let now = new Date().toISOString();
    let eventData = {
      label: label,
      eventType: type,
      status: 'private',
      createdBy: userId,
      createdAt: now,
      updatedBy: userId,
      updatedAt: now,
    };
    if (description !== '') {
      eventData.description = description;
    }
    let nodeProperties = helpers.prepareNodeProperties(eventData);
    let params = helpers.prepareParams(eventData);
    let query = `CREATE (n:Event ${nodeProperties}) RETURN n`;
    let item = await session
      .writeTransaction((tx) => tx.run(query, params))
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
    return item;
  };

  const addDate = async (startDate, endDate = null, userId) => {
    let queryEndDate = '';
    if (endDate !== null && endDate !== '') {
      queryEndDate = `AND n.endDate="${endDate}" `;
    }
    let query = `MATCH (n:Temporal) WHERE n.startDate="${startDate}" ${queryEndDate} RETURN n`;
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
      let now = new Date().toISOString();
      let label = startDate;
      if (endDate !== null) {
        label += ` - ${endDate}`;
      }
      let newItem = {
        label: label,
        startDate: startDate,
        endDate: endDate,
        createdBy: userId,
        createdAt: now,
        updatedBy: userId,
        updatedAt: now,
      };
      let nodeProperties = helpers.prepareNodeProperties(newItem);
      let params = helpers.prepareParams(newItem);
      let query = `CREATE (n:Temporal ${nodeProperties}) RETURN n`;
      temporal = await session
        .writeTransaction((tx) => tx.run(query, params))
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
    }
    return temporal;
  };

  const birthEventType = new TaxonomyTerm({ labelId: 'Birth' });
  await birthEventType.load();

  const addBirthEvent = async (dateOfBirth, birthEventType, person) => {
    let birthDate = await addDate(
      dateOfBirth.startDate,
      dateOfBirth.endDate,
      userId
    );

    let birthEvent = await addNewEvent('Born', birthEventType._id, userId);
    let birthReference = {
      items: [
        { _id: birthEvent._id, type: 'Event' },
        { _id: person._id, type: 'Person' },
      ],
      taxonomyTermLabel: 'wasStatusOf',
    };
    await updateReference(birthReference);
    let birthTemporalReference = {
      items: [
        { _id: birthEvent._id, type: 'Event' },
        { _id: birthDate._id, type: 'Temporal' },
      ],
      taxonomyTermLabel: 'hasTime',
    };
    await updateReference(birthTemporalReference);
    return true;
  };

  const addRelative = async ({
    firstName = '',
    lastName = '',
    maidenName = '',
    person = null,
    referenceTermLabel = '',
  }) => {
    if (firstName === '') {
      return null;
    }
    let relative = {};
    // insert person
    let fnameSoundex = helpers.soundex(firstName);
    let lnameSoundex = helpers.soundex(lastName);
    let relativeData = {
      status: 'private',
      firstName: firstName,
      lastName: lastName,
      fnameSoundex: fnameSoundex,
      lnameSoundex: lnameSoundex,
      personType: 'Laity',
    };
    if (maidenName !== '') {
      relativeData.alternateAppelations = [
        { firstName: firstName, lastName: maidenName },
      ];
    }
    let newRelative = new Person(relativeData);
    let relativeSave = await newRelative.save(userId);
    relative = relativeSave.data;
    let reference = {
      items: [
        { _id: person._id, type: 'Person' },
        { _id: relative._id, type: 'Person' },
      ],
      taxonomyTermLabel: referenceTermLabel,
    };
    await updateReference(reference);

    return relative;
  };

  const addLocation = async (location, diocese, person, userId) => {
    let escapeLocation = helpers.addslashes(location.name);
    if (location.nameUpdated !== '') {
      escapeLocation = helpers.addslashes(location.nameUpdated);
    }
    let session = driver.session();
    let query = `MATCH (n:Organisation) WHERE toLower(n.label)="${escapeLocation.toLowerCase()}" RETURN n`;
    let organisation = await session
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
    if (organisation === null) {
      let newOrganisation = {};
      let now = new Date().toISOString();
      newOrganisation.label = escapeLocation;
      newOrganisation.createdBy = userId;
      newOrganisation.createdAt = now;
      newOrganisation.updatedBy = userId;
      newOrganisation.updatedAt = now;
      newOrganisation.organisationType = location.type;
      newOrganisation.status = 'private';
      newOrganisation.labelSoundex = helpers.soundex(diocese);
      let nodeProperties = helpers.prepareNodeProperties(newOrganisation);
      let params = helpers.prepareParams(newOrganisation);
      let query = `CREATE (n:Organisation ${nodeProperties}) RETURN n`;
      organisation = await session
        .writeTransaction((tx) => tx.run(query, params))
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
    }
    let reference = {
      items: [
        { _id: person._id, type: 'Person' },
        { _id: organisation._id, type: 'Organisation' },
      ],
      taxonomyTermLabel: 'wasNativeOf',
    };
    await updateReference(reference);

    // add relation to location
    let escapeDiocese = helpers.addslashes(diocese);
    let queryDiocese = `MATCH (n:Organisation) WHERE toLower(n.label)="${escapeDiocese.toLowerCase()}" RETURN n`;
    let dioceseNode = await session
      .writeTransaction((tx) => tx.run(queryDiocese, {}))
      .then((result) => {
        let records = result.records;
        if (records.length > 0) {
          let record = records[0].toObject();
          let outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
      });
    let spatial = await helpers.loadRelations(
      dioceseNode._id,
      'Organisation',
      'Spatial'
    );

    if (spatial.length > 0) {
      for (let key in spatial) {
        let s = spatial[key];
        let locationReference = {
          items: [
            { _id: organisation._id, type: 'Organisation' },
            { _id: s.ref._id, type: 'Spatial' },
          ],
          taxonomyTermLabel: 'hasLocation',
        };
        await updateReference(locationReference);
      }
    }
    return organisation;
  };

  const addDioceseRef = async (diocese, person) => {
    let escapeDiocese = helpers.addslashes(diocese);
    let query = `MATCH (n:Organisation) WHERE toLower(n.label)="${escapeDiocese.toLowerCase()}" RETURN n`;
    let node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        let records = result.records;
        if (records.length > 0) {
          let record = records[0].toObject();
          let outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
        return null;
      });
    if (node !== null) {
      let reference = {
        items: [
          { _id: person._id, type: 'Person' },
          { _id: node._id, type: 'Organisation' },
        ],
        taxonomyTermLabel: 'hasAffiliation',
      };
      await updateReference(reference);
      return true;
    } else {
      console.log(diocese);
    }
    return false;
  };

  const baptismTaxonomyTerm = new TaxonomyTerm({ labelId: 'Baptism' });
  await baptismTaxonomyTerm.load();

  const addBaptisedEvent = async (baptisedDate, person, userId) => {
    let baptismDate = await addDate(
      baptisedDate.startDate,
      baptisedDate.endDate,
      userId
    );

    let baptismEvent = await addNewEvent(
      'Baptised',
      baptismTaxonomyTerm._id,
      userId
    );
    let baptismReference = {
      items: [
        { _id: baptismEvent._id, type: 'Event' },
        { _id: person._id, type: 'Person' },
      ],
      taxonomyTermLabel: 'wasStatusOf',
    };
    await updateReference(baptismReference);
    let baptismTemporalReference = {
      items: [
        { _id: baptismEvent._id, type: 'Event' },
        { _id: baptismDate._id, type: 'Temporal' },
      ],
      taxonomyTermLabel: 'hasTime',
    };
    await updateReference(baptismTemporalReference);
    return true;
  };

  const matriculationTaxonomyTerm = new TaxonomyTerm({
    labelId: 'matriculation',
  });
  await matriculationTaxonomyTerm.load();

  const icpSpatialQuery =
    'MATCH (n:Spatial {label:"Irish College Paris"}) RETURN n';
  let icpSpatialNode = await session
    .writeTransaction((tx) => tx.run(icpSpatialQuery, {}))
    .then((result) => {
      let records = result.records;
      if (records.length > 0) {
        let record = records[0].toObject();
        let outputRecord = helpers.outputRecord(record.n);
        return outputRecord;
      } else return {};
    })
    .catch((error) => {
      console.log(error);
    });

  const addMatriculationEvent = async (
    matriculationDate,
    matriculationClass,
    person,
    userId
  ) => {
    let newDate = await addDate(
      matriculationDate.startDate,
      matriculationDate.endDate,
      userId
    );
    let label = 'Matriculation';
    let newMatriculationClass = '';
    let newMatriculationClassId = '';
    if (matriculationClass !== '') {
      let normClass = matriculationClasses.find(
        (mc) => mc.name === matriculationClass
      );
      if (typeof normClass !== 'undefined') {
        newMatriculationClass = normClass.nameUpdated;
        newMatriculationClassId = normClass._id;
      }
    }
    if (newMatriculationClass !== '') {
      label = `Matriculation into ${newMatriculationClass}`;
    }
    let matriculationEventQuery = `match (n:Event {label:"${label}"})
      match (t:Temporal)
      match (s:Spatial)
      WHERE exists((n)-[:hasTime]->(t)) AND id(t)=${newDate._id}
      AND exists((n)-[:hasLocation]->(s)) AND id(s)=${icpSpatialNode._id}
      return n,t`;
    let matriculationEvent = await session
      .writeTransaction((tx) => tx.run(matriculationEventQuery, {}))
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
    if (matriculationEvent === null) {
      matriculationEvent = await addNewEvent(
        label,
        matriculationTaxonomyTerm._id,
        userId
      );
    }
    let matriculationReference = {
      items: [
        { _id: matriculationEvent._id, type: 'Event' },
        { _id: person._id, type: 'Person' },
      ],
      taxonomyTermLabel: 'hasParticipant',
    };
    if (newMatriculationClassId !== '') {
      matriculationReference.items[1].role = null;
      matriculationReference.items[0].role = newMatriculationClassId;
    }
    await updateReference(matriculationReference);
    let matriculationTemporalReference = {
      items: [
        { _id: matriculationEvent._id, type: 'Event' },
        { _id: newDate._id, type: 'Temporal' },
      ],
      taxonomyTermLabel: 'hasTime',
    };
    await updateReference(matriculationTemporalReference);
    let matriculationSpatialReference = {
      items: [
        { _id: matriculationEvent._id, type: 'Event' },
        { _id: icpSpatialNode._id, type: 'Spatial' },
      ],
      taxonomyTermLabel: 'hasLocation',
    };
    await updateReference(matriculationSpatialReference);

    return true;
  };

  const ordinationTaxonomyTerm = new TaxonomyTerm({ labelId: 'ordination' });
  await ordinationTaxonomyTerm.load();

  const addOrdinationEvent = async (
    date,
    location,
    role,
    description,
    person,
    userId
  ) => {
    let label = 'Ordination';
    if (role !== '') {
      label = `Ordained as ${role}`;
    }
    let ordinationEvent = await addNewEvent(
      label,
      ordinationTaxonomyTerm._id,
      userId,
      description
    );
    let personReference = {
      items: [
        { _id: ordinationEvent._id, type: 'Event' },
        { _id: person._id, type: 'Person' },
      ],
      taxonomyTermLabel: 'hasParticipant',
    };
    await updateReference(personReference);
    if (date !== '') {
      if (typeof date === 'string') {
        date = normaliseDate(date);
      }
      let newDate = await addDate(date.startDate, date.endDate, userId);
      let temporalReference = {
        items: [
          { _id: ordinationEvent._id, type: 'Event' },
          { _id: newDate._id, type: 'Temporal' },
        ],
        taxonomyTermLabel: 'hasTime',
      };
      await updateReference(temporalReference);
    }
    if (location !== '') {
      let escapeLocation = helpers.addslashes(location);
      const spatialQuery = `MATCH (n:Spatial) WHERE trim(toLower(n.label))=toLower("${escapeLocation}") RETURN n`;
      let spatial = await session
        .writeTransaction((tx) => tx.run(spatialQuery, {}))
        .then((result) => {
          let records = result.records;
          if (records.length > 0) {
            let record = records[0].toObject();
            let outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          } else return null;
        })
        .catch((error) => {
          console.log(error);
        });
      if (spatial === null) {
        console.log(
          `No spatial for location: "${location}" and person: "${person.label}"`
        );
      } else {
        let spatialReference = {
          items: [
            { _id: ordinationEvent._id, type: 'Event' },
            { _id: spatial._id, type: 'Spatial' },
          ],
          taxonomyTermLabel: 'hasLocation',
        };
        await updateReference(spatialReference);
      }
    }
    return true;
  };

  const deathTaxonomyTerm = new TaxonomyTerm({ labelId: 'Death' });
  await deathTaxonomyTerm.load();

  const addDeathEvent = async (date, location, description, person, userId) => {
    let newEvent = await addNewEvent(
      'Deceased',
      deathTaxonomyTerm._id,
      userId,
      description
    );
    let personReference = {
      items: [
        { _id: newEvent._id, type: 'Event' },
        { _id: person._id, type: 'Person' },
      ],
      taxonomyTermLabel: 'wasStatusOf',
    };
    await updateReference(personReference);
    if (date !== '') {
      if (typeof date === 'string') {
        date = normaliseDate(date);
      }
      let newDate = await addDate(date.startDate, date.endDate, userId);
      let temporalReference = {
        items: [
          { _id: newEvent._id, type: 'Event' },
          { _id: newDate._id, type: 'Temporal' },
        ],
        taxonomyTermLabel: 'hasTime',
      };
      await updateReference(temporalReference);
    }
    if (location !== '') {
      let escapeLocation = helpers.addslashes(location);
      const spatialQuery = `MATCH (n:Spatial) WHERE trim(toLower(n.label))=toLower("${escapeLocation}") RETURN n`;
      let spatial = await session
        .writeTransaction((tx) => tx.run(spatialQuery, {}))
        .then((result) => {
          let records = result.records;
          if (records.length > 0) {
            let record = records[0].toObject();
            let outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          } else return null;
        })
        .catch((error) => {
          console.log(error);
        });
      if (spatial === null) {
        console.log(
          `No spatial for location: "${location}" and person: "${person.label}"`
        );
      }
      let spatialReference = {
        items: [
          { _id: newEvent._id, type: 'Event' },
          { _id: spatial._id, type: 'Spatial' },
        ],
        taxonomyTermLabel: 'hasLocation',
      };
      await updateReference(spatialReference);
    }
    return true;
  };

  const bursaryScholarshipTaxonomyTerm = new TaxonomyTerm({
    labelId: 'BursaryScholarship',
  });
  await bursaryScholarshipTaxonomyTerm.load();

  const addBursaryScholarshipEvent = async (
    date,
    location,
    description,
    person,
    userId
  ) => {
    let label = helpers.addslashes('Bursary/Scholarship');
    let newEvent = await addNewEvent(
      label,
      bursaryScholarshipTaxonomyTerm._id,
      userId,
      description
    );
    let personReference = {
      items: [
        { _id: newEvent._id, type: 'Event' },
        { _id: person._id, type: 'Person' },
      ],
      taxonomyTermLabel: 'hasRecipient',
    };
    await updateReference(personReference);
    if (date !== '') {
      if (typeof date === 'string') {
        date = normaliseDate(date);
      }
      let newDate = await addDate(date.startDate, date.endDate, userId);
      let temporalReference = {
        items: [
          { _id: newEvent._id, type: 'Event' },
          { _id: newDate._id, type: 'Temporal' },
        ],
        taxonomyTermLabel: 'hasTime',
      };
      await updateReference(temporalReference);
    }
    if (location !== '') {
      let escapeLocation = helpers.addslashes(location);
      const spatialQuery = `MATCH (n:Spatial) WHERE trim(toLower(n.label))=toLower("${escapeLocation}") RETURN n`;
      let spatial = await session
        .writeTransaction((tx) => tx.run(spatialQuery, {}))
        .then((result) => {
          let records = result.records;
          if (records.length > 0) {
            let record = records[0].toObject();
            let outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          } else return null;
        })
        .catch((error) => {
          console.log(error);
        });
      if (spatial === null) {
        console.log(
          `No spatial for location: "${location}" and person: "${person.label}"`
        );
      }
      let spatialReference = {
        items: [
          { _id: newEvent._id, type: 'Event' },
          { _id: spatial._id, type: 'Spatial' },
        ],
        taxonomyTermLabel: 'hasLocation',
      };
      await updateReference(spatialReference);
    }
    return true;
  };

  const confirmationTaxonomyTerm = new TaxonomyTerm({
    labelId: 'Confirmation',
  });
  await confirmationTaxonomyTerm.load();

  const addConfirmationEvent = async (confirmationDate, person, userId) => {
    if (typeof confirmationDate === 'string') {
      confirmationDate = normaliseDate(confirmationDate);
    }
    let newDate = await addDate(
      confirmationDate.startDate,
      confirmationDate.endDate,
      userId
    );
    let confirmationEvent = await addNewEvent(
      'Confirmation',
      confirmationTaxonomyTerm._id,
      userId
    );
    let confirmationReference = {
      items: [
        { _id: confirmationEvent._id, type: 'Event' },
        { _id: person._id, type: 'Person' },
      ],
      taxonomyTermLabel: 'hasParticipant',
    };
    await updateReference(confirmationReference);
    let confirmationTemporalReference = {
      items: [
        { _id: confirmationEvent._id, type: 'Event' },
        { _id: newDate._id, type: 'Temporal' },
      ],
      taxonomyTermLabel: 'hasTime',
    };
    await updateReference(confirmationTemporalReference);
    return true;
  };

  const departureTaxonomyTerm = new TaxonomyTerm({ labelId: 'Departure' });
  await departureTaxonomyTerm.load();

  const addDateOfDepartureEvent = async (
    dateOfDeparture,
    dateOfDepartureDescription,
    person,
    userId
  ) => {
    let datesOfDeparture = dateOfDeparture.split(';');
    for (let key in datesOfDeparture) {
      let newDateOfDeparture = datesOfDeparture[key];
      let normNewDateOfDeparture = normaliseDate(newDateOfDeparture);
      let newDate = await addDate(
        normNewDateOfDeparture.startDate,
        normNewDateOfDeparture.endDate,
        userId
      );
      let newEvent = await addNewEvent(
        'Departed from Irish College Paris (ICP)',
        departureTaxonomyTerm._id,
        userId,
        dateOfDepartureDescription
      );
      let personReference = {
        items: [
          { _id: newEvent._id, type: 'Event' },
          { _id: person._id, type: 'Person' },
        ],
        taxonomyTermLabel: 'wasStatusOf',
      };
      await updateReference(personReference);
      let temporalReference = {
        items: [
          { _id: newEvent._id, type: 'Event' },
          { _id: newDate._id, type: 'Temporal' },
        ],
        taxonomyTermLabel: 'hasTime',
      };
      await updateReference(temporalReference);
    }
    return true;
  };

  const icpOrgQuery =
    'MATCH (n:Organisation {label:"Irish College Paris (ICP)"}) RETURN n';
  const icpOrg = await session
    .writeTransaction((tx) => tx.run(icpOrgQuery, {}))
    .then((result) => {
      let records = result.records;
      if (records.length > 0) {
        let record = records[0].toObject();
        let outputRecord = helpers.outputRecord(record.n);
        return outputRecord;
      }
    });

  const addRelationToICP = async (person) => {
    let reference = {
      items: [
        { _id: person._id, type: 'Person' },
        { _id: icpOrg._id, type: 'Organisation' },
      ],
      taxonomyTermLabel: 'wasStudentOf',
    };
    await updateReference(reference);
  };

  const addExtraEvents = async (
    extraEventColumn,
    extraEventColumnDescription,
    person,
    userId
  ) => {
    let events = extraEventColumn.split(';');
    for (let eKey in events) {
      let e = events[eKey];
      let parts = e.split(',');
      let newObject = {
        event: '',
        spatial: '',
        temporal: '',
      };
      for (let key in parts) {
        let part = parts[key].trim();
        if (part.includes('e =')) {
          newObject.event = part.replace('e =', '').trim();
        }
        if (part.includes('s =')) {
          let newSpatial = part.replace('s =', '').trim();
          let newSpatial2 = eLocations.find((l) => l.name === newSpatial);
          if (typeof newSpatial2 !== 'undefined') {
            newObject.spatial = newSpatial2.nameUpdated;
          }
        }
        if (part.includes('t =')) {
          newObject.temporal = part.replace('t =', '').trim();
        }
      }
      // ordination
      if (
        newObject.event === 'o' ||
        newObject.event === 'o1' ||
        newObject.event === 'o2'
      ) {
        let role = '';
        if (newObject.event === 'o1') {
          role = 'Deacon';
        }
        if (newObject.event === 'o2') {
          role = 'Subdeacon';
        }
        await addOrdinationEvent(
          newObject.temporal,
          newObject.spatial,
          role,
          extraEventColumnDescription,
          person,
          userId
        );
      }
      // death
      if (newObject.event === 'd') {
        await addDeathEvent(
          newObject.temporal,
          newObject.spatial,
          extraEventColumnDescription,
          person,
          userId
        );
      }
      // = bursary/scholarship
      if (newObject.event === 'b') {
        await addBursaryScholarshipEvent(
          newObject.temporal,
          newObject.spatial,
          extraEventColumnDescription,
          person,
          userId
        );
      }
    }

    return true;
  };

  let path = `${archivePath}documents/icp/ICP-Database.csv`;
  var csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(path)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  let keys = Object.keys(csv['0']);
  let totalLength = csv.length;
  for (let rowKey in csv) {
    let row = csv[rowKey];
    let archivalReferenceId = row[keys['1']].trim();
    let lastName = row[keys['2']].trim();
    let firstName = row[keys['3']].trim();
    let middleName = '';
    if (firstName.includes(' ')) {
      let firstNameArr = firstName.split(' ');
      firstName = firstNameArr[0].trim();
      middleName = firstNameArr[1].trim();
    }
    let dateOfBirth = normaliseDate(row[keys['4']].trim());

    // father
    let fatherFirstName = row[keys['5']].trim();
    let fatherLastName = lastName;

    // mother
    let motherFirstName = row[keys['6']].trim();
    let motherLastName = lastName;
    let motherMaidenName = row[keys['7']].trim();

    let placeOfOrigin = row[keys['8']].trim();
    let diocese = row[keys['9']].trim();
    let baptisedDate = normaliseDate(row[keys['10']].trim());
    let matriculationDate = normaliseDate(row[keys['14']].trim());
    let matriculationClass = row[keys['21']].trim();
    let confirmationDate = row[keys['19']].trim();
    if (confirmationDate !== 'yes') {
      confirmationDate = normaliseDate(row[keys['19']].trim());
    }
    let dateOfDeparture = row[keys['18']].trim();
    let dateOfDepartureDescription = row[keys['45']].trim();

    let extraEventColumn = row[keys['46']].trim();
    let extraEventColumnDescription = row[keys['47']].trim();

    let dbID = row[keys['48']]?.trim() || '';

    // 1. ingest person
    let person = await ingestPerson(
      firstName,
      middleName,
      lastName,
      dbID,
      Number(rowKey),
      totalLength
    );

    // 2. reference to archival number
    // add the reources to the db if not exist
    await addArchivalReference(archivalReferenceId, person);

    // 3. create birth event
    if (row['Date of Birth'].trim() !== '') {
      await addBirthEvent(dateOfBirth, birthEventType, person);
    }

    // 4. father info
    if (fatherFirstName !== '') {
      let fatherData = {
        firstName: fatherFirstName,
        lastName: fatherLastName,
        type: 'father',
        person: person,
        referenceTermLabel: 'isSonOf',
      };
      await addRelative(fatherData);
    }

    // 5. mother info
    if (motherFirstName !== '') {
      let motherData = {
        firstName: motherFirstName,
        lastName: motherLastName,
        maidenName: motherMaidenName,
        type: 'mother',
        person: person,
        referenceTermLabel: 'isSonOf',
      };
      await addRelative(motherData);
    }

    // 6. add place of origin
    let organisationOfOrigin = iLocations.find((l) => l.name === placeOfOrigin);
    if (
      typeof organisationOfOrigin !== 'undefined' &&
      organisationOfOrigin.type !== 'Incorrect entry'
    ) {
      await addLocation(organisationOfOrigin, diocese, person, userId);
    }

    // 7. add diocese reference
    if (diocese !== '') {
      await addDioceseRef(diocese, person, userId);
    }

    // 8. Baptism
    if (baptisedDate !== '') {
      await addBaptisedEvent(baptisedDate, person, userId);
    }

    // 9. Matriculation
    if (matriculationDate !== '') {
      await addMatriculationEvent(
        matriculationDate,
        matriculationClass,
        person,
        userId
      );
    }

    // 10. Confirmation
    if (confirmationDate !== '') {
      await addConfirmationEvent(confirmationDate, person, userId);
    }

    // 11. date of departure
    if (dateOfDeparture !== '') {
      await addDateOfDepartureEvent(
        dateOfDeparture,
        dateOfDepartureDescription,
        person,
        userId
      );
    }

    // 12. add relation to ICP
    await addRelationToICP(person, userId);

    // 13. add extra events
    if (extraEventColumn !== '') {
      await addExtraEvents(
        extraEventColumn,
        extraEventColumnDescription,
        person,
        userId
      );
    }
  }
  console.log('Completed successfully.');
  // stop executing
  process.exit();
};

const icpLocations = async () => {
  let path = `${archivePath}documents/icp/ICP-Database.csv`;
  var csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(path)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  let keys = Object.keys(csv['0']);
  let spatial = [];
  let names = [];
  const session = driver.session();
  for (let rowKey in csv) {
    let row = csv[rowKey];
    let extraEventColumn = row[keys['46']].trim();
    let events = extraEventColumn.split(';');
    for (let eKey in events) {
      let e = events[eKey];
      let parts = e.split(',');
      let obj = {
        event: '',
        spatial: '',
        temporal: '',
      };
      for (let key in parts) {
        let part = parts[key].trim();
        if (part.includes('e =')) {
          obj.event = part.replace('e =', '').trim();
        }
        if (part.includes('s =')) {
          obj.spatial = part.replace('s =', '').trim();
        }
        if (part.includes('t =')) {
          obj.temporal = part.replace('t =', '').trim();
        }
      }
      if (names.indexOf(obj.spatial) === -1) {
        const icpSpatialQuery = `MATCH (n:Spatial {label:"${obj.spatial}"}) RETURN n`;
        let icpSpatialNode = await session
          .writeTransaction((tx) => tx.run(icpSpatialQuery, {}))
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
        let nameUpdated = icpSpatialNode?.label || '';
        let dbMatch = '';
        if (icpSpatialNode !== null) {
          dbMatch = 'yes';
        }
        spatial.push({
          name: obj.spatial,
          nameUpdated: nameUpdated,
          dbMatch: dbMatch,
        });
        names.push(obj.spatial);
      }
    }
  }
  session.close();
  spatial.sort((a, b) => (a.name > b.name ? 1 : -1));
  let csvText = 'Name,Name Updated,DB Match\n';
  for (let k in spatial) {
    let row = spatial[k];
    csvText += `${row.name},${row.nameUpdated},${row.dbMatch}\n`;
  }
  let csvPath = `${archivePath}documents/icp/locations.csv`;
  await new Promise((resolve, reject) => {
    fs.writeFile(csvPath, csvText, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  process.exit();
};

const referenceMainICP = async () => {
  const session = driver.session();

  // reference 1
  let reference1Title = helpers.addslashes(
    'MS A2.c1 Registre des entrées et sorties des élèves, 1835-1849 [1835-1851]'
  );
  let r1Query = `MATCH (n) WHERE n.label="${reference1Title}" RETURN n`;
  let reference1 = await session
    .writeTransaction((tx) => tx.run(r1Query, {}))
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

  // reference 2
  let reference2Title = helpers.addslashes(
    'MS A2.c4 Registre des élèves entrés au collège entre 1858 et 1938 (1858-1939) [1858-1939].'
  );
  let r2Query = `MATCH (n) WHERE n.label="${reference2Title}" RETURN n`;
  let reference2 = await session
    .writeTransaction((tx) => tx.run(r2Query, {}))
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

  // reference 3
  let reference3Title = helpers.addslashes(
    "MS A2.d1 Recettes et dépenses de 1807 à 1814 et registre d'entrée et de sortie des élèves de 1832 à 1838 [1832-1839]."
  );
  let r3Query = `MATCH (n) WHERE n.label="${reference3Title}" RETURN n`;
  let reference3 = await session
    .writeTransaction((tx) => tx.run(r3Query, {}))
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

  // reference 4
  let reference4Title = helpers.addslashes(
    'MS A2.d15 Collège: livre de comptes, commission de 1849, bourses, registre des étudiants de 1850 à 1858 (1849-1873), emploi du temps et notes (1932-1937) [1850-1858].'
  );
  let r4Query = `MATCH (n) WHERE n.label="${reference4Title}" RETURN n`;
  let reference4 = await session
    .writeTransaction((tx) => tx.run(r4Query, {}))
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

  // main reference
  let mainReferenceTitle = helpers.addslashes(
    "Liam Chambers and Sarah Frank, 'Database of students at the Irish College, Paris, 1832-1939'"
  );
  let mrQuery = `MATCH (n) WHERE n.label="${mainReferenceTitle}" RETURN n`;
  let mainReference = await session
    .writeTransaction((tx) => tx.run(mrQuery, {}))
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

  // link references to main reference
  let refIds = [reference1._id, reference2._id, reference3._id, reference4._id];
  let lrQuery = `MATCH (n)-[r:hasReference]->(t) WHERE id(n) IN [${refIds}] return id(t) AS _id`;
  let people = await session
    .writeTransaction((tx) => tx.run(lrQuery, {}))
    .then((result) => {
      let output = [];
      let records = result.records;
      if (records.length > 0) {
        for (let key in records) {
          let record = records[key].toObject();
          helpers.prepareOutput(record);
          let newId = Number(record._id);
          if (output.indexOf(output) === -1) {
            output.push(newId);
          }
        }
      }
      return output;
    })
    .catch((error) => {
      console.log(error);
    });

  for (let key in people) {
    let _id = people[key];
    let newRef = {
      items: [
        { _id: _id, type: 'Person', role: '' },
        { _id: mainReference._id, type: 'Resource', role: '' },
      ],
      taxonomyTermLabel: 'isReferencedIn',
    };
    await updateReference(newRef);
  }

  console.log('Process complete');
  session.close();
  process.exit();
};

const getDaysInMonth = (m, y) => {
  return new Date(y, m + 1, 0).getDate();
};

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

const syncOrganisationTypes = async () => {
  const masterCsvPath = `${archivePath}documents/1704/1704-master.csv`;
  const userId = await getAdminId();

  const masterCsv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(masterCsvPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  const masterKeys = Object.keys(masterCsv['0']);
  const types = [];
  for (let i = 0; i < masterCsv.length; i += 1) {
    const row = masterCsv[i];
    let orgType = row[masterKeys[8]].trim() || '';
    if (types.indexOf(orgType) === -1) {
      types.push(orgType);
    }
  }

  const organisationTypes = new Taxonomy({
    systemType: 'organisationTypes',
  });
  await organisationTypes.load();
  const dbFullterms = await getTaxonomyTerms(organisationTypes._id);
  const dbterms = dbFullterms.map((t) => t.label);

  const notInDB = [];
  for (let i = 0; i < types.length; i += 1) {
    let orgType = types[i];
    if (dbterms.indexOf(orgType) === -1) {
      notInDB.push(orgType);
    }
  }

  for (let i = 0; i < notInDB.length; i += 1) {
    let label = notInDB[i].trim();
    if (label !== '') {
      // add new term
      let nt = new TaxonomyTerm({
        label: label,
        labelId: label,
      });
      let savedTerm = await nt.save(userId);
      // add reference to matriculation class taxonomy
      let newRef = {
        items: [
          { _id: savedTerm.data._id, type: 'TaxonomyTerm', role: '' },
          { _id: organisationTypes._id, type: 'Taxonomy', role: '' },
        ],
        taxonomyTermLabel: 'isChildOf',
      };
      await updateReference(newRef);
    }
  }
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

const checkSpatial = async () => {
  const session = driver.session();
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
  const masterKeys = Object.keys(masterCsv['0']);
  const spatials = [];
  for (let i = 0; i < masterCsv.length; i += 1) {
    const row = masterCsv[i];
    const diocese = row[masterKeys[12]].trim() || '';
    const county = row[masterKeys[21]].trim() || '';
    if (diocese !== '') {
      const oQuery = `MATCH (n:Organisation {label: "${diocese}"}) RETURN n`;
      const organisation = await session
        .writeTransaction((tx) => tx.run(oQuery, {}))
        .then((result) => {
          const records = result.records;
          if (records.length > 0) {
            const record = records[0].toObject();
            const outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          }
          return null;
        });
      if (organisation !== null) {
        const spatial = await helpers.loadRelations(
          organisation._id,
          'Organisation',
          'Spatial'
        );
        const hasItsEpiscopalSeeIn =
          spatial.find((s) => s.term.label === `hasItsEpiscopalSeeIn`) || null;
        if (
          hasItsEpiscopalSeeIn !== null &&
          spatials.indexOf(hasItsEpiscopalSeeIn.ref.label) === -1
        ) {
          spatials.push(hasItsEpiscopalSeeIn.ref.label);
        }
      }
    }
    if (county !== '') {
      const cQuery = `MATCH (n:Spatial {label: "${county}"}) RETURN n`;
      const spatial = await session
        .writeTransaction((tx) => tx.run(cQuery, {}))
        .then((result) => {
          const records = result.records;
          if (records.length > 0) {
            const record = records[0].toObject();
            const outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          }
          return null;
        });
      if (spatial !== null) {
        spatials.push(spatial);
      }
    }
  }
  session.close();
  process.exit();
};

const check1704Locations = async () => {
  const session = driver.session();
  const csvPath = `${archivePath}documents/1704/locations.csv`;

  const csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  const keys = Object.keys(csv['0']);
  const dioceses = [];
  const spatials = [];
  for (let i = 0; i < csv.length; i += 1) {
    const row = csv[i];
    const diocese = row[keys[3]].trim() || '';
    if (diocese !== '') {
      const oQuery = `MATCH (n:Organisation {label: "${diocese}"}) RETURN n`;
      const organisation = await session
        .writeTransaction((tx) => tx.run(oQuery, {}))
        .then((result) => {
          const records = result.records;
          if (records.length > 0) {
            const record = records[0].toObject();
            const outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          }
          return null;
        });
      if (organisation === null && dioceses.indexOf(dioceses) === -1) {
        dioceses.push(diocese);
      }
      if (organisation !== null) {
        const spatial = await helpers.loadRelations(
          organisation._id,
          'Organisation',
          'Spatial'
        );
        const hasItsEpiscopalSeeIn =
          spatial.find((s) => s.term.label === `hasItsEpiscopalSeeIn`) || null;
        if (
          hasItsEpiscopalSeeIn === null &&
          spatials.indexOf(organisation.label) === -1
        ) {
          spatials.push(organisation.label);
        }
      }
    }
  }
  console.log('dioceses');
  console.log(dioceses);
  console.log('spatials');
  console.log(spatials);
  session.close();
  process.exit();
};

const checkTemporal = async () => {
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
  const masterKeys = Object.keys(masterCsv['0']);
  const temporals = [];
  for (let i = 0; i < masterCsv.length; i += 1) {
    const row = masterCsv[i];
    let temporal = row[masterKeys[13]].trim() || '';
    if (temporal === '') {
      continue;
    }
    let newDate = temporal.split('-');
    let d = newDate[2],
      m = newDate[1],
      y = newDate[0];
    let newTemporal = `${d}-${m}-${y}`;
    if (temporal === '1704-07-??') {
      newTemporal = `01-${m}-${y}, 31-${m}-${y}`;
    }
    if (newTemporal !== '' && temporals.indexOf(newTemporal) === -1) {
      temporals.push(newTemporal);
    }
  }
  console.log(temporals);
  process.exit();
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

const checkOrdinationDates = async () => {
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
  const masterKeys = Object.keys(masterCsv['0']);
  const temporals = [];

  for (let i = 0; i < masterCsv.length; i += 1) {
    const row = masterCsv[i];
    let temporal = row[masterKeys[14]].trim() || '';

    const returnDate = normalizeOrdinationDate(temporal);
    if (temporals.indexOf(returnDate) === -1) {
      temporals.push(returnDate);
    }
  }
  process.exit();
};

const checkOrdinationLocation = async () => {
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
  const locations = [];
  for (let i = 0; i < locationsCsv.length; i += 1) {
    const row = locationsCsv[i];
    let name = row[locationsKeys[0]].trim() || '';
    let nameUpdated = row[locationsKeys[1]].trim() || '';
    let type = row[locationsKeys[2]].trim() || '';
    let diocese = row[locationsKeys[3]].trim() || '';
    if (name !== '') {
      locations.push({
        name,
        nameUpdated,
        type,
        diocese,
      });
    }
  }
  //console.log(locations);

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
  const masterKeys = Object.keys(masterCsv['0']);
  /* for (let key in masterKeys) {
    console.log(masterKeys[key], `[${key}]`);
  } */
  /*
  const addOrganisation = async (data) => {
    const userId = await getAdminId();
    const session = driver.session();
    const searchQ = `MATCH (n:Organisation {label: "${data.label}"}) RETURN n`;
    let organisation = await session
      .writeTransaction((tx) => tx.run(searchQ, {}))
      .then((result) => {
        let records = result.records;
        if (records.length > 0) {
          let record = records[0];
          let orgRecord = record.toObject().n;
          let org = helpers.outputRecord(orgRecord);
          return org;
        }
        return null;
      })
      .catch((error) => {
        console.log(error);
      });
    if (organisation === null) {
      const newOrg = new Organisation(data);
      const newOrganisation = await newOrg.save(userId);
      organisation = newOrganisation.data;
    }
    session.close();
    return organisation;
  };
  */
  const findSpatial = async (label) => {
    const session = driver.session();
    const query = `MATCH (n:Spatial {label: "${label}" }) return n`;
    const spatial = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        const records = result.records;
        if (records.length > 0) {
          let record = records[0].toObject();
          let outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        } else return null;
      })
      .catch((error) => {
        console.log(error);
      });
    session.close();
    return spatial;
  };

  const masterLocations = [];
  for (let i = 0; i < masterCsv.length; i += 1) {
    const row = masterCsv[i];
    let place = row[masterKeys[15]].trim() || '';
    if (place === '') {
      continue;
    }
    let location = locations.find((l) => l.name === place) || null;
    if (location !== null) {
      let spatial = await findSpatial(location.nameUpdated);
      if (
        spatial === null &&
        masterLocations.indexOf(location.nameUpdated) === -1
      ) {
        masterLocations.push(location.nameUpdated);
      }
      /* let dioceseData = {};
      if (location.diocese !== '') {
        dioceseData.label = location.diocese;
        dioceseData.type = location.type;
        dioceseData.alternateAppelations = [{ label: location.name }];
        const diocese = await addOrganisation(dioceseData);
        if (diocese === null) {
          masterLocations.push(place);
        }
        if (diocese !== null) {
          const spatial = await helpers.loadRelations(
            diocese._id,
            'Organisation',
            'Spatial'
          );
          const hasItsEpiscopalSeeIn =
            spatial.find((s) => s.term.label === `hasItsEpiscopalSeeIn`) || null;
          const newLocation = {
            label: location.nameUpdated,
            altLabel: location.name,
            type: location.type,
          };
          if (hasItsEpiscopalSeeIn !== null) {
            newLocation.episcopalSeeIn = hasItsEpiscopalSeeIn;
          }
        }
      } */

      //masterLocations.push(newLocation);
    }
  }
  console.log(masterLocations.length);
  //console.log(masterLocations);
  masterLocations.sort();
  let csvPath = `${archivePath}documents/1704/spatials.csv`;
  let csvText = masterLocations.join('\n');
  await new Promise((resolve, reject) => {
    fs.writeFile(csvPath, '\ufeff' + csvText, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  process.exit();
};

const checkOrdinationBishops = async () => {
  const session = driver.session();
  const dioceses = [];
  const dQuery = `MATCH (n:Organisation {organisationType: 'Diocese'}) RETURN n`;
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(dQuery, {}))
    .then((result) => {
      return result.records;
    });
  const oNodes = helpers.normalizeRecordsOutput(nodesPromise);
  for (let i = 0; i < oNodes.length; i += 1) {
    const node = oNodes[i];
    dioceses.push({
      label: node.label,
      _id: node._id,
    });
  }
  //console.log(dioceses);

  const diocesesUpdated = [];
  const diocesesUpdatedCsvPath = `${archivePath}documents/1704/1704-dioceses-updated.csv`;
  const diocesesUpdatedCsv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(diocesesUpdatedCsvPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  const diocesesUpdatedKeys = Object.keys(diocesesUpdatedCsv['0']);
  for (let i = 0; i < diocesesUpdatedCsv.length; i += 1) {
    const dioceseRow = diocesesUpdatedCsv[i];
    if (
      dioceseRow[diocesesUpdatedKeys[0]].trim() === '' ||
      dioceseRow[diocesesUpdatedKeys[1]].trim() === ''
    ) {
      continue;
    }
    diocesesUpdated.push({
      name: dioceseRow[diocesesUpdatedKeys[0]].trim(),
      nameUpdated: dioceseRow[diocesesUpdatedKeys[1]].trim(),
    });
  }

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
  const masterKeys = Object.keys(masterCsv['0']);
  const bishops = [];
  const bishopsObj = [];
  const bishopsText = [];
  for (let i = 0; i < masterCsv.length; i += 1) {
    let row = masterCsv[i];
    const bishop = row[masterKeys[18]].trim() || '';
    if (bishop === '') {
      continue;
    }
    const newBishop = {
      text0: '',
      text1: '',
      label: '',
      firstName: '',
      lastName: '',
      prefix: '',
      title: '',
      role: '',
      diocese: '',
      dioceseId: '',
    };
    let textChunks = bishop.split('(');
    let label = textChunks[0];

    let title = textChunks[1]?.replace('(', '') || '';
    title = title.replace(')', '');

    newBishop.text0 = label;
    let text1 = textChunks[1]?.replace(')', '') || '';
    newBishop.text1 = text1;
    if (label.includes('Dr')) {
      label = label.replace('Dr', '');
      newBishop.prefix = 'Dr';
    }
    newBishop.label = label.trim();
    if (newBishop.label === 'Unknown') {
      continue;
    }
    const labelWords = newBishop.label.split(' ');
    if (labelWords.length === 2) {
      newBishop.firstName = labelWords[0];
      newBishop.lastName = labelWords[1];
    }
    newBishop.title = title.trim();
    // handle primate of ireland case
    const primateWords = title.split('and');
    const titleWords = primateWords[0].split('of');
    newBishop.role = titleWords[0] || '';
    let newDiocese = titleWords[1] || '';
    if (newDiocese !== '') {
      const updatedDiocese =
        diocesesUpdated.find((d) => d.name.trim() === newDiocese.trim()) ||
        null;
      if (updatedDiocese !== null) {
        newDiocese = updatedDiocese.nameUpdated;
      }
    }
    newBishop.diocese = newDiocese;
    const diocese =
      dioceses.find((d) => d.label.trim() === newBishop.diocese.trim()) || null;
    if (diocese !== null) {
      newBishop.dioceseId = diocese._id;
    }

    if (bishops.indexOf(bishop) === -1) {
      bishops.push(bishop);
      bishopsObj.push(newBishop);
      bishopsText.push(
        `"${newBishop.text0.trim()}","${newBishop.text1.trim()}","${newBishop.label.trim()}","${newBishop.firstName.trim()}","${newBishop.lastName.trim()}","${newBishop.prefix.trim()}","${newBishop.title.trim()}","${newBishop.role.trim()}","${newBishop.diocese.trim()}","${newBishop.dioceseId.trim()}"`
      );
    }
  }
  const csvPath = `${archivePath}documents/1704/bishops.csv`;
  const headers = `"Text 0","Text 1","Label","First name","Last name","Prefix","Title","Role","Diocese","Diocese Id"`;
  bishopsText.unshift(headers);
  const csvText = bishopsText.join('\n');
  const writeFile = await new Promise((resolve, reject) => {
    fs.writeFile(csvPath, '\ufeff' + csvText, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  console.log(writeFile);
  //console.log(bishopsObj);
  process.exit();
};

const ingestBishops = async () => {
  const userId = await getAdminId();
  const csvPath = `${archivePath}documents/1704/bishops.csv`;
  const csv = await new Promise((resolve) => {
    let results = [];
    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
  const masterKeys = Object.keys(csv['0']);
  const newRows = [];
  for (let i = 0; i < csv.length; i += 1) {
    let row = csv[i];
    const text0 = row[masterKeys[0]].trim() || '';
    const text1 = row[masterKeys[1]].trim() || '';
    const label = row[masterKeys[2]].trim() || '';
    const firstName = row[masterKeys[3]].trim() || '';
    const lastName = row[masterKeys[4]].trim() || '';
    const honorificPrefix1 = row[masterKeys[5]].trim() || '';
    const honorificPrefix2 = row[masterKeys[6]].trim() || '';
    const dioceseRole = row[masterKeys[7]].trim() || '';
    const diocese = row[masterKeys[8]].trim() || '';
    const dioceseId = row[masterKeys[9]].trim() || '';

    // 1. ingest person
    const personData = {
      label,
    };
    if (firstName !== '') {
      personData.firstName = firstName;
    }
    if (lastName !== '') {
      personData.lastName = lastName;
    }
    const newHonorificPrefix = [];
    if (honorificPrefix1 !== '') {
      newHonorificPrefix.push(honorificPrefix1);
    }
    if (honorificPrefix2 !== '' && honorificPrefix2 !== 'Pope Innocent IX') {
      newHonorificPrefix.push(honorificPrefix2);
    }
    if (honorificPrefix2 === 'Pope Innocent IX') {
      personData.alternateAppelations = ['Pope Innocent IX'];
      newHonorificPrefix.push('His Holiness');
    }
    const newPerson = new Person(personData);
    const personSave = await newPerson.save(userId);
    const person = personSave.data;
    const dbID = person._id;

    if (dioceseId !== '') {
      const ref = {
        items: [
          { _id: person._id, type: 'Person', role: dioceseRole },
          { _id: dioceseId, type: 'Organisation' },
        ],
        taxonomyTermLabel: 'hasAffiliation',
      };
      await updateReference(ref);
    }

    const newRow = `${text0},${text1},${label},${firstName},${lastName},${honorificPrefix1},${honorificPrefix2},${dioceseRole},${diocese},${dioceseId},${dbID}`;
    newRows.push(newRow);
  }
  const csvSavePath = `${archivePath}documents/1704/bishops-updated.csv`;
  const headers = `"Text 0","Text 1","Label","First name","Last name","Prefix","Title","Role","Diocese","Diocese Id","DBid"`;
  newRows.unshift(headers);
  const csvText = newRows.join('\n');
  const writeFile = await new Promise((resolve, reject) => {
    fs.writeFile(csvSavePath, '\ufeff' + csvText, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  console.log(writeFile);
  process.exit();
};

const ingest1704 = async () => {
  const session = driver.session();
  // add new relations types
  const newRelationsTypes = [
    {
      label: 'was resident of',
      inverseLabel: 'was residence of',
      from: 'Person',
      to: 'Organisation',
    },
    {
      label: 'maintained',
      inverseLabel: 'was maintained by',
      from: 'Person',
      to: 'Event',
    },
  ];
  await addNewRelationsTypes(newRelationsTypes);

  // add new event types
  const newEventTypes = [{ label: 'habitation', inverseLabel: 'habitation' }];
  await addNewEventTypes(newEventTypes);

  // add missing organisation types
  // await syncOrganisationTypes();

  // load locations
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
  const locations = [];
  for (let i = 0; i < locationsCsv.length; i += 1) {
    const row = locationsCsv[i];
    let name = row[locationsKeys[0]].trim() || '';
    let nameUpdated = row[locationsKeys[1]].trim() || '';
    let type = row[locationsKeys[2]].trim() || '';
    let diocese = row[locationsKeys[3]].trim() || '';
    if (name !== '') {
      locations.push({
        name,
        nameUpdated,
        type,
        diocese,
      });
    }
  }

  const userId = await getAdminId();
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
  const masterKeys = Object.keys(masterCsv['0']);

  const addOrganisation = async (data) => {
    if (typeof data.label === 'undefined') {
      return { _id: null };
    }
    const label = data.label;
    const searchQ = `MATCH (n:Organisation {label: "${label}"}) RETURN n`;
    let organisation = await session
      .writeTransaction((tx) => tx.run(searchQ, {}))
      .then((result) => {
        let records = result.records;
        if (records.length > 0) {
          let record = records[0];
          let orgRecord = record.toObject().n;
          let org = helpers.outputRecord(orgRecord);
          return org;
        }
        return null;
      })
      .catch((error) => {
        console.log(error);
      });
    if (organisation === null) {
      const newOrg = new Organisation(data);
      const saveData = await newOrg.save(userId);
      organisation = saveData.data;
    }
    return organisation;
  };

  const addDate = async (startDate, endDate = null, label = null) => {
    let queryEndDate = '';
    if (endDate !== null && endDate !== '') {
      queryEndDate = `AND n.endDate="${endDate}" `;
    }
    let query = `MATCH (n:Temporal) WHERE n.startDate="${startDate}" ${queryEndDate} RETURN n`;
    if (label !== null) {
      query = `MATCH (n:Temporal) WHERE n.label="${label}" AND n.startDate="${startDate}" ${queryEndDate} RETURN n`;
    }
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
      let now = new Date().toISOString();
      let newLabel = startDate;
      if (endDate !== null) {
        newLabel += ` - ${endDate}`;
      }
      if (label !== null) {
        newLabel = label;
      }
      let newItem = {
        label: newLabel,
        startDate: startDate,
        endDate: endDate,
        createdBy: userId,
        createdAt: now,
        updatedBy: userId,
        updatedAt: now,
      };
      let nodeProperties = helpers.prepareNodeProperties(newItem);
      let params = helpers.prepareParams(newItem);
      let query = `CREATE (n:Temporal ${nodeProperties}) RETURN n`;
      temporal = await session
        .writeTransaction((tx) => tx.run(query, params))
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
    }
    return temporal;
  };

  const addEvent = async (label, eventTypeId) => {
    const now = new Date().toISOString();
    const eventData = {
      label: label,
      eventType: eventTypeId,
      status: 'private',
      createdBy: userId,
      createdAt: now,
      updatedBy: userId,
      updatedAt: now,
    };
    const newEventProperties = helpers.prepareNodeProperties(eventData);
    const newEventParams = helpers.prepareParams(eventData);
    const newEventQuery = `CREATE (n:Event ${newEventProperties}) RETURN n`;
    const newEvent = await session
      .writeTransaction((tx) => tx.run(newEventQuery, newEventParams))
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
    return newEvent;
  };

  const addTaxonomyTerm = async (term, systemType) => {
    const relationsTypes = new Taxonomy({
      systemType,
    });
    await relationsTypes.load();
    let nt = new TaxonomyTerm({
      label: term.label,
      inverseLabel: term.inverseLabel,
    });
    if (typeof term.labelId !== 'undefined' && term.labelId !== '') {
      nt.labelId = term.labelId;
    } else {
      nt.labelId = helpers.normalizeLabelId(term.label);
    }
    if (
      typeof term.inverseLabelId !== 'undefined' &&
      term.inverseLabelId !== ''
    ) {
      nt.inverseLabelId = term.inverseLabelId;
    } else {
      nt.inverseLabelId = helpers.normalizeLabelId(term.inverseLabel);
    }
    await nt.load();
    if (nt._id === null) {
      const savedTerm = await nt.save(userId);
      nt = savedTerm.data;
      const ref = {
        items: [
          { _id: savedTerm.data._id, type: 'TaxonomyTerm', role: '' },
          { _id: relationsTypes._id, type: 'Taxonomy', role: '' },
        ],
        taxonomyTermLabel: 'isChildOf',
      };
      await updateReference(ref);
    }
    return nt;
  };

  const wasResidentOfData = {
    label: 'was resident of',
    inverseLabel: 'was residence of',
  };
  await addTaxonomyTerm(wasResidentOfData, 'relationsTypes');

  const receivedOrdersData = {
    label: 'received holy orders from',
    inverseLabel: 'performed ordination of',
  };
  await addTaxonomyTerm(receivedOrdersData, 'relationsTypes');

  const ordainingBishopData = {
    label: 'ordaining bishop',
    inverseLabel: 'ordaining bishop',
  };
  await addTaxonomyTerm(ordainingBishopData, 'peopleRoles');

  const addPerson = async (
    firstNameParam,
    lastNameParam,
    updatedFirstNameParam,
    updatedLastNameParam,
    dbIDParam
  ) => {
    const firstName = helpers.addslashes(firstNameParam);
    const lastName = helpers.addslashes(lastNameParam);
    let updatedFirstName = updatedFirstNameParam.trim();
    let updatedLastName = updatedLastNameParam.trim();
    let dbID = dbIDParam.trim();
    // rule 1
    let person = {
      firstName,
      lastName,
    };

    // rule 3
    let alternateAppelation = null;
    if (updatedLastName !== '') {
      updatedLastName = helpers.addslashes(updatedLastName);
      person.lastName = updatedLastName;
      alternateAppelation = {
        firstName,
        lastName,
      };
    }

    // rule 5
    if (updatedFirstName !== '') {
      updatedFirstName = helpers.addslashes(updatedFirstName);
      person.firstName = updatedFirstName;
      alternateAppelation = {
        firstName,
      };
      if (alternateAppelation.lastName === '') {
        alternateAppelation.lastName = lastName;
      }
    }

    // rule 3, 5, 6
    if (alternateAppelation !== null) {
      alternateAppelation.label = `${alternateAppelation.firstName} ${alternateAppelation.lastName}`;
    }

    // update data
    let personData = {};
    if (dbID === '') {
      personData = {
        status: 'private',
        firstName: person.firstName,
        lastName: person.lastName,
        personType: 'Clergy',
      };
      if (person.firstName !== '') {
        personData.fnameSoundex = helpers.soundex(person.firstName);
      }
      if (person.lastName !== '') {
        personData.lnameSoundex = helpers.soundex(person.lastName);
      }
    } else {
      dbID = Number(dbID);
      const dbPerson = new Person({ _id: dbID });
      await dbPerson.load();
      personData = {
        _id: dbID,
        honorificPrefix: dbPerson.honorificPrefix,
        firstName: person.firstName,
        middleName: dbPerson.middleName,
        lastName: person.lastName,
        description: dbPerson.description,
        personType: dbPerson.personType,
        status: dbPerson.status,
      };
      if (alternateAppelation !== null) {
        let newAlternateAppelations = [];
        if (
          typeof dbPerson.alternateAppelations === 'object' &&
          dbPerson.alternateAppelations.length > 0
        ) {
          for (let aa = 0; aa < dbPerson.alternateAppelations.length; aa += 1) {
            newAlternateAppelations.push(dbPerson.alternateAppelations[aa]);
          }
        }
        newAlternateAppelations.push(alternateAppelation);
      }
      if (person.firstName !== '') {
        personData.fnameSoundex = helpers.soundex(person.firstName);
      }
      if (person.lastName !== '') {
        personData.lnameSoundex = helpers.soundex(person.lastName);
      }
    }
    const newPerson = new Person(personData);
    const personSave = await newPerson.save(userId);
    person = personSave.data;
    return person;
  };

  const personPlaceOfAbode = async (
    person,
    placeOfAbodeParam,
    placeOfAbodeTypeParam,
    updatedPlaceOfAbodeParam,
    dioceseParam,
    countyOfAbodeParam,
    dateInfoRecordedParam
  ) => {
    const placeOfAbode = placeOfAbodeParam.trim();
    const placeOfAbodeType = placeOfAbodeTypeParam.trim();
    const updatedPlaceOfAbode = updatedPlaceOfAbodeParam.trim();
    const diocese = dioceseParam.trim();
    const countyOfAbode = countyOfAbodeParam.trim();
    const dateInfoRecorded = dateInfoRecordedParam.trim();

    // rule 7a 1
    let abode = {};
    if (placeOfAbode !== '') {
      abode.label = helpers.addslashes(placeOfAbode);
      if (placeOfAbodeType !== '') {
        abode.organisationType = placeOfAbodeType;
      }
    }
    if (updatedPlaceOfAbode !== '') {
      abode.label = helpers.addslashes(updatedPlaceOfAbode);
      abode.alternateAppelations = [{ label: placeOfAbode }];
    }
    const abodeOrganisation = await addOrganisation(abode);

    // rule 7a 2.1
    // link place of abode with person
    if (abodeOrganisation._id !== null) {
      const abodeRefLabel = helpers.normalizeLabelId('was resident of');
      const abodeRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: abodeOrganisation._id, type: 'Organisation', role: '' },
        ],
        taxonomyTermLabel: abodeRefLabel,
      };
      await updateReference(abodeRef);
    }

    // rule 7b
    // add residence event
    let residenceEvent = null;
    if (abodeOrganisation._id !== null) {
      const abodeOrganisationLabel = helpers.normalizeLabelId('habitation');
      const abodeOrganisationType = new TaxonomyTerm({
        labelId: abodeOrganisationLabel,
      });
      await abodeOrganisationType.load();
      const eventTypeId = abodeOrganisationType._id.toString();
      residenceEvent = await addEvent('residence', eventTypeId);
      // link event with person
      const eventRefLabel = helpers.normalizeLabelId('maintained');
      const eventRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: residenceEvent._id, type: 'Event', role: '' },
        ],
        taxonomyTermLabel: eventRefLabel,
      };
      await updateReference(eventRef);
      // link event with place of abode
      const eventDioceseRef = {
        items: [
          { _id: abodeOrganisation._id, type: 'Organisation', role: '' },
          { _id: residenceEvent._id, type: 'Event', role: '' },
        ],
        taxonomyTermLabel: 'hasRelation',
      };
      await updateReference(eventDioceseRef);
    }

    // rule 7a 2.2
    // link place of abode with its episcopal see in
    let dioceseOrganisation = null;
    if (diocese !== '') {
      const dioceseLabel = helpers.addslashes(diocese);
      const oQuery = `MATCH (n:Organisation {label: "${dioceseLabel}"}) RETURN n`;
      dioceseOrganisation = await session
        .writeTransaction((tx) => tx.run(oQuery, {}))
        .then((result) => {
          const records = result.records;
          if (records.length > 0) {
            const record = records[0].toObject();
            const outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          }
          return null;
        });
      if (dioceseOrganisation !== null) {
        const spatial = await helpers.loadRelations(
          dioceseOrganisation._id,
          'Organisation',
          'Spatial'
        );
        const hasItsEpiscopalSeeIn =
          spatial.find((s) => s.term.label === `hasItsEpiscopalSeeIn`) || null;
        if (hasItsEpiscopalSeeIn !== null) {
          // add episcopal see in ref
          let episcopalSeeInRef = {
            items: [
              { _id: abodeOrganisation._id, type: 'Organisation', role: '' },
              { _id: hasItsEpiscopalSeeIn.ref._id, type: 'Spatial', role: '' },
            ],
            taxonomyTermLabel: `hasItsEpiscopalSeeIn`,
          };
          await updateReference(episcopalSeeInRef);
          // link episcopal see in with residence event
          if (residenceEvent !== null) {
            let episcopalSeeInEventRef = {
              items: [
                { _id: residenceEvent._id, type: 'Event', role: '' },
                {
                  _id: hasItsEpiscopalSeeIn.ref._id,
                  type: 'Spatial',
                  role: '',
                },
              ],
              taxonomyTermLabel: `hasItsEpiscopalSeeIn`,
            };
            await updateReference(episcopalSeeInEventRef);
          }
        }
      }
    }

    // link place of abode with its location
    if (countyOfAbode !== '') {
      // rule 13
      const countyOrganisation = await addOrganisation({
        label: countyOfAbode,
        organisationType: 'County',
      });
      const abodeRefLabel = helpers.normalizeLabelId('was resident of');
      const countyPersonRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: countyOrganisation._id, type: 'Organisation', role: '' },
        ],
        taxonomyTermLabel: abodeRefLabel,
      };
      await updateReference(countyPersonRef);

      const countyOfAbodeLabel = helpers.addslashes(countyOfAbode);
      const cQuery = `MATCH (n:Spatial {label: "${countyOfAbodeLabel}"}) RETURN n`;
      const countyOfAbodeSpatial = await session
        .writeTransaction((tx) => tx.run(cQuery, {}))
        .then((result) => {
          const records = result.records;
          if (records.length > 0) {
            const record = records[0].toObject();
            const outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          }
          return null;
        });
      if (countyOfAbodeSpatial !== null) {
        const hasLocationRef = {
          items: [
            { _id: abodeOrganisation._id, type: 'Organisation', role: '' },
            { _id: countyOfAbodeSpatial._id, type: 'Spatial', role: '' },
          ],
          taxonomyTermLabel: `hasLocation`,
        };
        await updateReference(hasLocationRef);
        // link county of abode with residence event
        if (residenceEvent !== null) {
          const hasLocationEventRef = {
            items: [
              { _id: residenceEvent._id, type: 'Event', role: '' },
              { _id: countyOfAbodeSpatial._id, type: 'Spatial', role: '' },
            ],
            taxonomyTermLabel: `hasLocation`,
          };
          await updateReference(hasLocationEventRef);
        }

        const countyLocationRef = {
          items: [
            { _id: countyOrganisation._id, type: 'Organisation', role: '' },
            { _id: countyOfAbodeSpatial._id, type: 'Spatial', role: '' },
          ],
          taxonomyTermLabel: `hasLocation`,
        };
        await updateReference(countyLocationRef);
      }
    }

    // rule 7b
    // add temporal
    if (residenceEvent !== null && dateInfoRecorded !== '') {
      let newDate = dateInfoRecorded.split('-');
      let d = newDate[2],
        m = newDate[1],
        y = newDate[0];
      let startDate = `${d}-${m}-${y}`,
        endDate = null;
      if (dateInfoRecorded === '1704-07-??') {
        startDate = `01-${m}-${y}`;
        endDate = `31-${m}-${y}`;
      }
      const newTemporal = await addDate(startDate, endDate);
      const hasTimeEventRef = {
        items: [
          { _id: residenceEvent._id, type: 'Event', role: '' },
          { _id: newTemporal._id, type: 'Temporal', role: '' },
        ],
        taxonomyTermLabel: `hasTime`,
      };
      await updateReference(hasTimeEventRef);
    }
    return residenceEvent;
  };

  // rule 8
  const addBirthEvent = async (person, ageParam) => {
    let age = ageParam.trim();
    let birthEvent = null;
    if (age !== '') {
      const birthLabel = helpers.normalizeLabelId('Birth');
      const birthType = new TaxonomyTerm({
        labelId: birthLabel,
      });
      await birthType.load();
      const birthTypeId = birthType._id.toString();
      birthEvent = await addEvent('born', birthTypeId);

      const birthRefLabel = helpers.normalizeLabelId('was recorded as');
      const birthRef = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: birthEvent._id, type: 'Event', role: '' },
        ],
        taxonomyTermLabel: birthRefLabel,
      };
      await updateReference(birthRef);

      // add birth temporal
      let circa = false;
      if (age.includes('c.')) {
        circa = true;
        age = Number(age);
      }

      let birthDate = 1704 - age;
      let birthDateLabel = null;
      if (circa) {
        birthDateLabel = `c.${birthDate}`;
      }
      let startBirthDate = `01-01-${birthDate}`;
      let endBirthDate = `31-12-${birthDate}`;
      const birthDateTemporalEntry = await addDate(
        startBirthDate,
        endBirthDate,
        birthDateLabel
      );

      const birthDateEventRef = {
        items: [
          { _id: birthEvent._id, type: 'Event', role: '' },
          { _id: birthDateTemporalEntry._id, type: 'Temporal', role: '' },
        ],
        taxonomyTermLabel: `hasTime`,
      };
      await updateReference(birthDateEventRef);
    }
    return birthEvent;
  };

  // rule 9
  const addDiocese = async (person, dioceseParam) => {
    if (dioceseParam !== '') {
      const diocese = helpers.addslashes(dioceseParam).trim();
      const dioceseOrganisation = await addOrganisation({
        label: diocese,
        organisationType: 'Diocese',
      });
      const ref = {
        items: [
          { _id: person._id, type: 'Person', role: '' },
          { _id: dioceseOrganisation._id, type: 'Organisation', role: '' },
        ],
        taxonomyTermLabel: `hasAffiliation`,
      };
      await updateReference(ref);
    }
  };

  // rule 10
  const addParishes = async (
    person,
    parishParam,
    updatedParishParam,
    dateInfoRecordedParam
  ) => {
    const parish = parishParam.trim();
    const updatedParish = updatedParishParam.trim();
    const dateInfoRecorded = dateInfoRecordedParam.trim();

    if (parish !== '') {
      // wasServingAs
      let parishNames = parish.split(';');
      let updatedParishNames = updatedParish.split(';');
      for (let i = 0; i < parishNames.length; i += 1) {
        let parishName = parishNames[i];
        let updatedParishName = updatedParishNames[i] || null;
        let parishLabel = parishName;
        let parishAltLabel = '';
        if (updatedParishName !== null) {
          parishLabel = updatedParishName;
          parishAltLabel = parishName;
          if (updatedParishName.includes('#')) {
            parishLabel = parishName;
            parishAltLabel = '';
          }
          const newParishData = {
            label: parishLabel.trim(),
            organisationType: 'Parish',
          };
          if (parishAltLabel !== '') {
            newParishData.alternateAppelations = [
              { label: parishAltLabel.trim() },
            ];
          }
          const newParish = await addOrganisation(newParishData);

          // new parish event
          const parishType = new TaxonomyTerm({
            labelId: 'wasServingAs',
          });
          await parishType.load();
          const parishTypeId = parishType._id.toString();

          const newParishEvent = await addEvent('parish priest', parishTypeId);
          const eventRef = {
            items: [
              { _id: person._id, type: 'Person', role: '' },
              { _id: newParishEvent._id, type: 'Event', role: '' },
            ],
            taxonomyTermId: parishTypeId,
          };
          await updateReference(eventRef);

          if (newParish !== null) {
            if (newParishEvent !== null) {
              // link parish organisation to event
              let newParishOrgRef = {
                items: [
                  { _id: newParishEvent._id, type: 'Event', role: '' },
                  {
                    _id: newParish._id,
                    type: 'Organisation',
                    role: '',
                  },
                ],
                taxonomyTermLabel: `hasRelation`,
              };
              await updateReference(newParishOrgRef);
            }
            // link spatial locations
            const spatial = await helpers.loadRelations(
              newParish._id,
              'Organisation',
              'Spatial'
            );
            if (spatial.length > 0) {
              const hasItsEpiscopalSeeIn =
                spatial.find((s) => s.term.label === `hasItsEpiscopalSeeIn`) ||
                null;
              if (hasItsEpiscopalSeeIn !== null) {
                // add episcopal see in ref
                let episcopalSeeInRef = {
                  items: [
                    { _id: newParish._id, type: 'Organisation', role: '' },
                    {
                      _id: hasItsEpiscopalSeeIn.ref._id,
                      type: 'Spatial',
                      role: '',
                    },
                  ],
                  taxonomyTermLabel: `hasItsEpiscopalSeeIn`,
                };
                await updateReference(episcopalSeeInRef);
                if (newParishEvent !== null) {
                  let episcopalSeeInEventRef = {
                    items: [
                      { _id: newParishEvent._id, type: 'Event', role: '' },
                      {
                        _id: hasItsEpiscopalSeeIn.ref._id,
                        type: 'Spatial',
                        role: '',
                      },
                    ],
                    taxonomyTermLabel: `hasLocation`,
                  };
                  await updateReference(episcopalSeeInEventRef);
                }
              }
              const hasLocation =
                spatial.find((s) => s.term.label === `hasLocation`) || null;
              if (hasLocation !== null) {
                // add episcopal see in ref
                let hasLocationRef = {
                  items: [
                    { _id: newParish._id, type: 'Organisation', role: '' },
                    {
                      _id: hasLocation.ref._id,
                      type: 'Spatial',
                      role: '',
                    },
                  ],
                  taxonomyTermLabel: `hasLocation`,
                };
                await updateReference(hasLocationRef);
                if (newParishEvent !== null) {
                  let hasLocationEventRef = {
                    items: [
                      { _id: newParishEvent._id, type: 'Event', role: '' },
                      {
                        _id: hasLocation.ref._id,
                        type: 'Spatial',
                        role: '',
                      },
                    ],
                    taxonomyTermLabel: `hasLocation`,
                  };
                  await updateReference(hasLocationEventRef);
                }
              }
            }
          }
          if (newParishEvent !== null && dateInfoRecorded !== '') {
            let newDate = dateInfoRecorded.split('-');
            let d = newDate[2],
              m = newDate[1],
              y = newDate[0];
            let startDate = `${d}-${m}-${y}`,
              endDate = null;
            if (dateInfoRecorded === '1704-07-??') {
              startDate = `01-${m}-${y}`;
              endDate = `31-${m}-${y}`;
            }
            const newTemporal = await addDate(startDate, endDate);
            const hasTimeEventRef = {
              items: [
                { _id: newParishEvent._id, type: 'Event', role: '' },
                { _id: newTemporal._id, type: 'Temporal', role: '' },
              ],
              taxonomyTermLabel: `hasTime`,
            };
            await updateReference(hasTimeEventRef);
          }
        }
      }
    }
  };

  const addOrdination = async (
    person,
    dateOfOrdinationParam,
    placeOfOrdinationParam,
    updatedOrdinationBishopParam,
    dioceseOfOrdinationParam
  ) => {
    const dateOfOrdination = dateOfOrdinationParam.trim();
    const placeOfOrdination = placeOfOrdinationParam.trim();
    const updatedOrdinationBishop = updatedOrdinationBishopParam.trim();
    const dioceseOfOrdination = dioceseOfOrdinationParam.trim();

    if (dateOfOrdination !== '') {
      // add the ordination event
      const ordinationType = new TaxonomyTerm({
        labelId: 'hasParticipant',
      });
      await ordinationType.load();
      const ordinationTypeId = ordinationType._id.toString();
      const ordinationEvent = await addEvent('ordination', ordinationTypeId);
      const ordinationEventRef = {
        items: [
          { _id: ordinationEvent._id, type: 'Event', role: '' },
          { _id: person._id, type: 'Person', role: '' },
        ],
        taxonomyTermLabel: 'hasParticipant',
      };
      await updateReference(ordinationEventRef);

      // add the ordination temporal
      const parsedDateOfOrdination = normalizeOrdinationDate(dateOfOrdination);
      const dateOfOrdinationTemporalEntry = await addDate(
        parsedDateOfOrdination.startDate,
        parsedDateOfOrdination.endDate,
        parsedDateOfOrdination.label
      );
      const ordinationEventTemporalRef = {
        items: [
          { _id: ordinationEvent._id, type: 'Event', role: '' },
          {
            _id: dateOfOrdinationTemporalEntry._id,
            type: 'Temporal',
            role: '',
          },
        ],
        taxonomyTermLabel: `hasTime`,
      };
      await updateReference(ordinationEventTemporalRef);

      // add ordination spatial
      if (placeOfOrdination !== '') {
        let location =
          locations.find(
            (l) => l.name.toLowerCase() === placeOfOrdination.toLowerCase()
          ) || null;
        if (location !== null) {
          const dQuery = `MATCH (n:Organisation) WHERE n.label="${location.nameUpdated}" AND ( n.organisationType="${location.type}" OR n.organisationType="" ) RETURN n`;
          const ordinationDiocese = await session
            .writeTransaction((tx) => tx.run(dQuery, {}))
            .then((result) => {
              const records = result.records;
              if (records.length > 0) {
                const record = records[0].toObject();
                const outputRecord = helpers.outputRecord(record.n);
                return outputRecord;
              }
              return null;
            });
          if (ordinationDiocese !== null) {
            // link ordination diocese with event
            let ordinationDioceseRef = {
              items: [
                { _id: ordinationEvent._id, type: 'Event', role: '' },
                {
                  _id: ordinationDiocese._id,
                  type: 'Organisation',
                  role: '',
                },
              ],
              taxonomyTermLabel: `hasRelation`,
            };
            await updateReference(ordinationDioceseRef);
            // link spatial locations
            const spatial = await helpers.loadRelations(
              ordinationDiocese._id,
              'Organisation',
              'Spatial'
            );
            const hasItsEpiscopalSeeIn =
              spatial.find((s) => s.term.label === `hasItsEpiscopalSeeIn`) ||
              null;
            if (hasItsEpiscopalSeeIn !== null) {
              // add episcopal see in ref
              let episcopalSeeInRef = {
                items: [
                  { _id: ordinationEvent._id, type: 'Event', role: '' },
                  {
                    _id: hasItsEpiscopalSeeIn.ref._id,
                    type: 'Spatial',
                    role: '',
                  },
                ],
                taxonomyTermLabel: `hasItsEpiscopalSeeIn`,
              };
              await updateReference(episcopalSeeInRef);
            }
          }
          const sQuery = `MATCH (n:Spatial {label: "${placeOfOrdination.nameUpdated}"}) RETURN n`;
          const ordinationSpatial = await session
            .writeTransaction((tx) => tx.run(sQuery, {}))
            .then((result) => {
              const records = result.records;
              if (records.length > 0) {
                const record = records[0].toObject();
                const outputRecord = helpers.outputRecord(record.n);
                return outputRecord;
              }
              return null;
            });
          if (ordinationSpatial !== null) {
            let ordinationLocationRef = {
              items: [
                { _id: ordinationEvent._id, type: 'Event', role: '' },
                { _id: ordinationSpatial._id, type: 'Spatial', role: '' },
              ],
              taxonomyTermLabel: `hasLocation`,
            };
            await updateReference(ordinationLocationRef);
          }
        }
      }

      // add bishop
      if (updatedOrdinationBishop !== '') {
        const bishop = await addBishop(updatedOrdinationBishop);
        if (bishop !== null) {
          // add bishop diocese
          await addDiocese(bishop, dioceseOfOrdination);

          let bishopTitle = '';
          if (updatedOrdinationBishop.includes('(')) {
            bishopTitle = updatedOrdinationBishop.match(/\(([^)]+)\)/)[1];
            if (bishopTitle !== '') {
              bishopTitle = bishopTitle.trim();
            }
          }

          // add orders relation
          const addOrdersRefLabel = helpers.normalizeLabelId(
            'received holy orders from'
          );
          const addOrdersRef = {
            items: [
              { _id: person._id, type: 'Person', role: '' },
              { _id: bishop._id, type: 'Person', role: '' },
            ],
            taxonomyTermLabel: addOrdersRefLabel,
          };
          await updateReference(addOrdersRef);

          // add orders in event
          const ordainingBishop = helpers.normalizeLabelId('ordaining bishop');
          const ordainingBishopType = new TaxonomyTerm({
            labelId: ordainingBishop,
          });
          await ordainingBishopType.load();
          const ordinationOrdersEventRef = {
            items: [
              { _id: ordinationEvent._id, type: 'Event', role: '' },
              {
                _id: bishop._id,
                type: 'Person',
                role: ordainingBishopType._id,
              },
            ],
            taxonomyTermLabel: `hasParticipant`,
          };
          await updateReference(ordinationOrdersEventRef);
        }
      }
    }
  };

  const addBishop = async (bishopLabel) => {
    let bishopTitle = '';
    let bishopFullTitle = '';
    let bishopPrefix = '';
    let bishopFirstName = '';
    let bishopLastName = '';
    if (bishopLabel.includes('(')) {
      bishopFullTitle = bishopLabel.match(/\(([^)]+)\)/)[0];
      bishopTitle = bishopLabel.match(/\(([^)]+)\)/)[1];
      bishopLabel = bishopLabel.replace(bishopFullTitle, '');
    }
    if (bishopLabel.includes('Dr')) {
      bishopPrefix = 'Dr';
      bishopLabel = bishopLabel.replace(bishopPrefix, '');
      bishopLabel = bishopLabel.trim();
    }
    let parts = bishopLabel.split(' ');
    bishopFirstName = parts[0];
    if (parts.length > 0) {
      for (let p = 0; p < parts.length; p += 1) {
        if (p > 0) {
          if (p > 1) {
            bishopLastName += ' ';
          }
          bishopLastName += parts[p].trim();
        }
      }
    }
    let honorificPrefix = [];
    if (bishopPrefix !== '') {
      honorificPrefix.push(bishopPrefix);
    }
    if (bishopTitle !== '') {
      honorificPrefix.push(helpers.addslashes(bishopTitle));
    }
    bishopFirstName = bishopFirstName.trim();
    bishopLastName = bishopLastName.trim();
    if (bishopFirstName === '' && bishopLastName === '') {
      return null;
    }
    let bishop = {
      firstName: helpers.addslashes(bishopFirstName),
      lastName: helpers.addslashes(bishopLastName),
      status: 'private',
      personType: 'Clergy',
      honorificPrefix: honorificPrefix,
    };
    if (bishop.firstName !== '') {
      bishop.fnameSoundex = helpers.soundex(bishop.firstName);
    }
    if (bishop.lastName !== '') {
      bishop.lnameSoundex = helpers.soundex(bishop.lastName);
    }
    // check if bishop exists
    const todayDate = new Date();
    const dd = String(todayDate.getDate()).padStart(2, '0');
    const mm = String(todayDate.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = todayDate.getFullYear();

    const today = `${yyyy}-${mm}-${dd}`;
    const query = `MATCH (n:Person) WHERE toLower(n.firstName)='${bishop.firstName.toLowerCase()}'
    AND toLower(n.lastName)='${helpers.addslashes(
      bishop.lastName.toLowerCase()
    )}'
    AND date(datetime({epochmillis: apoc.date.parse(n.createdAt,"ms","yyyy-MM-dd")}))=date(datetime({epochmillis: apoc.date.parse('${today}',"ms","yyyy-MM-dd")})) RETURN n ORDER BY n.createdAt DESC LIMIT 25 `;
    let newBishop = await session
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
    if (newBishop !== null) {
      bishop._id = newBishop._id;
      if (bishop.honorificPrefix.length > 0) {
        let dbPrefixes = newBishop.honorificPrefix;
        for (let i = 0; i < bishop.honorificPrefix.length; i += 1) {
          const prefix = bishop.honorificPrefix[i];
          if (dbPrefixes.indexOf(prefix) === -1) {
            dbPrefixes.push(prefix);
          }
        }
        bishop.honorificPrefix = dbPrefixes;
      }
    }
    newBishop = new Person(bishop);
    const bishopSave = await newBishop.save(userId);
    bishop = bishopSave.data;
    return bishop;
  };

  for (let i = 0; i < masterCsv.length; i += 1) {
    let row = masterCsv[i];
    let lastName = row[masterKeys[0]].trim() || '';
    let firstName = row[masterKeys[1]].trim() || '';
    let updatedLastName = row[masterKeys[3]].trim() || '';
    let updatedFirstName = row[masterKeys[5]].trim() || '';
    let placeOfAbode = row[masterKeys[6]].trim() || '';
    let updatedPlaceOfAbode = row[masterKeys[7]].trim() || '';
    let placeOfAbodeType = row[masterKeys[8]].trim() || '';
    let age = row[masterKeys[9]].trim() || '';
    let parish = row[masterKeys[10]].trim() || '';
    let updatedParish = row[masterKeys[11]].trim() || '';
    let diocese = row[masterKeys[12]].trim() || '';
    let dateInfoRecorded = row[masterKeys[13]].trim() || '';
    let dateOfOrdination = row[masterKeys[14]].trim() || '';
    let placeOfOrdination = row[masterKeys[15]].trim() || '';
    // let ordinationBishop = row[masterKeys[17]].trim() || '';
    let updatedOrdinationBishop = row[masterKeys[18]].trim() || '';
    let dioceseOfOrdination = row[masterKeys[19]].trim() || '';
    // let laySureties = row[masterKeys[20]].trim() || '';
    let countyOfAbode = row[masterKeys[21]].trim() || '';
    let dbID = row[masterKeys[24]] || '';
    if (typeof dbID !== 'undefined' && dbID !== '') {
      dbID = dbID.trim();
    }
    console.log(`now processing row: ${i + 1}`);

    // rule 1, 2 skip, 3
    const person = await addPerson(
      firstName,
      lastName,
      updatedFirstName,
      updatedLastName,
      dbID
    );

    // 2. person placeOfAbode
    await personPlaceOfAbode(
      person,
      placeOfAbode,
      placeOfAbodeType,
      updatedPlaceOfAbode,
      diocese,
      countyOfAbode,
      dateInfoRecorded
    );

    // link dioceseOfOrdination with person
    await addDiocese(person, dioceseOfOrdination);

    // 8. add birth event
    await addBirthEvent(person, age);

    // 9. add diocese
    await addDiocese(person, diocese);

    // 10. add parishes
    await addParishes(person, parish, updatedParish, dateInfoRecorded);

    // 10. ordination
    await addOrdination(
      person,
      dateOfOrdination,
      placeOfOrdination,
      updatedOrdinationBishop,
      dioceseOfOrdination
    );
  }

  console.log('ingestion complete');
  session.close();
  // stop executing
  process.exit();
};

if (argv._.includes('parse')) {
  parseCsv();
}
if (argv._.includes('ec1')) {
  ec1();
}
if (argv._.includes('ec2')) {
  ec2();
}
if (argv._.includes('ic')) {
  ingestClasses();
}
if (argv._.includes('duplim')) {
  identifyDuplicatesManual();
}
if (argv._.includes('duplia')) {
  identifyDuplicatesAutomatic();
}
if (argv._.includes('fixa')) {
  fixAutomaticEntries();
}
if (argv._.includes('fixm')) {
  fixManualEntries();
}
if (argv._.includes('rmom')) {
  relateMatOrdMay();
}
if (argv._.includes('rh2')) {
  relateHamell2();
}
if (argv._.includes('1704ep')) {
  extractLocations();
}
if (argv._.includes('1704ls')) {
  extractLaySureties();
}
if (argv._.includes('ed')) {
  exportDioceses();
}
if (argv._.includes('ep')) {
  exportParishes();
}
if (argv._.includes('ingesticp')) {
  ingesticp();
}
if (argv._.includes('icpLocations')) {
  icpLocations();
}
if (argv._.includes('referenceMainICP')) {
  referenceMainICP();
}
if (argv._.includes('syncOT')) {
  syncOrganisationTypes();
}
if (argv._.includes('checkSpatial')) {
  checkSpatial();
}
if (argv._.includes('check1704Locations')) {
  check1704Locations();
}
if (argv._.includes('checkTemporal')) {
  checkTemporal();
}
if (argv._.includes('checkOrdinationDates')) {
  checkOrdinationDates();
}
if (argv._.includes('checkOrdinationLocation')) {
  checkOrdinationLocation();
}
if (argv._.includes('cob')) {
  checkOrdinationBishops();
}
if (argv._.includes('ib')) {
  ingestBishops();
}
if (argv._.includes('ingest1704')) {
  ingest1704();
}
