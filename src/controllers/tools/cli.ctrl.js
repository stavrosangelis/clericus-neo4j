if (process.env.NODE_ENV==="production") {
  require('dotenv').config({path:'../../../.env.production'});
}
else {
  require('dotenv').config({path:'../../../.env.development'});
  const envs = require('dotenv').config({path:'../../../.env.development'});
}
const { spawn } = require("child_process");
const yargs = require('yargs');
const {promisify} = require('util');
const helpers = require("../../helpers");
const csvParser = require('csv-parser');
const driver = require("../../config/db-driver");
const fs = require('fs');
const readFile = promisify(fs.readFile);
const archivePath = process.env.ARCHIVEPATH;

const Resource = require('../resource.ctrl').Resource;
const Person = require('../person.ctrl').Person;
const Organisation = require('../organisation.ctrl').Organisation;
const Taxonomy = require("../taxonomy.ctrl").Taxonomy;
const TaxonomyTerm = require("../taxonomyTerm.ctrl").TaxonomyTerm;
const updateReference = require("../references.ctrl").updateReference;

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
    .command('rmom', 'Relate people related to matriculation and ordination events to maynooth university')
    .command('rh2', 'Relate people added before October 2020 to Hamell 2')
    .command('1704ep', 'Export places from 1704 excel')
    .command('1704ls', 'Export Lay Sureties from 1704 excel')
    .command('ed', 'Export dioceses')
    .command('ingesticp', 'Ingest ICP data')
    .command('icpLocations', 'Fix ICP locations data')
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
        description: 'State if the csv/csvs have headers and they need to be removed',
        type: 'boolean',
    })
    .help('h')
    .alias('help', 'h')
    .argv;
// check if mandatory arguments are present
/*if (!argv.csv && !argv.folder) {
    console.log('You must either provide a path to a csv file or a path to a folder containing csv files.');
    return false;
}*/

if (argv.csv) {
  const exists = fs.existsSync(argv.csv);
  if (!exists) {
    console.log("The path to the csv file is not valid");
    // stop executing
    process.exit();
  }
}

// get admin id
const getAdminId = async() => {
  const session = driver.session();
  var userId = null;
  const userQuery = `MATCH (n:User {email:'admin@test.com'}) return n`;
  let userNode = await session.writeTransaction(tx=>tx.run(userQuery,{}))
  .then(result=> {
    let records = result.records;
    if (records.length>0) {
      let record = records[0];
      let user = record.toObject().n;
      user = helpers.outputRecord(user);
      return user;
    }
    return null;
  });
  session.close();
  return userNode._id;;
}

const parseCsv = async()=>{
  const userId = await getAdminId();
  const path = argv.csv;

  const headers = ['Organisation','Organisation type','Cathedral city','Corrected organisation label'];

  var csv = await new Promise((resolve,reject)=>{
    let results = [];
    fs.createReadStream(path)
    .pipe(csvParser(headers))
    .on('data', (data) => results.push(data))
    .on('end', () => {
      resolve(results);
    });
  });
  if (argv.csvh) {
    csv.splice(0,1)
  }
  console.log(csv)
  // stop executing
  process.exit();
}

const ec1 = async()=>{
  const path =`${archivePath}documents/hamell-correction/manual-entries.csv`;
  const headers = ['Surname','First Name','Diocese','Entered','Ordained','Class','Address','Alternate Surname','Alternate First Name','Comment'];

  var csv = await new Promise((resolve,reject)=>{
    let results = [];
    fs.createReadStream(path)
    .pipe(csvParser(headers))
    .on('data', (data) => results.push(data))
    .on('end', () => {
      resolve(results);
    });
  });
  if (argv.csvh) {
    csv.splice(0,1)
  }
  var newCsv = [];
  for (let rowKey in csv) {
    let row = csv[rowKey];
    let rowKeys = Object.keys(row);
    let newClass = row[rowKeys[5]].trim();
    if (newClass!=="" && newCsv.indexOf(newClass)===-1) {
      newCsv.push(newClass);
    }
  }
  let csvPath = `${archivePath}documents/hamell-correction/manual-entries-classes.csv`;
  let csvText = newCsv.join("\n");
  let writeFile = await new Promise ((resolve,reject)=> {
    fs.writeFile(csvPath, csvText, 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        csvStatus = true;
        resolve(true);
      }
    });
  });
  // stop executing
  process.exit();
}

const ec2 = async()=>{
  const path =`${archivePath}documents/hamell-correction/automatic-entries.csv`;
  const headers = ['Surname','First Name','Diocese','Entered','Ordained','Class','Address','Alternate Surname','Alternate First Name','Comment'];

  var csv = await new Promise((resolve,reject)=>{
    let results = [];
    fs.createReadStream(path)
    .pipe(csvParser(headers))
    .on('data', (data) => results.push(data))
    .on('end', () => {
      resolve(results);
    });
  });
  if (argv.csvh) {
    csv.splice(0,1)
  }
  var newCsv = [];
  for (let rowKey in csv) {
    let row = csv[rowKey];
    let rowKeys = Object.keys(row);
    let newClass = row[rowKeys[5]].trim();
    if (newClass!=="" && newCsv.indexOf(newClass)===-1) {
      newCsv.push(newClass);
    }
  }
  let csvPath = `${archivePath}documents/hamell-correction/automatic-entries-classes.csv`;
  let csvText = newCsv.join("\n");
  let writeFile = await new Promise ((resolve,reject)=> {
    fs.writeFile(csvPath, csvText, 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        csvStatus = true;
        resolve(true);
      }
    });
  });
  // stop executing
  process.exit();
}

const ingestClasses = async()=>{
  const userId = await getAdminId();
  const mcTaxonomy = new Taxonomy({systemType:"matriculationClass"});
  await mcTaxonomy.load();

  let newClasses = [];
  // classes csv 1
  const ec1Path =`${archivePath}documents/hamell-correction/manual-entries-classes.csv`;
  var c1 = await new Promise((resolve,reject)=>{
    let results = [];
    fs.createReadStream(ec1Path)
    .pipe(csvParser())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      resolve(results);
    });
  });
  //c1.splice(0,1);
  for (let ck in c1) {
    let row = c1[ck];
    let rowKeys = Object.keys(row);
    let rowClass = row[rowKeys[0]].trim();
    let rowDBClass = row[rowKeys[1]].trim();
    let rowDBClassAlt = row[rowKeys[2]].trim();
    if (rowDBClass!=="" && newClasses.indexOf(rowDBClass)===-1) {
      newClasses.push(rowDBClass);
    }
  }
  // classes csv 2
  const ec2Path =`${archivePath}documents/hamell-correction/automatic-entries-classes.csv`;
  var c2 = await new Promise((resolve,reject)=>{
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
    let rowClass = row[rowKeys[0]].trim();
    let rowDBClass = row[rowKeys[1]].trim();
    let rowDBClassAlt = row[rowKeys[2]].trim();
    if (rowDBClass!=="" && newClasses.indexOf(rowDBClass)===-1) {
      newClasses.push(rowDBClass);
    }
  }
  newClasses.sort();

  let nonDBClasses = [];
  for (let ck in newClasses) {
    let className = newClasses[ck];
    let session = driver.session()
    let query = `MATCH (n:TaxonomyTerm) WHERE n.label="${className}" return n`;
    let node = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      session.close();
      let records = result.records;
      if (records.length>0) {
        let record = records[0].toObject();
        let outputRecord = helpers.outputRecord(record.n);
        return outputRecord;
      }
      return null;
    });
    //console.log(node)
    if (node===null) {
      nonDBClasses.push(className)
    }
  }
  for (let i in nonDBClasses) {
    let newLabel = nonDBClasses[i];
    // add new taxonomy to the db
    let newDBClass = new TaxonomyTerm({label:newLabel,inverseLabel:newLabel});
    let newDBClassData = await newDBClass.save(userId);
    // add reference to matriculation class taxonomy
    let newRef = {
      items: [
        {_id:newDBClassData.data._id, type: "TaxonomyTerm", role: ""},
        {_id:mcTaxonomy._id, type: "Taxonomy", role: ""},
      ],
      taxonomyTermLabel: "isChildOf"
    };
    let addRef = await updateReference(newRef);
  }
  // stop executing
  process.exit();

}

const getStartDate = (date) => {
  if (date==="") {
    return "";
  }
  let dateArr = date.split("/");
  if (!date.includes("/")) {
    date = `01-01-${date}`
  }
  else {
    date = date.replace(/\//g,"-");
  }
  return date;
}

const identifyDuplicatesManual = async() => {
  const classesCsv = `${archivePath}documents/hamell-correction/manual-entries-classes.csv`;
  var classesData = await new Promise((resolve,reject)=>{
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
    let newAltValue = row[rowKeys[2]] || "";
    if (newValue!=="") {
      classes.push({key:newKey,value:newValue.trim(),altValue:newAltValue})
    }
  }
  const csvPath =`${archivePath}documents/hamell-correction/manual-entries.csv`;
  const session = driver.session();

  // load c1
  var csv = await new Promise((resolve,reject)=>{
    let results = [];
    fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      resolve(results);
    });
  });
  csv.splice(0,1);
  let newCsv = [];
  let missingCsv = [];
  // loop over c1
  for (let ck in csv) {
    if (DEBUG) {
      if (Number(ck)<6) {
        continue;
      }
      if (Number(ck)>6) {
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

    let qpAttributes = "";
    if (fname!=="") {
      qpAttributes = `toLower(n.firstName)=~toLower(".*${helpers.addslashes(fname)}.*")`;
      if (lname!=="") {
        qpAttributes +=" AND ";
      }
    }
    if (lname!=="") {
      qpAttributes += `toLower(n.lastName)=~toLower(".*${helpers.addslashes(lname)}.*")`;
    }

    let dioceseQuery = "";
    if (diocese!=="") {
      let dioceseQueryTerm = diocese;
      if (diocese==="Down and Connor") {
        dioceseQueryTerm = "Down";
      }
      if (diocese==="Cork and Ross") {
        dioceseQueryTerm = "Cork";
      }
      dioceseQuery = `-[r:hasAffiliation]-(t:Organisation)`
      if (diocese!==dioceseQueryTerm) {
        qpAttributes += `AND (toLower(t.label)=~toLower(".*${helpers.addslashes(dioceseQueryTerm)}.*") OR toLower(t.label)=~toLower(".*${helpers.addslashes(diocese)}.*"))`;
      }
      else {
        qpAttributes += `AND toLower(t.label)=~toLower(".*${helpers.addslashes(dioceseQueryTerm)}.*")`;
      }
    }
    if (qpAttributes!=="") {
      qpAttributes = `WHERE ${qpAttributes}`
    }
    let queryPerson = `match (n:Person)${dioceseQuery} ${qpAttributes}`;
    queryPerson +=` return n`;
    if (DEBUG) {
      console.log(queryPerson)
    }
    let queryPromise = await session.writeTransaction(tx=>tx.run(queryPerson,{}))
    .then(result=> {
      return result.records;
    });
    let people = helpers.normalizeRecordsOutput(queryPromise);
    let person = null;
    if (people.length===1) {
      person = people[0];
    }
    else {
      if (DEBUG) {
        console.log(`alternatives`,alLName, alFName)
      }
      if (alLName!=="" && alFName!=="") {
        people = people.filter(person=>{
          for (let ap in person.alternateAppelations) {
            let alternateAppelation = person.alternateAppelations[ap];
            let alFirstName="";
            let alLastName="";

            let parsed = JSON.parse(alternateAppelation);
            alFirstName = parsed.firstName;
            alLastName = parsed.lastName;

            if (alLName.trim().toLowerCase()===alLastName.trim().toLowerCase() && alFName.trim().toLowerCase()===alFirstName.trim().toLowerCase()) {
              return true;
            }
          }
          return false;
        });
        if (people.length===1) {
          person = people[0];
        }
        else {
          for (let i in people) {
            let p = people[i];
            if(personClass.trim()==="") {
              continue;
            }
            let findPersonClassQT = classes.find(c=>c.key===personClass.trim());
            if (typeof findPersonClassQT==="undefined") {
              console.log(`${personClass.trim()}`)
              continue;
            }
            let personClassQT = findPersonClassQT.altValue;
            if (personClassQT==="") {
              personClassQT = findPersonClassQT.value;
            }
            if (typeof personClassQT==="undefined") {
              continue;
            }
            let eventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE n.label="Matriculation into ${personClassQT}" AND id(t)=${p._id} RETURN n`;
            if (DEBUG) {
            console.log('\n')
              console.log(personClass.trim())
              console.log(personClassQT)
              console.log(eventQuery)
              console.log('\n')
            }
            let eventPromise = await session.writeTransaction(tx=>tx.run(eventQuery,{}))
            .then(result=> {
              let records = result.records;
              if (records.length>0) {
                let record = records[0];
                let newEvent = record.toObject().n;
                newEvent = helpers.outputRecord(newEvent);
                return newEvent;
              }
              return null;
            });
            if (eventPromise===null) {
              continue;
            }
            else {
              person = p;
            }
          }
        }
      }
      else {
        people = people.filter(person=>{
          if (typeof person.alternateAppelations==="undefined" || person.alternateAppelations.length===0) {
            return true;
          }
          return false;
        });
        if (people.length===1) {
          person = people[0];
        }
        else {
          for (let i in people) {
            let p = people[i];
            if(personClass.trim()==="") {
              continue;
            }
            let findPersonClassQT = classes.find(c=>c.key===personClass.trim());
            if (typeof findPersonClassQT==="undefined") {
              console.log(`${personClass.trim()}`)
              continue;
            }
            let personClassQT = findPersonClassQT.altValue;
            if (personClassQT==="") {
              personClassQT = findPersonClassQT.value;
            }
            if (typeof personClassQT==="undefined") {
              continue;
            }
            let eventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE n.label="Matriculation into ${personClassQT}" AND id(t)=${p._id} RETURN n`;
            if (DEBUG) {
            console.log('\n')
              console.log(personClass.trim())
              console.log(personClassQT)
              console.log(eventQuery)
              console.log('\n')
            }
            let eventPromise = await session.writeTransaction(tx=>tx.run(eventQuery,{}))
            .then(result=> {
              let records = result.records;
              if (records.length>0) {
                let record = records[0];
                let newEvent = record.toObject().n;
                newEvent = helpers.outputRecord(newEvent);
                return newEvent;
              }
              return null;
            });
            if (eventPromise===null) {
              continue;
            }
            else {
              person = p;
            }
          }
        }
      }
    }
    if (person!==null) {
      existingPersonRow += `,${person._id}`;
      newCsv.push(existingPersonRow);
    }
    else {
      // load people by last name and check the altername first name
      let queryAlPerson = `match (n:Person) WHERE toLower(n.lastName)=toLower("${helpers.addslashes(lname)}") return n`;
      let queryAlPromise = await session.writeTransaction(tx=>tx.run(queryAlPerson,{}))
      .then(result=> {
        return result.records;
      });
      let people = helpers.normalizeRecordsOutput(queryPromise);
      let newPerson = people.find(person=>{
        let alternateAppelation = null;
        let alFirstName="";
        for (let ap in person.alternateAppelations) {
          let alternateAppelation = person.alternateAppelations[ap];
          let parsed = JSON.parse(person.alternateAppelations[0]);
          alFirstName = parsed.firstName;
          if (fname.trim().toLowerCase()===alFirstName.trim().toLowerCase()) {
            return true;
          }
        }
        return false;
      });
      let consoleOut = newPerson;
      if (typeof consoleOut==="undefined") {
        consoleOut = `${fname.trim()} ${lname.trim()}`
      }
      console.log(ck, consoleOut)
      if (typeof newPerson!=="undefined") {
        existingPersonRow += `,${newPerson._id}`;
        newCsv.push(existingPersonRow);
      }
      else {
        missingCsv.push(existingPersonRow);
      }
    }

  }
  const csvDuplicatesPath =`${archivePath}documents/hamell-correction/manual-entries-duplicates.csv`;
  let headers = `"Surname","First Name","Diocese","Entered","Ordained","Class","Address","Alternate Surname","Alternate First Name","Comment","DB ID"`;
  newCsv.unshift(headers);
  let csvText = newCsv.join("\n");
  let writeFile = await new Promise ((resolve,reject)=> {
    fs.writeFile(csvDuplicatesPath, `\ufeff`+csvText, 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        csvStatus = true;
        resolve(true);
      }
    });
  });
  const missingCsvPath =`${archivePath}documents/hamell-correction/manual-entries-missing.csv`;
  let missingCsvHeaders = `"Surname","First Name","Diocese","Entered","Ordained","Class","Address","Alternate Surname","Alternate First Name","Comment"`;
  missingCsv.unshift(missingCsvHeaders);
  let missingCsvText = missingCsv.join("\n");
  let writeMissingCsvFile = await new Promise ((resolve,reject)=> {
    fs.writeFile(missingCsvPath, `\ufeff`+missingCsvText, 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        csvStatus = true;
        resolve(true);
      }
    });
  });
  session.close();
  console.log("--- completed ---")
  // stop executing
  process.exit();

}

const identifyDuplicatesAutomatic = async() => {
  const classesCsv = `${archivePath}documents/hamell-correction/automatic-entries-classes.csv`;
  var classesData = await new Promise((resolve,reject)=>{
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
    let newAltValue = row[rowKeys[2]] || "";
    if (newValue!=="") {
      classes.push({key:newKey,value:newValue.trim(),altValue:newAltValue})
    }
  }
  const csvPath =`${archivePath}documents/hamell-correction/automatic-entries.csv`;
  const session = driver.session();

  // load c1
  var csv = await new Promise((resolve,reject)=>{
    let results = [];
    fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      resolve(results);
    });
  });
  csv.splice(0,1);
  let newCsv = [];
  let missingCsv = [];
  // loop over c1
  for (let ck in csv) {
    if (DEBUG) {
      if (Number(ck)<6) {
        continue;
      }
      if (Number(ck)>6) {
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

    let qpAttributes = "";
    if (fname!=="") {
      qpAttributes = `toLower(n.firstName)=~toLower(".*${helpers.addslashes(fname)}.*")`;
      if (lname!=="") {
        qpAttributes +=" AND ";
      }
    }
    if (lname!=="") {
      qpAttributes += `toLower(n.lastName)=~toLower(".*${helpers.addslashes(lname)}.*")`;
    }

    let dioceseQuery = "";
    if (diocese!=="") {
      let dioceseQueryTerm = diocese;
      if (diocese==="Down and Connor") {
        dioceseQueryTerm = "Down";
      }
      if (diocese==="Cork and Ross") {
        dioceseQueryTerm = "Cork";
      }
      dioceseQuery = `-[r:hasAffiliation]-(t:Organisation)`
      if (diocese!==dioceseQueryTerm) {
        qpAttributes += `AND (toLower(t.label)=~toLower(".*${helpers.addslashes(dioceseQueryTerm)}.*") OR toLower(t.label)=~toLower(".*${helpers.addslashes(diocese)}.*"))`;
      }
      else {
        qpAttributes += `AND toLower(t.label)=~toLower(".*${helpers.addslashes(dioceseQueryTerm)}.*")`;
      }
    }
    if (qpAttributes!=="") {
      qpAttributes = `WHERE ${qpAttributes}`
    }
    let queryPerson = `match (n:Person)${dioceseQuery} ${qpAttributes}`;
    queryPerson +=` return n`;
    if (DEBUG) {
      console.log(queryPerson)
    }

    let queryPromise = await session.writeTransaction(tx=>tx.run(queryPerson,{}))
    .then(result=> {
      return result.records;
    });
    let people = helpers.normalizeRecordsOutput(queryPromise);
    let person = null;
    if (people.length===1) {
      person = people[0];
    }
    else {
      if (DEBUG) {
        console.log(`alternatives`,alLName, alFName)
      }
      if (alLName!=="" && alFName!=="") {
        people = people.filter(person=>{
          for (let ap in person.alternateAppelations) {
            let alternateAppelation = person.alternateAppelations[ap];
            let alFirstName="";
            let alLastName="";

            let parsed = JSON.parse(alternateAppelation);
            alFirstName = parsed.firstName;
            alLastName = parsed.lastName;

            if (alLName.trim().toLowerCase()===alLastName.trim().toLowerCase() && alFName.trim().toLowerCase()===alFirstName.trim().toLowerCase()) {
              return true;
            }
          }
          return false;
        });
        if (people.length===1) {
          person = people[0];
        }
        else {
          for (let i in people) {
            let p = people[i];
            if(personClass.trim()==="") {
              continue;
            }
            let findPersonClassQT = classes.find(c=>c.key===personClass.trim());
            if (typeof findPersonClassQT==="undefined") {
              console.log(`${personClass.trim()}`)
              continue;
            }
            let personClassQT = findPersonClassQT.altValue;
            if (personClassQT==="") {
              personClassQT = findPersonClassQT.value;
            }
            if (typeof personClassQT==="undefined") {
              continue;
            }
            let eventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE n.label="Matriculation into ${personClassQT}" AND id(t)=${p._id} RETURN n`;
            if (DEBUG) {
            console.log('\n')
              console.log(personClass.trim())
              console.log(personClassQT)
              console.log(eventQuery)
              console.log('\n')
            }
            let eventPromise = await session.writeTransaction(tx=>tx.run(eventQuery,{}))
            .then(result=> {
              let records = result.records;
              if (records.length>0) {
                let record = records[0];
                let newEvent = record.toObject().n;
                newEvent = helpers.outputRecord(newEvent);
                return newEvent;
              }
              return null;
            });
            if (eventPromise===null) {
              continue;
            }
            else {
              person = p;
            }
          }
        }
      }
      else {
        people = people.filter(person=>{
          if (typeof person.alternateAppelations==="undefined" || person.alternateAppelations.length===0) {
            return true;
          }
          return false;
        });
        if (people.length===1) {
          person = people[0];
        }
        else {
          for (let i in people) {
            let p = people[i];
            if(personClass.trim()==="") {
              continue;
            }
            let findPersonClassQT = classes.find(c=>c.key===personClass.trim());
            if (typeof findPersonClassQT==="undefined") {
              console.log(`${personClass.trim()}`)
              continue;
            }
            let personClassQT = findPersonClassQT.altValue;
            if (personClassQT==="") {
              personClassQT = findPersonClassQT.value;
            }
            if (typeof personClassQT==="undefined") {
              continue;
            }
            let eventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE n.label="Matriculation into ${personClassQT}" AND id(t)=${p._id} RETURN n`;
            if (DEBUG) {
            console.log('\n')
              console.log(personClass.trim())
              console.log(personClassQT)
              console.log(eventQuery)
              console.log('\n')
            }
            let eventPromise = await session.writeTransaction(tx=>tx.run(eventQuery,{}))
            .then(result=> {
              let records = result.records;
              if (records.length>0) {
                let record = records[0];
                let newEvent = record.toObject().n;
                newEvent = helpers.outputRecord(newEvent);
                return newEvent;
              }
              return null;
            });
            if (eventPromise===null) {
              continue;
            }
            else {
              person = p;
            }
          }
        }
      }
    }
    if (person!==null) {
      existingPersonRow += `,${person._id}`;
      newCsv.push(existingPersonRow);
    }
    else {
      // load people by last name and check the altername first name
      let queryAlPerson = `match (n:Person) WHERE toLower(n.lastName)=toLower("${helpers.addslashes(lname)}") return n`;
      let queryAlPromise = await session.writeTransaction(tx=>tx.run(queryAlPerson,{}))
      .then(result=> {
        return result.records;
      });
      let people = helpers.normalizeRecordsOutput(queryPromise);
      let newPerson = people.find(person=>{
        let alternateAppelation = null;
        let alFirstName="";
        for (let ap in person.alternateAppelations) {
          let alternateAppelation = person.alternateAppelations[ap];
          let parsed = JSON.parse(person.alternateAppelations[0]);
          alFirstName = parsed.firstName;
          if (fname.trim().toLowerCase()===alFirstName.trim().toLowerCase()) {
            return true;
          }
        }
        return false;
      });
      let consoleOut = newPerson;
      if (typeof consoleOut==="undefined") {
        consoleOut = `${fname.trim()} ${lname.trim()}`
      }
      console.log(ck, consoleOut)
      if (typeof newPerson!=="undefined") {
        existingPersonRow += `,${newPerson._id}`;
        newCsv.push(existingPersonRow);
      }
      else {
        missingCsv.push(existingPersonRow);
      }
    }

  }
  const csvDuplicatesPath =`${archivePath}documents/hamell-correction/automatic-entries-duplicates.csv`;
  let headers = `"Surname","First Name","Diocese","Entered","Ordained","Class","Address","Alternate Surname","Alternate First Name","Comment","DB ID"`;
  newCsv.unshift(headers);
  let csvText = newCsv.join("\n");
  let writeFile = await new Promise ((resolve,reject)=> {
    fs.writeFile(csvDuplicatesPath, `\ufeff`+csvText, 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        csvStatus = true;
        resolve(true);
      }
    });
  });
  const missingCsvPath =`${archivePath}documents/hamell-correction/automatic-entries-missing.csv`;
  let missingCsvHeaders = `"Surname","First Name","Diocese","Entered","Ordained","Class","Address","Alternate Surname","Alternate First Name","Comment"`;
  missingCsv.unshift(missingCsvHeaders);
  let missingCsvText = missingCsv.join("\n");
  let writeMissingCsvFile = await new Promise ((resolve,reject)=> {
    fs.writeFile(missingCsvPath, `\ufeff`+missingCsvText, 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        csvStatus = true;
        resolve(true);
      }
    });
  });
  session.close();
  console.log("--- completed ---")
  // stop executing
  process.exit();

}

const fixAutomaticEntries = async() => {
  const session = driver.session();
  // 1. load classes
  const classesCsv = `${archivePath}documents/hamell-correction/automatic-entries-classes.csv`;
  var classesData = await new Promise((resolve,reject)=>{
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
    let newAltValue = row[rowKeys[2]] || "";
    if (newValue!=="") {
      classes.push({key:newKey,value:newValue.trim(),altValue:newAltValue})
    }
  }

  // 2. load db matriculation classes
  let mct = new Taxonomy({systemType:"matriculationClass"});
  await mct.load();
  let mctq = `MATCH (t:Taxonomy) WHERE id(t)=${mct._id} MATCH (n:TaxonomyTerm)-[r:isChildOf]->(t) RETURN n ORDER BY n.label`;
  let mctPromise = await session.writeTransaction(tx=>tx.run(mctq,{}))
  .then(result=> {
    return result.records;
  });
  let matriculationClasses = helpers.normalizeRecordsOutput(mctPromise, "n");

  // 4. load people from csv
  const csvPath =`${archivePath}documents/hamell-correction/automatic-entries-dbids.csv`;
  var csv = await new Promise((resolve,reject)=>{
    let results = [];
    fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      resolve(results);
    });
  });
  csv.splice(0,1);

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
    if (dbId==="" || personClass==="") {
      continue;
    }
    // 3.1 load person's matriculation event
    let findPersonClassQT = classes.find(c=>c.key===personClass);
    if (typeof findPersonClassQT==="undefined") {
      continue;
    }
    let personClassQK = findPersonClassQT.key;
    let personClassQK2 = null;
    let personClassQK3 = null;
    if (personClassQK.includes("1") && !personClassQK.includes("1st")) {
      personClassQK2 = personClassQK.replace("1","1st");
    }
    if (personClassQK.includes("2") && !personClassQK.includes("2nd")) {
      personClassQK2 = personClassQK.replace("2","2nd");
    }
    if (personClassQK.includes("3") && !personClassQK.includes("3rd")) {
      personClassQK3 = personClassQK.replace("3","3rd");
    }
    let personClassQT = findPersonClassQT.altValue;
    if (personClassQT==="") {
      personClassQT = findPersonClassQT.value;
    }
    let matchLabel = `n.label="Matriculation into ${personClassQT}" OR n.label="Matriculation into ${personClassQK}"`;
    if (personClassQK2!==null) {
      matchLabel += ` OR n.label="Matriculation into ${personClassQK2}"`;
    }
    if (personClassQK3!==null) {
      matchLabel += ` OR n.label="Matriculation into ${personClassQK3}"`;
    }
    let eventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE (${matchLabel}) AND id(t)=${dbId} RETURN n`;
    let newEvent = await session.writeTransaction(tx=>tx.run(eventQuery,{}))
    .then(result=> {
      let records = result.records;
      if (records.length>0) {
        let record = records[0];
        let newEvent = record.toObject().n;
        newEvent = helpers.outputRecord(newEvent);
        return newEvent;
      }
      return null;
    });
    // if we cannot locate the new event then we add this entry to a new list to manually check at a later point and skip the row
    if (newEvent===null) {
      // if no db match check if original event exists and set matriculation class role
      let matClass = matriculationClasses.find(m=>m.label===findPersonClassQT.value);

      let newLabel = `Matriculation into ${matClass.label}`;
      let meq = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE n.label="${newLabel}" AND id(t)=${dbId} SET r.role="${matClass._id}" RETURN n`;
      let existingEvent = await session.writeTransaction(tx=>tx.run(meq,{}))
      .then(result=> {
        let records = result.records;
        let output = {error: ["The record cannot be updated"], status: false, data: []};
        if (records.length>0) {
          let record = records[0];
          let key = record.keys[0];
          let resultRecord = record.toObject()[key];
          resultRecord = helpers.outputRecord(resultRecord);
          return resultRecord;
        }
        return null;
      });
      if (existingEvent===null) {
        noEventMatch.push(`"${lname}","${fname}","${diocese}","${entered}","${ordained}","${personClass}","${address}","${alLName}","${alFName}","${comment}","${dbId}"`);
      }
      continue;
    }

    // 3.2 match matriculation class with db matriculation class
    let matClass = matriculationClasses.find(m=>m.label===findPersonClassQT.value);
    let newLabel = `Matriculation into ${matClass.label}`;

    // 3.3 update event label and relationship role
    let updateEventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE (${matchLabel}) AND id(t)=${dbId} SET n.label="${newLabel}", r.role="${matClass._id}" RETURN n`;
    let updateEvent = await session.writeTransaction(tx=>tx.run(updateEventQuery,{}))
    .then(result=> {
      return true;
    });
    console.log(`${dbId} success`);
  }
  const noEventMatchPath =`${archivePath}documents/hamell-correction/automatic-entries-no-event-match.csv`;
  let headers = `"Surname","First Name","Diocese","Entered","Ordained","Class","Address","Alternate Surname","Alternate First Name","Comment","DB ID"`;
  noEventMatch.unshift(headers);
  let csvText = noEventMatch.join("\n");
  let writeFile = await new Promise ((resolve,reject)=> {
    fs.writeFile(noEventMatchPath, `\ufeff`+csvText, 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        csvStatus = true;
        resolve(true);
      }
    });
  });
  session.close();
  // stop executing
  process.exit();
}

const fixManualEntries = async() => {
  const session = driver.session();
  const classesCsv = `${archivePath}documents/hamell-correction/manual-entries-classes.csv`;
  var classesData = await new Promise((resolve,reject)=>{
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
    let newAltValue = row[rowKeys[2]] || "";
    if (newValue!=="") {
      classes.push({key:newKey,value:newValue.trim(),altValue:newAltValue})
    }
  }

  // 2. load db matriculation classes
  let mct = new Taxonomy({systemType:"matriculationClass"});
  await mct.load();
  let mctq = `MATCH (t:Taxonomy) WHERE id(t)=${mct._id} MATCH (n:TaxonomyTerm)-[r:isChildOf]->(t) RETURN n ORDER BY n.label`;
  let mctPromise = await session.writeTransaction(tx=>tx.run(mctq,{}))
  .then(result=> {
    return result.records;
  });
  let matriculationClasses = helpers.normalizeRecordsOutput(mctPromise, "n");

  // 4. load people from csv
  const csvPath =`${archivePath}documents/hamell-correction/manual-entries-dbids.csv`;
  var csv = await new Promise((resolve,reject)=>{
    let results = [];
    fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      resolve(results);
    });
  });
  csv.splice(0,1);
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
    if (dbId==="" || personClass==="") {
      continue;
    }
    // 3.1 load person's matriculation event
    let findPersonClassQT = classes.find(c=>c.key===personClass);
    if (typeof findPersonClassQT==="undefined") {
      continue;
    }
    let personClassQK = findPersonClassQT.key;
    let personClassQK2 = null;
    let personClassQK3 = null;
    if (personClassQK.includes("1") && !personClassQK.includes("1st")) {
      personClassQK2 = personClassQK.replace("1","1st");
    }
    if (personClassQK.includes("2") && !personClassQK.includes("2nd")) {
      personClassQK2 = personClassQK.replace("2","2nd");
    }
    if (personClassQK.includes("3") && !personClassQK.includes("3rd")) {
      personClassQK3 = personClassQK.replace("3","3rd");
    }
    let personClassQT = findPersonClassQT.altValue;
    if (personClassQT==="") {
      personClassQT = findPersonClassQT.value;
    }
    let matchLabel = `n.label="Matriculation into ${personClassQT}" OR n.label="Matriculation into ${personClassQK}"`;
    if (personClassQK2!==null) {
      matchLabel += ` OR n.label="Matriculation into ${personClassQK2}"`;
    }
    if (personClassQK3!==null) {
      matchLabel += ` OR n.label="Matriculation into ${personClassQK3}"`;
    }
    let eventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE (${matchLabel}) AND id(t)=${dbId} RETURN n`;
    let newEvent = await session.writeTransaction(tx=>tx.run(eventQuery,{}))
    .then(result=> {
      let records = result.records;
      if (records.length>0) {
        let record = records[0];
        let newEvent = record.toObject().n;
        newEvent = helpers.outputRecord(newEvent);
        return newEvent;
      }
      return null;
    });
    // if we cannot locate the new event then we add this entry to a new list to manually check at a later point and skip the row
    if (newEvent===null) {
      // if no db match check if original event exists and set matriculation class role
      let matClass = matriculationClasses.find(m=>m.label===findPersonClassQT.value);

      let newLabel = `Matriculation into ${matClass.label}`;
      let meq = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE n.label="${newLabel}" AND id(t)=${dbId} SET r.role="${matClass._id}" RETURN n`;
      let existingEvent = await session.writeTransaction(tx=>tx.run(meq,{}))
      .then(result=> {
        let records = result.records;
        let output = {error: ["The record cannot be updated"], status: false, data: []};
        if (records.length>0) {
          let record = records[0];
          let key = record.keys[0];
          let resultRecord = record.toObject()[key];
          resultRecord = helpers.outputRecord(resultRecord);
          return resultRecord;
        }
        return null;
      });
      if (existingEvent===null) {
        noEventMatch.push(`"${lname}","${fname}","${diocese}","${entered}","${ordained}","${personClass}","${address}","${alLName}","${alFName}","${comment}","${dbId}"`);
      }
      continue;
    }

    // 3.2 match matriculation class with db matriculation class
    let matClass = matriculationClasses.find(m=>m.label===findPersonClassQT.value);
    let newLabel = `Matriculation into ${matClass.label}`;

    // 3.3 update event label and relationship role
    let updateEventQuery = `MATCH (n:Event)-[r:hasParticipant]-(t:Person) WHERE (${matchLabel}) AND id(t)=${dbId} SET n.label="${newLabel}", r.role="${matClass._id}" RETURN n`;
    let updateEvent = await session.writeTransaction(tx=>tx.run(updateEventQuery,{}))
    .then(result=> {
      return true;
    });

    console.log(`${dbId} success`);
  }
  const noEventMatchPath =`${archivePath}documents/hamell-correction/manual-entries-no-event-match.csv`;
  let headers = `"Surname","First Name","Diocese","Entered","Ordained","Class","Address","Alternate Surname","Alternate First Name","Comment","DB ID"`;
  noEventMatch.unshift(headers);
  let csvText = noEventMatch.join("\n");
  let writeFile = await new Promise ((resolve,reject)=> {
    fs.writeFile(noEventMatchPath, `\ufeff`+csvText, 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        csvStatus = true;
        resolve(true);
      }
    });
  });
  session.close();
  // stop executing
  process.exit();
}

const relateMatOrdMay = async() => {
  const session = driver.session();
  // load spcm organisation
  let orgQuery = `MATCH (n:Organisation {label:"Saint Patrick\'s College Maynooth (SPCM)"}) RETURN n`;
  let organisation = await session.writeTransaction(tx=>tx.run(orgQuery,{}))
  .then(result=> {
    let records = result.records;
    if (records.length>0) {
      let record = records[0];
      let orgRecord = record.toObject().n;
      let org = helpers.outputRecord(orgRecord);
      return org;
    }
    return null;
  }).catch((error) => {
    console.log(error)
  });

  // load people
  let query = `MATCH (n:Person)-[r]->(e:Event) WHERE e.eventType="529" OR e.eventType="12035" return distinct n`
  let transaction = await session.writeTransaction(tx=>tx.run(query,{}))
  .then(result=> {
    return result.records;
  }).catch((error) => {
    console.log(error)
  });
  let people = helpers.normalizeRecordsOutput(transaction);
  session.close();

  for (let i=0;i<people.length; i++) {
    let person = people[i];
    let newRef = {
      items: [
        {_id:person._id, type: "Person", role: ""},
        {_id:organisation._id, type: "Organisation", role: ""},
      ],
      taxonomyTermLabel: "wasStudentOf"
    };
    let addRef = await updateReference(newRef);
  }

  console.log(`Update complete`);
  // stop executing
  process.exit();
}

const relateHamell2 = async() => {
  const session = driver.session();

  // load classpieces
  let classpieceSystemType = new TaxonomyTerm({"labelId":"Classpiece"});
  await classpieceSystemType.load();

  let classpiecesQuery = `MATCH (n:Resource {status:'public', systemType:'${classpieceSystemType._id}'}) RETURN distinct n ORDER BY n.label`;
  let classpiecesPromise = await session.writeTransaction(tx=>tx.run(classpiecesQuery,{}))
  .then(result=> {
    return result.records;
  });
  let classpieces = helpers.normalizeRecordsOutput(classpiecesPromise, "n");
  let classpiecesPeople = [];
  for (let c=0;c<classpieces.length; c++) {
    let cp = classpieces[c];
    if (!isNaN(Number(cp.label)) && Number(cp.label)>2002) {
      let newPeopleRef = await helpers.loadRelations(cp._id, "Resource", "Person", true, "depicts");
      for (let i=0;i<newPeopleRef.length;i++) {
        let p = newPeopleRef[i];
        classpiecesPeople.push(p.ref._id);
      }
    }
  }
  // load spcm organisation
  let hamellQuery = `MATCH (n:Resource {label:"Hamell 2"}) RETURN n`;
  let hamell2 = await session.writeTransaction(tx=>tx.run(hamellQuery,{}))
  .then(result=> {
    let records = result.records;
    if (records.length>0) {
      let record = records[0];
      let orgRecord = record.toObject().n;
      let org = helpers.outputRecord(orgRecord);
      return org;
    }
    return null;
  }).catch((error) => {
    console.log(error)
  });
  if (hamell2===null) {
    console.log(`Hamell 2 not found.`);
    // stop executing
    process.exit();
    return false;
  }
  // load people
  let query = `MATCH (n:Person) WHERE date(datetime({epochmillis: apoc.date.parse(n.createdAt,"ms","yyyy-MM-dd")}))<date(datetime({epochmillis: apoc.date.parse("2020-10-15","ms","yyyy-MM-dd")})) return distinct n`;
  let transaction = await session.writeTransaction(tx=>tx.run(query,{}))
  .then(result=> {
    return result.records;
  }).catch((error) => {
    console.log(error)
  });
  let people = helpers.normalizeRecordsOutput(transaction);
  session.close();

  for (let i=0;i<people.length; i++) {
    let person = people[i];
    if (classpiecesPeople.indexOf(person._id)>-1) {
      console.log(person._id);
      continue;
    }
    else {
      let newRef = {
        items: [
          {_id:person._id, type: "Person", role: ""},
          {_id:hamell2._id, type: "Resource", role: ""},
        ],
        taxonomyTermLabel: "isReferencedIn"
      };
      let addRef = await updateReference(newRef);
    }
  }

  console.log(`Update complete`);
  // stop executing
  process.exit();
}

const extractLocations = async() => {
  const path =`${archivePath}documents/1704/1704-master.csv`;
  var csv = await new Promise((resolve,reject)=>{
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
    let rowKeys = Object.keys(row);
    let placeName = row['Place of ordination'].trim();
    if (placeName!=="" && newCsv.indexOf(`"${placeName}"`)===-1) {
      newCsv.push(`"${placeName}"`);
    }
  }
  newCsv.sort();
  let csvPath = `${archivePath}documents/1704/locations.csv`;
  let csvText = newCsv.join("\n");
  let writeFile = await new Promise ((resolve,reject)=> {
    fs.writeFile(csvPath, csvText, 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        csvStatus = true;
        resolve(true);
      }
    });
  });
  if (writeFile) {
    console.log(`Completed successfully`);
  }
  // stop executing
  process.exit();
}

const extractLaySureties = async() => {
  const path =`${archivePath}documents/1704/1704-master.csv`;
  var csv = await new Promise((resolve,reject)=>{
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
    let rowKeys = Object.keys(row);
    let ls = row['Lay sureties'].trim();
    if (ls!=="") {
      let lss = ls.split(";");
      for (let key in lss) {
        let newLss = lss[key].trim();
        let count =
        newCsv.push({name: `"${newLss}"`, row: Number(rowKey)});
      }
    }
  }
  let newCsv2 = [];
  for (let i=0;i<newCsv.length; i++) {
    let item = newCsv[i];
    let rows = [];
    let count = newCsv.filter(r=>{
      if(r.name===item.name) {
        rows.push(Number(r.row)+1);
        return true;
      }
      return false;
    })?.length ?? 0;
    let newItem = {name: item.name, row: item.row, count: count, rows: rows.join("|")};
    let exists = newCsv2.find(i=>i.name===item.name)??false;
    if (!exists) {
      newCsv2.push(newItem);
    }
  }
  let csvPath = `${archivePath}documents/1704/lay-sureties.csv`;
  let csvText = `Name,Count,Rows\n`;
  for (let key in newCsv2) {
    let r = newCsv2[key];
    let text = `${r.name},${r.count},${r.rows}\n`;
    csvText += text;
  }
  let writeFile = await new Promise ((resolve,reject)=> {
    fs.writeFile(csvPath, `\ufeff`+csvText, 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        csvStatus = true;
        resolve(true);
      }
    });
  });
  if (writeFile) {
    console.log(`Completed successfully`);
  }
  session.close();
  // stop executing
  process.exit();
}

const exportDioceses = async() => {
  const session = driver.session();
  let query = `MATCH (n:Organisation {organisationType:"Diocese"}) RETURN n.label as label ORDER BY n.label`;
  let records = await session.writeTransaction(tx=>tx.run(query,{}))
  .then(result=> {
    let output = [];
    for (let i=0;i<result.records.length;i++) {
      let r = result.records[i];
      let newR = r.toObject()['label'];
      output.push(`"${newR}"`);
    }
    return output;
  });
  let csvPath = `${archivePath}documents/1704/dioceses.csv`;
  let csvText = records.join("\n");
  let writeFile = await new Promise ((resolve,reject)=> {
    fs.writeFile(csvPath, csvText, 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        csvStatus = true;
        resolve(true);
      }
    });
  });
  if (writeFile) {
    console.log(`Completed successfully`);
  }
  // stop executing
  process.exit();
}

const ingesticp = async() => {
  const userId = await getAdminId();
  const session = driver.session();

  let iLocations = [];
  let ipath = `${archivePath}documents/icp/i.csv`;
  let icsv = await new Promise((resolve,reject)=>{
    let results = [];
    fs.createReadStream(ipath)
    .pipe(csvParser())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      resolve(results);
    });
  });
  let ikeys = Object.keys(icsv['0']);
  for (let key in icsv) {
    let row = icsv[key];
    iLocations.push({name:row['﻿Location name'].trim(),nameUpdated:row['Name updated'].trim(),type:row['Organisation type'].trim()})
  }

  let eLocations = [];
  let ePath = `${archivePath}documents/icp/locations.csv`;
  var eCsv = await new Promise((resolve,reject)=>{
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
    if (row[ekeys[0]]!=="") {
      eLocations.push({name:row[ekeys[0]].trim(),nameUpdated:row[ekeys[1]].trim()})
    }
  }

  const mcTaxonomy = new Taxonomy({systemType:"matriculationClass"});
  await mcTaxonomy.load();

  const matriculationClassDB = async(mc, userId) => {
    let newMC = null;
    let searchQuery = `MATCH (n:TaxonomyTerm {label:"${mc}"}) RETURN n`;
    newMC = await session.writeTransaction(tx=>tx.run(searchQuery,{}))
    .then(result=> {
      let records = result.records;
      if (records.length>0) {
        let record = records[0];
        let key = record.keys[0];
        let output = record.toObject()[key];
        output = helpers.outputRecord(output);
        return output;
      }
      else {
        return null;
      }
    });
    if (newMC===null) {
      let newMCData = {
        label: mc,
        inverseLabel: mc
      }
      let newMCTerm = new TaxonomyTerm(newMCData);
      let newMCSave = await newMCTerm.save(userId);
      newMC = newMCSave.data;
      let newRef = {
        items: [
          {_id:newMC._id, type: "TaxonomyTerm", role: ""},
          {_id:mcTaxonomy._id, type: "Taxonomy", role: ""},
        ],
        taxonomyTermLabel: "isChildOf"
      };
      let addRef = await updateReference(newRef);
    }
    return newMC;
  }

  let matriculationClasses = [];
  let vpath = `${archivePath}documents/icp/v.csv`;
  let vcsv = await new Promise((resolve,reject)=>{
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
    matriculationClasses.push({name:row[vkeys['0']].trim(), nameUpdated:row[vkeys['1']].trim(), _id:mc._id});
  }
  const normaliseDate = (date) => {
    date = date.replace(/ /g,'');
    let startDate = "";
    let endDate = null;
    if (date==="") {
      return date;
    }
    if (!date.includes("-")) {
      if (date.includes("?")) {
        let count = date.match(/\?/g).length || [].length;
        let year = date.replace(/\?/g,"");
        if (count===1) {
        	startDate = `01-01-${year}0`;
        	endDate = `31-12-${year}9`;
        }
        else if (count===2) {
        	startDate = `01-01-${year}00`;
        	endDate = `31-12-${year}99`;
        }
      }
      else {
        startDate = `01-01-${date}`;
        endDate = `31-12-${date}`;
      }
    }
    else {
      let parts = date.split("-");
      let d = parts[2];
      let m = parts[1];
      let y = parts[0];
      if (typeof m==="undefined" || m==="??") {
        startDate = `1-1-${y}`;
        endDate = `31-12-${date}`;
      }
      else if (typeof d==="undefined" || d==="??") {
        startDate = `1-${m}-${y}`;
        let lastDay = getDaysInMonth(m,y);
        endDate = `${lastDay}-${m}-${y}`;
      }
      else {
        startDate = `${d}-${m}-${y}`;
      }
    }
    let output = {
      startDate: startDate,
      endDate: endDate
    };
    return output;
  }

  const ingestPerson = async(firstName="",middleName="",lastName="",dbID="", rowNum, total) => {
    let person = {};
    // insert person
    if (dbID==="") {
      let fnameSoundex = helpers.soundex(firstName);
      let lnameSoundex = helpers.soundex(lastName);
      let personData = {
        status: 'private',
        firstName:firstName,
        middleName:middleName,
        lastName:lastName,
        fnameSoundex:fnameSoundex,
        lnameSoundex:lnameSoundex,
        personType: 'Clergy'
      };
      let newPerson = new Person(personData);
      let personSave = await newPerson.save(userId);
      person = personSave.data;
    }
    // update person
    else {
      let personData = {_id:dbID};
      person = new Person(personData);
      await person.load();
    }
    let percentage = (rowNum/total)*100;
    let perc = percentage.toFixed(2);
    console.log(person._id, dbID, person.label, `${perc}%`);
    return person;
  }

  const addArchivalReference = async(archivalReferenceId, person) => {
    let archivalReferenceIds = archivalReferenceId.split(";");
    for (let key in archivalReferenceIds) {
      let archivalReferenceId = archivalReferenceIds[key];
      archivalReferenceId = archivalReferenceId.replace("[ICPA] ","").trim();
      let query = `match (n:Resource) WHERE toLower(n.label) =~ toLower('.*${archivalReferenceId}.*') return n`;
      if (archivalReferenceId==="MS A2.d1") {
        query = `match (n:Resource) WHERE toLower(n.label) =~ toLower('.*MS A2.d1.*')  and not toLower(n.label) =~ toLower('.*MS A2.d15.*') return n`;
      }
      let resource = await session.writeTransaction(tx=>tx.run(query,{}))
      .then(result=> {
        let records = result.records;
        if (records.length>0) {
          let record = records[0].toObject();
          let outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
        return null;
      }).catch((error) => {
        console.log(error)
      });
      if (resource!==null) {
        let reference = {
          items: [
            {_id: person._id, type: "Person"},
            {_id: resource._id, type: "Resource"}
          ],
          taxonomyTermLabel: `isReferencedIn`
        };
        await updateReference(reference);
      }
    }
    return true;

  }

  const addNewEvent = async(label, type, userId, description=null) => {
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
    }
    if (description!=="") {
      eventData.description = description;
    }
    let nodeProperties = helpers.prepareNodeProperties(eventData);
    let params = helpers.prepareParams(eventData);
    let query = `CREATE (n:Event ${nodeProperties}) RETURN n`;
    let item = await session.writeTransaction(tx=>tx.run(query,params))
    .then(result=> {
      let records = result.records;
      let outputRecord = null;
      if (records.length>0) {
        let record = records[0].toObject();
        outputRecord = helpers.outputRecord(record.n);
      }
      return outputRecord;
    }).catch((error) => {
      console.log(error)
    });
    return item;
  }

  const addDate = async(startDate, endDate=null, userId) => {
    let queryEndDate = "";
    if (endDate!==null && endDate!=="") {
      queryEndDate = `AND n.endDate="${endDate}" `;
    }
    let query = `MATCH (n:Temporal) WHERE n.startDate="${startDate}" ${queryEndDate} RETURN n`;
    let temporal = await session.writeTransaction(tx=>tx.run(query,{}))
    .then(result=> {
      let records = result.records;
      let outputRecord = null;
      if (records.length>0) {
        let record = records[0].toObject();
        outputRecord = helpers.outputRecord(record.n);
      }
      return outputRecord;
    }).catch((error) => {
      console.log(error)
    });
    if (temporal===null) {
      let now = new Date().toISOString();
      let label = startDate;
      if (endDate!==null) {
        label +=  ` - ${endDate}`;
      }
      let newItem = {
        label: label,
        startDate: startDate,
        endDate: endDate,
        createdBy: userId,
        createdAt: now,
        updatedBy: userId,
        updatedAt: now,
      }
      let nodeProperties = helpers.prepareNodeProperties(newItem);
      let params = helpers.prepareParams(newItem);
      let query = `CREATE (n:Temporal ${nodeProperties}) RETURN n`;
      temporal = await session.writeTransaction(tx=>tx.run(query,params))
      .then(result=> {
        let records = result.records;
        let outputRecord = null;
        if (records.length>0) {
          let record = records[0].toObject();
          outputRecord = helpers.outputRecord(record.n);
        }
        return outputRecord;
      }).catch((error) => {
        console.log(error)
      });
    }
    return temporal;
  }

  const birthEventType = new TaxonomyTerm({labelId: "Birth"});
  await birthEventType.load();

  const addBirthEvent = async(dateOfBirth,birthEventType,person) => {
    let birthDate = await addDate(dateOfBirth.startDate, dateOfBirth.endDate, userId);

    let birthEvent = await addNewEvent(`Born`, birthEventType._id, userId);
    let birthReference = {
      items: [
        {_id: birthEvent._id, type: "Event"},
        {_id: person._id, type: "Person"}
      ],
      taxonomyTermLabel: `wasStatusOf`
    };
    await updateReference(birthReference);
    let birthTemporalReference = {
      items: [
        {_id: birthEvent._id, type: "Event"},
        {_id: birthDate._id, type: "Temporal"}
      ],
      taxonomyTermLabel: `hasTime`
    };
    await updateReference(birthTemporalReference);
    return true;
  }

  const addRelative = async({firstName="",lastName="",maidenName="",type="",person=null,referenceTermLabel=""}) => {
    let session = driver.session();
    if (firstName==="") {
      return null;
    }
    let relative = {};
    // insert person
    let fnameSoundex = helpers.soundex(firstName);
    let lnameSoundex = helpers.soundex(lastName);
    let relativeData = {
      status: 'private',
      firstName:firstName,
      lastName:lastName,
      fnameSoundex:fnameSoundex,
      lnameSoundex:lnameSoundex,
      personType: 'Laity'
    };
    if (maidenName!=="") {
      relativeData.alternateAppelations = [{firstName:firstName, lastName:maidenName}]
    }
    let newRelative = new Person(relativeData);
    let relativeSave = await newRelative.save(userId);
    relative = relativeSave.data;
    let reference = {
      items: [
        {_id: person._id, type: "Person"},
        {_id: relative._id, type: "Person"}
      ],
      taxonomyTermLabel: referenceTermLabel
    };
    await updateReference(reference);

    return relative;
  }

  const addLocation = async(location, diocese, person, userId) => {
    let escapeLocation = helpers.addslashes(location.name);
    if (location.nameUpdated!=="") {
      escapeLocation = helpers.addslashes(location.nameUpdated);
    }
    let type = location.type;
    let session = driver.session();
    let query = `MATCH (n:Organisation) WHERE toLower(n.label)="${escapeLocation.toLowerCase()}" RETURN n`;
    let organisation = await session.writeTransaction(tx=>tx.run(query,{}))
    .then(result=> {
      let records = result.records;
      let outputRecord = null;
      if (records.length>0) {
        let record = records[0].toObject();
        outputRecord = helpers.outputRecord(record.n);
      }
      return outputRecord;
    }).catch((error) => {
      console.log(error)
    });
    if (organisation===null) {
      let newOrganisation = {};
      let now = new Date().toISOString();
      newOrganisation.label = escapeLocation;
      newOrganisation.createdBy = userId;
      newOrganisation.createdAt = now;
      newOrganisation.updatedBy = userId;
      newOrganisation.updatedAt = now;
      newOrganisation.organisationType = location.type;
      newOrganisation.status = "private";
      newOrganisation.labelSoundex = helpers.soundex(diocese);
      let nodeProperties = helpers.prepareNodeProperties(newOrganisation);
      let params = helpers.prepareParams(newOrganisation);
      let query = `CREATE (n:Organisation ${nodeProperties}) RETURN n`;
      organisation = await session.writeTransaction(tx=>tx.run(query,params))
      .then(result=> {
        let records = result.records;
        let outputRecord = null;
        if (records.length>0) {
          let record = records[0].toObject();
          outputRecord = helpers.outputRecord(record.n);
        }
        return outputRecord;
      }).catch((error) => {
        console.log(error)
      });
    }
    let reference = {
      items: [
        {_id: person._id, type: "Person"},
        {_id: organisation._id, type: "Organisation"}
      ],
      taxonomyTermLabel: `wasNativeOf`
    };
    await updateReference(reference);

    // add relation to location
    let escapeDiocese = helpers.addslashes(diocese);
    let queryDiocese = `MATCH (n:Organisation) WHERE toLower(n.label)="${escapeDiocese.toLowerCase()}" RETURN n`;
    let dioceseNode = await session.writeTransaction(tx=>tx.run(queryDiocese,{}))
    .then(result=> {
      let records = result.records;
      if (records.length>0) {
        let record = records[0].toObject();
        let outputRecord = helpers.outputRecord(record.n);
        return outputRecord;
      }
    })
    let spatial = await helpers.loadRelations(dioceseNode._id, "Organisation", "Spatial");

    if (spatial.length>0) {
      for (let key in spatial) {
        let s = spatial[key];
        let locationReference = {
          items: [
            {_id: organisation._id, type: "Organisation"},
            {_id: s.ref._id, type: "Spatial"},
          ],
          taxonomyTermLabel: `hasLocation`
        };
        await updateReference(locationReference);
      }
    }
    return organisation;
  }

  const addDioceseRef = async(diocese, person, userId) => {
    let escapeDiocese = helpers.addslashes(diocese);
    let query = `MATCH (n:Organisation) WHERE toLower(n.label)="${escapeDiocese.toLowerCase()}" RETURN n`;
    let node = await session.writeTransaction(tx=>tx.run(query,{}))
    .then(result=> {
      let records = result.records;
      if (records.length>0) {
        let record = records[0].toObject();
        let outputRecord = helpers.outputRecord(record.n);
        return outputRecord;
      }
      return null;
    });
    if (node!==null) {
      let reference = {
        items: [
          {_id: person._id, type: "Person"},
          {_id: node._id, type: "Organisation"}
        ],
        taxonomyTermLabel: `hasAffiliation`
      };
      await updateReference(reference);
      return true;
    }
    else {
      console.log(diocese)
    }
    return false;
  }

  const baptismTaxonomyTerm = new TaxonomyTerm({labelId:"Baptism"});
  await baptismTaxonomyTerm.load();

  const addBaptisedEvent = async(baptisedDate, person, userId) => {
    let baptismDate = await addDate(baptisedDate.startDate, baptisedDate.endDate, userId);

    let baptismEvent = await addNewEvent(`Baptised`, baptismTaxonomyTerm._id, userId);
    let baptismReference = {
      items: [
        {_id: baptismEvent._id, type: "Event"},
        {_id: person._id, type: "Person"}
      ],
      taxonomyTermLabel: `wasStatusOf`
    };
    await updateReference(baptismReference);
    let baptismTemporalReference = {
      items: [
        {_id: baptismEvent._id, type: "Event"},
        {_id: baptismDate._id, type: "Temporal"}
      ],
      taxonomyTermLabel: `hasTime`
    };
    await updateReference(baptismTemporalReference);
    return true;
  }

  const matriculationTaxonomyTerm = new TaxonomyTerm({labelId:"matriculation"});
  await matriculationTaxonomyTerm.load();

  const icpSpatialQuery = `MATCH (n:Spatial {label:"Irish College Paris"}) RETURN n`
  let icpSpatialNode = await session.writeTransaction(tx=>tx.run(icpSpatialQuery,{}))
  .then(result=> {
    let records = result.records;
    if (records.length>0) {
      let record = records[0].toObject();
      let outputRecord = helpers.outputRecord(record.n);
      return outputRecord;
    }
    else return {};
  })
  .catch((error) => {
    console.log(error)
  });

  const addMatriculationEvent = async(matriculationDate, matriculationClass, person, userId) => {
    let newDate = await addDate(matriculationDate.startDate, matriculationDate.endDate, userId);
    let label = `Matriculation`;
    let newMatriculationClass = "";
    let newMatriculationClassId = "";
    if (matriculationClass!=="") {
      let normClass = matriculationClasses.find(mc=>mc.name===matriculationClass);
      if (typeof normClass!=="undefined") {
        newMatriculationClass = normClass.nameUpdated;
        newMatriculationClassId = normClass._id;
      }
    }
    if (newMatriculationClass!=="") {
      label = `Matriculation into ${newMatriculationClass}`;
    }
    let matriculationEventQuery = `match (n:Event {label:"${label}"})
      match (t:Temporal)
      match (s:Spatial)
      WHERE exists((n)-[:hasTime]->(t)) AND id(t)=${newDate._id}
      AND exists((n)-[:hasLocation]->(s)) AND id(s)=${icpSpatialNode._id}
      return n,t`;
    let matriculationEvent = await session.writeTransaction(tx=>tx.run(matriculationEventQuery,{}))
    .then(result=> {
      let records = result.records;
      if (records.length>0) {
        let record = records[0].toObject();
        let outputRecord = helpers.outputRecord(record.n);
        return outputRecord;
      }
      return null;
    }).catch((error) => {
      console.log(error)
    });
    if (matriculationEvent===null) {
      matriculationEvent = await addNewEvent(label, matriculationTaxonomyTerm._id, userId);
    }
    let matriculationReference = {
      items: [
        {_id: matriculationEvent._id, type: "Event"},
        {_id: person._id, type: "Person"}
      ],
      taxonomyTermLabel: `hasParticipant`
    };
    if (newMatriculationClassId!=="") {
      matriculationReference.items[1].role = null;
      matriculationReference.items[0].role = newMatriculationClassId;
    }
    await updateReference(matriculationReference);
    let matriculationTemporalReference = {
      items: [
        {_id: matriculationEvent._id, type: "Event"},
        {_id: newDate._id, type: "Temporal"}
      ],
      taxonomyTermLabel: `hasTime`
    };
    await updateReference(matriculationTemporalReference);
    let matriculationSpatialReference = {
      items: [
        {_id: matriculationEvent._id, type: "Event"},
        {_id: icpSpatialNode._id, type: "Spatial"}
      ],
      taxonomyTermLabel: `hasLocation`
    };
    await updateReference(matriculationSpatialReference);

    return true;
  }

  const ordinationTaxonomyTerm = new TaxonomyTerm({labelId:"ordination"});
  await ordinationTaxonomyTerm.load();

  const addOrdinationEvent = async(date, location, role, description, person, userId) => {
    let label = `Ordination`;
    if (role!=="") {
      label = `Ordained as ${role}`;
    }
    let ordinationEvent = await addNewEvent(label, ordinationTaxonomyTerm._id, userId, description);
    let personReference = {
      items: [
        {_id: ordinationEvent._id, type: "Event"},
        {_id: person._id, type: "Person"}
      ],
      taxonomyTermLabel: `hasParticipant`
    };
    await updateReference(personReference);
    if (date!=="") {
      if (typeof date==="string") {
        date = normaliseDate(date);
      }
      let newDate = await addDate(date.startDate, date.endDate, userId);
      let temporalReference = {
        items: [
          {_id: ordinationEvent._id, type: "Event"},
          {_id: newDate._id, type: "Temporal"}
        ],
        taxonomyTermLabel: `hasTime`
      };
      await updateReference(temporalReference);
    }
    if (location!=="") {
      const spatialQuery = `MATCH (n:Spatial {label:"${location}"}) RETURN n`
      let spatial = await session.writeTransaction(tx=>tx.run(icpSpatialQuery,{}))
      .then(result=> {
        let records = result.records;
        if (records.length>0) {
          let record = records[0].toObject();
          let outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
        else return null;
      })
      .catch((error) => {
        console.log(error)
      });
      if (spatial===null) {
        console.log(`No spatial for location: "${location}" and person: "${person.label}"`);
      }
      let spatialReference = {
        items: [
          {_id: ordinationEvent._id, type: "Event"},
          {_id: spatial._id, type: "Spatial"}
        ],
        taxonomyTermLabel: `hasLocation`
      };
      await updateReference(spatialReference);
    }
    return true;
  }

  const addDeathEvent = async(date, location, description, person, userId) => {
    let newEvent = await addNewEvent("Deceased", ordinationTaxonomyTerm._id, userId, description);
    let personReference = {
      items: [
        {_id: newEvent._id, type: "Event"},
        {_id: person._id, type: "Person"}
      ],
      taxonomyTermLabel: `wasStatusOf`
    };
    await updateReference(personReference);
    if (date!=="") {
      if (typeof date==="string") {
        date = normaliseDate(date);
      }
      let newDate = await addDate(date.startDate, date.endDate, userId);
      let temporalReference = {
        items: [
          {_id: newEvent._id, type: "Event"},
          {_id: newDate._id, type: "Temporal"}
        ],
        taxonomyTermLabel: `hasTime`
      };
      await updateReference(temporalReference);
    }
    if (location!=="") {
      const spatialQuery = `MATCH (n:Spatial {label:"${location}"}) RETURN n`
      let spatial = await session.writeTransaction(tx=>tx.run(icpSpatialQuery,{}))
      .then(result=> {
        let records = result.records;
        if (records.length>0) {
          let record = records[0].toObject();
          let outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
        else return null;
      })
      .catch((error) => {
        console.log(error)
      });
      if (spatial===null) {
        console.log(`No spatial for location: "${location}" and person: "${person.label}"`);
      }
      let spatialReference = {
        items: [
          {_id: newEvent._id, type: "Event"},
          {_id: spatial._id, type: "Spatial"}
        ],
        taxonomyTermLabel: `hasLocation`
      };
      await updateReference(spatialReference);
    }
    return true;
  }

  const bursaryScholarshipTaxonomyTerm = new TaxonomyTerm({labelId:"BursaryScholarship"});
  await bursaryScholarshipTaxonomyTerm.load();

  const addBursaryScholarshipEvent = async(date, location, description, person, userId) => {
    let label = helpers.addslashes("Bursary/Scholarship");
    let newEvent = await addNewEvent(label, bursaryScholarshipTaxonomyTerm._id, userId, description);
    let personReference = {
      items: [
        {_id: newEvent._id, type: "Event"},
        {_id: person._id, type: "Person"}
      ],
      taxonomyTermLabel: `hasRecipient`
    };
    await updateReference(personReference);
    if (date!=="") {
      if (typeof date==="string") {
        date = normaliseDate(date);
      }
      let newDate = await addDate(date.startDate, date.endDate, userId);
      let temporalReference = {
        items: [
          {_id: newEvent._id, type: "Event"},
          {_id: newDate._id, type: "Temporal"}
        ],
        taxonomyTermLabel: `hasTime`
      };
      await updateReference(temporalReference);
    }
    if (location!=="") {
      const spatialQuery = `MATCH (n:Spatial {label:"${location}"}) RETURN n`
      let spatial = await session.writeTransaction(tx=>tx.run(icpSpatialQuery,{}))
      .then(result=> {
        let records = result.records;
        if (records.length>0) {
          let record = records[0].toObject();
          let outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
        else return null;
      })
      .catch((error) => {
        console.log(error)
      });
      if (spatial===null) {
        console.log(`No spatial for location: "${location}" and person: "${person.label}"`);
      }
      let spatialReference = {
        items: [
          {_id: newEvent._id, type: "Event"},
          {_id: spatial._id, type: "Spatial"}
        ],
        taxonomyTermLabel: `hasLocation`
      };
      await updateReference(spatialReference);
    }
    return true;
  }

  const confirmationTaxonomyTerm = new TaxonomyTerm({labelId:"Confirmation"});
  await confirmationTaxonomyTerm.load();

  const addConfirmationEvent = async(confirmationDate, person, userId) => {
    if (typeof confirmationDate==="string") {
      confirmationDate = normaliseDate(confirmationDate);
    }
    let newDate = await addDate(confirmationDate.startDate, confirmationDate.endDate, userId);
    let confirmationEvent = await addNewEvent(`Confirmation`, confirmationTaxonomyTerm._id, userId);
    let confirmationReference = {
      items: [
        {_id: confirmationEvent._id, type: "Event"},
        {_id: person._id, type: "Person"}
      ],
      taxonomyTermLabel: `hasParticipant`
    };
    await updateReference(confirmationReference);
    let confirmationTemporalReference = {
      items: [
        {_id: confirmationEvent._id, type: "Event"},
        {_id: newDate._id, type: "Temporal"}
      ],
      taxonomyTermLabel: `hasTime`
    };
    await updateReference(confirmationTemporalReference);
    return true;
  }

  const departureTaxonomyTerm = new TaxonomyTerm({labelId:"Departure"});
  await departureTaxonomyTerm.load();

  const addDateOfDepartureEvent = async(dateOfDeparture, dateOfDepartureDescription, person, userId) => {
    let datesOfDeparture = dateOfDeparture.split(";");
    for (let key in datesOfDeparture) {
      let newDateOfDeparture = datesOfDeparture[key];
      let normNewDateOfDeparture = normaliseDate(newDateOfDeparture);
      let description = null;
      if (dateOfDepartureDescription!=="") {
        description = dateOfDepartureDescription;
      }
      let newDate = await addDate(normNewDateOfDeparture.startDate, normNewDateOfDeparture.endDate, userId);
      let newEvent = await addNewEvent(`Departed from Irish College Paris (ICP)`, departureTaxonomyTerm._id, userId, dateOfDepartureDescription);
      let personReference = {
        items: [
          {_id: newEvent._id, type: "Event"},
          {_id: person._id, type: "Person"}
        ],
        taxonomyTermLabel: `wasStatusOf`
      };
      await updateReference(personReference);
      let temporalReference = {
        items: [
          {_id: newEvent._id, type: "Event"},
          {_id: newDate._id, type: "Temporal"}
        ],
        taxonomyTermLabel: `hasTime`
      };
      await updateReference(temporalReference);
    }
    return true;
  }

  const icpOrgQuery = `MATCH (n:Organisation {label:"Irish College Paris (ICP)"}) RETURN n`;
  const icpOrg = await session.writeTransaction(tx=>tx.run(icpOrgQuery,{}))
  .then(result=> {
    let records = result.records;
    if (records.length>0) {
      let record = records[0].toObject();
      let outputRecord = helpers.outputRecord(record.n);
      return outputRecord;
    }
  });

  const addRelationToICP = async(person,userId) => {
    let reference = {
      items: [
        {_id: person._id, type: "Person"},
        {_id: icpOrg._id, type: "Organisation"}
      ],
      taxonomyTermLabel: `wasStudentOf`
    };
    await updateReference(reference);
  }

  const addExtraEvents = async(extraEventColumn, extraEventColumnDescription, person, userId) => {
    let events = extraEventColumn.split(";");
    for (let eKey in events) {
      let e = events[eKey];
      let parts = e.split(",");
      let newObject = {
        event: "",
        spatial: "",
        temporal: ""
      }
      for (let key in parts) {
        let part = parts[key].trim();
        if (part.includes("e =")) {
          newObject.event = part.replace("e =","").trim();
        }
        if (part.includes("s =")) {
          let newSpatial = part.replace("s =","").trim();
          let newSpatial2 = eLocations.find(l=>l.name===newSpatial);
          if (typeof newSpatial2!=="undefined") {
            newObject.spatial = newSpatial2.nameUpdated;
          }
        }
        if (part.includes("t =")) {
          newObject.temporal = part.replace("t =","").trim();
        }
      }
      // ordination
      if (newObject.event === "o" || newObject.event === "o1" || newObject.event === "o2") {
        let role = "";
        if (newObject.event === "o1") {
          role = "Deacon";
        }
        if (newObject.event === "o2") {
          role = "Subdeacon";
        }
        await addOrdinationEvent(newObject.temporal, newObject.spatial, role, extraEventColumnDescription, person, userId);
      }
      // death
      if (newObject.event === "d") {
        await addDeathEvent(newObject.temporal, newObject.spatial, extraEventColumnDescription,person, userId);
      }
      // = bursary/scholarship
      if (newObject.event === "b") {
        await addBursaryScholarshipEvent(newObject.temporal, newObject.spatial, extraEventColumnDescription, person, userId);
      }
    }

    return true;
  }

  let path = `${archivePath}documents/icp/ICP-Database.csv`;
  var csv = await new Promise((resolve,reject)=>{
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
    let int = row[keys[0]].trim();
    let archivalReferenceId = row[keys['1']].trim();
    let lastName = row[keys['2']].trim();
    let firstName = row[keys['3']].trim();
    let middleName = "";
    if (firstName.includes(" ")) {
      let firstNameArr = firstName.split(" ");
      firstName = firstNameArr[0].trim();
      middleName = firstNameArr[1].trim();
    }
    let dateOfBirth = normaliseDate(row[keys['4']].trim());

    // father
    let fatherFirstName = row[keys['5']].trim();
    let fatherLastName = lastName;

    //mother
    let motherFirstName = row[keys['6']].trim();
    let motherLastName = lastName;
    let motherMaidenName = row[keys['7']].trim();

    let placeOfOrigin = row[keys['8']].trim();
    let diocese = row[keys['9']].trim();
    let baptisedDate = normaliseDate(row[keys['10']].trim());
    let matriculationDate = normaliseDate(row[keys['14']].trim());
    let matriculationClass = row[keys['21']].trim();
    let confirmationDate = row[keys['19']].trim();
    if (confirmationDate!=="yes") {
      confirmationDate = normaliseDate(row[keys['19']].trim());
    }
    let dateOfDeparture = row[keys['18']].trim();
    let dateOfDepartureDescription = row[keys['45']].trim();

    let extraEventColumn = row[keys['46']].trim();
    let extraEventColumnDescription = row[keys['47']].trim();

    let dbID = row[keys['48']]?.trim() || "";

    // 1. ingest person
    let person = await ingestPerson(firstName, middleName, lastName, dbID, Number(rowKey), totalLength);

    // 2. reference to archival number
    // add the reources to the db if not exist
    let archivalReference = await addArchivalReference(archivalReferenceId, person);

    // 3. create birth event
    let newBirthEvent = null;
    if (row['Date of Birth'].trim()!=="") {
      newBirthEvent = await addBirthEvent(dateOfBirth,birthEventType,person);
    }

    // 4. father info
    let addFather = null;
    if (fatherFirstName!=="") {
      let fatherData = {
        firstName: fatherFirstName,
        lastName: fatherLastName,
        type: "father",
        person: person,
        referenceTermLabel: "isSonOf"
      }
      addFather = await addRelative(fatherData)
    }

    // 5. mother info
    let addMother = null;
    if (motherFirstName!=="") {
      let motherData = {
        firstName: motherFirstName,
        lastName: motherLastName,
        maidenName: motherMaidenName,
        type: "mother",
        person: person,
        referenceTermLabel: "isSonOf"
      }
      addMother = await addRelative(motherData);
    }

    // 6. add place of origin
    let newPlaceOfOrigin = null;
    let organisationOfOrigin = iLocations.find(l=>l.name===placeOfOrigin);
    if (typeof organisationOfOrigin!=="undefined" && organisationOfOrigin.type!=="Incorrect entry") {
      newPlaceOfOrigin = await addLocation(organisationOfOrigin, diocese, person, userId);
    }

    // 7. add diocese reference
    let dioceseRef = null;
    if (diocese!=="") {
      dioceseRef = await addDioceseRef(diocese, person, userId);
    }

    // 8. Baptism
    let baptismEvent = null;
    if (baptisedDate!=="") {
      baptismEvent = await addBaptisedEvent(baptisedDate, person, userId);
    }

    // 9. Matriculation
    let matriculationEvent = null;
    if (matriculationDate!=="") {
      matriculationEvent = await addMatriculationEvent(matriculationDate, matriculationClass, person, userId);
    }

    // 10. Confirmation
    let confirmationEvent = null;
    if (confirmationDate!=="") {
      confirmationEvent = await addConfirmationEvent(confirmationDate, person, userId);
    }

    // 11. date of departure
    let dateOfDepartureEvent = null;
    if (dateOfDeparture!=="") {
      dateOfDepartureEvent = await addDateOfDepartureEvent(dateOfDeparture, dateOfDepartureDescription, person, userId);
    }

    // 12. add relation to ICP
    let relationICP = await addRelationToICP(person,userId);

    // 13. add extra events
    let extraEvent = null;
    if (extraEventColumn!=="") {
      extraEvent = await addExtraEvents(extraEventColumn, extraEventColumnDescription, person, userId);
    }
  }
  console.log("Completed successfully.");
  // stop executing
  process.exit();
}

const icpLocations = async() => {
  let path = `${archivePath}documents/icp/ICP-Database.csv`;
  var csv = await new Promise((resolve,reject)=>{
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
  let spatial = [];
  let names = [];
  const session = driver.session();
  for (let rowKey in csv) {
    let row = csv[rowKey];
    let extraEventColumn = row[keys['46']].trim();
    let events = extraEventColumn.split(";");
    for (let eKey in events) {
      let e = events[eKey];
      let parts = e.split(",");
      let obj = {
        event: "",
        spatial: "",
        temporal: ""
      }
      for (let key in parts) {
        let part = parts[key].trim();
        if (part.includes("e =")) {
          obj.event = part.replace("e =","").trim();
        }
        if (part.includes("s =")) {
          obj.spatial = part.replace("s =","").trim();
        }
        if (part.includes("t =")) {
          obj.temporal = part.replace("t =","").trim();
        }
      }
      if (names.indexOf(obj.spatial)===-1) {
        const icpSpatialQuery = `MATCH (n:Spatial {label:"${obj.spatial}"}) RETURN n`
        let icpSpatialNode = await session.writeTransaction(tx=>tx.run(icpSpatialQuery,{}))
        .then(result=> {
          let records = result.records;
          if (records.length>0) {
            let record = records[0].toObject();
            let outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          }
          return null;
        })
        .catch((error) => {
          console.log(error)
        });
        let nameUpdated = icpSpatialNode?.label || "";
        let dbMatch = "";
        if (icpSpatialNode!==null) {
          dbMatch = "yes";
        }
        spatial.push({name:obj.spatial, nameUpdated:nameUpdated, dbMatch:dbMatch});
        names.push(obj.spatial);
      }

    }
  }
  session.close();
  spatial.sort((a,b)=> (a.name > b.name ? 1 : -1));
  let csvText = "Name,Name Updated,DB Match\n";
  for (let k in spatial) {
    let row = spatial[k];
    csvText+=`${row.name},${row.nameUpdated},${row.dbMatch}\n`;
  }
  let csvPath = `${archivePath}documents/icp/locations.csv`;
  let writeFile = await new Promise ((resolve,reject)=> {
    fs.writeFile(csvPath, csvText, 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        csvStatus = true;
        resolve(true);
      }
    });
  });
  process.exit();
}

const getDaysInMonth = (m,y) => {
  return new Date(y, m+1, 0).getDate();
}

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
if (argv._.includes('ingesticp')) {
  ingesticp();
}
if (argv._.includes('icpLocations')) {
  icpLocations();
}
