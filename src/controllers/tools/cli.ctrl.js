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
