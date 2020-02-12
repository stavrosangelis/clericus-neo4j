const driver = require("../config/db-driver");
const helpers = require("../helpers");

class Person {
  constructor({_id=null,label=null,honorificPrefix=[],firstName=null,middleName=null,lastName=null,fnameSoundex=null,lnameSoundex=null,alternateAppelations=[],description=null,status='private',createdBy=null,createdAt=null,updatedBy=null,updatedAt=null}) {
    if (typeof _id!=="undefined" && _id!==null) {
      this._id = _id;
    }
    this.honorificPrefix = honorificPrefix;
    this.firstName = firstName;
    this.middleName = middleName;
    this.lastName = lastName;
    this.label = this.personLabel({honorificPrefix:honorificPrefix, firstName:firstName, middleName:middleName, lastName:lastName});
    this.fnameSoundex = fnameSoundex;
    this.lnameSoundex = lnameSoundex;
    this.description = description;
    this.status = status;
    this.alternateAppelations = this.normalizeAppelations(alternateAppelations);
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedBy = updatedBy;
    this.updatedAt = updatedAt;
  }

  personLabel(props) {
    let label = "";
    if (props.firstName!==null) {
      if (label!=="") {
        label += " ";
      }
      label += props.firstName;
    }
    if (props.middleName!==null) {
      if (label!=="") {
        label += " ";
      }
      label += props.middleName;
    }
    if (props.lastName!==null) {
      if (label!=="") {
        label += " ";
      }
      label += props.lastName;
    }
    return label;
  }

  normalizeAppelations(alternateAppelations) {
    let appelations = alternateAppelations.map(appelation=> {
      if (appelation.label==="") {
        appelation.label = personLabel({firstName:appelation.firstName, middleName:appelation.middleName, lastName:appelation.lastName});
      }
      return appelation;
    });
    return appelations;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.firstName!==null && this.firstName.length<2) {
      status = false;
      errors.push({field: "firstName", msg: "First name must contain at least 2 characters"});
    }
    if (this.firstName!==null && this.middleName!=="" && this.firstName.length<2) {
      status = false;
      errors.push({field: "middleName", msg: "If middle name is entered it must contain at least 2 characters"});
    }
    if (this.firstName!==null && this.lastName.length<2) {
      status = false;
      errors.push({field: "lastName", msg: "Last name must contain at least 2 characters"});
    }
    if (this.firstName!==null && this.alternateAppelations.length>0) {
      for (let key in this.alternateAppelations) {
        let alternateAppelation = this.alternateAppelations[key];
        let label = "";
        if (alternateAppelation.appelation!=="" && alternateAppelation.appelation.length<2) {
          status = false;
          errors.push({field: "appelation", msg: "Appelation must contain at least 2 characters for alternate appelation \""+alternateAppelation.appelation+"\""});
        }
        if (alternateAppelation.appelation==="" && alternateAppelation.firstName.length<2) {
          status = false;
          errors.push({field: "firstName", msg: "First name must contain at least 2 characters for alternate appelation \""+alternateAppelation.appelation+"\""});
        }
        if (alternateAppelation.appelation==="" && alternateAppelation.middleName!=="" && this.firstName.length<2) {
          status = false;
          errors.push({field: "middleName", msg: "If middle name is entered it must contain at least 2 characters for alternate appelation \""+alternateAppelation.appelation+"\""});
        }
        if (alternateAppelation.appelation==="" && alternateAppelation.lastName.length<2) {
          status = false;
          errors.push({field: "lastName", msg: "Last name must contain at least 2 characters for alternate appelation \""+alternateAppelation.appelation+"\""});
        }
      }
    }

    let msg = "The record is valid";
    if (!status) {
      msg = "The record is not valid";
    }
    let output = {
      status: status,
      msg: msg,
      errors: errors,
      data: []
    }
    return output;
  }

  async load() {
    if (this._id===null) {
      return false;
    }
    let session = driver.session()
    let query = "MATCH (n:Person) WHERE id(n)="+this._id+" return n";
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
    })
    .catch((error) => {
      console.log(error)
    });
    for (let key in node) {
      this[key] = node[key];
      let newAppelations = [];
      if (key==="alternateAppelations" && node[key].length>0) {
        for (let akey in node[key]) {
          let alternateAppelation = JSON.parse(node[key][akey]);
          newAppelations.push(alternateAppelation);
        }
        this[key] = newAppelations;
      }
    }
    // relations
    let events = await helpers.loadRelations(this._id, "Person", "Event");
    let organisations = await helpers.loadRelations(this._id, "Person", "Organisation");
    let people = await helpers.loadRelations(this._id, "Person", "Person");
    let resources = await helpers.loadRelations(this._id, "Person", "Resource");
    this.events = events;
    this.organisations = organisations;
    this.people = people;
    this.resources = resources;
  }

  async save(userId) {
    let validatePerson = this.validate();
    if (!validatePerson.status) {
      return validatePerson;
    }
    else {
      let session = driver.session();
      let newAppelations = [];
      if (this.alternateAppelations.length>0) {
        for (let key in this.alternateAppelations) {
          let alternateAppelation = JSON.stringify(this.alternateAppelations[key]);
          newAppelations.push(alternateAppelation);
        }
      }
      this.alternateAppelations = newAppelations;
      this.label = this.personLabel(this);

      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id==="undefined" || this._id===null) {
        this.createdBy = userId;
        this.createdAt = now;
      }
      else {
        let original = new Person({_id:this._id});
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      let nodeProperties = helpers.prepareNodeProperties(this);
      let params = helpers.prepareParams(this);

      let query = "";
      if (typeof this._id==="undefined" || this._id===null) {
        query = "CREATE (n:Person "+nodeProperties+") RETURN n";
      }
      else {
        query = "MATCH (n:Person) WHERE id(n)="+this._id+" SET n="+nodeProperties+" RETURN n";
      }
      const resultPromise = await session.run(
        query,
        params
      ).then(result => {
        session.close();
        let records = result.records;
        let output = {error: ["The record cannot be updated"], status: false, data: []};
        if (records.length>0) {
          let record = records[0];
          let key = record.keys[0];
          let resultRecord = record.toObject()[key];
          resultRecord = helpers.outputRecord(resultRecord);
          output = {error: [], status: true, data: resultRecord};
        }
        return output;
      })
      .catch((error) => {
        console.log(error)
      });
      return resultPromise;
    }
  }

  async delete() {
    let session = driver.session()
    // 1. delete relations
    let query1 = "MATCH (n:Person)-[r]-() WHERE id(n)="+this._id+" DELETE r";
    let deleteRel = await session.writeTransaction(tx=>
      tx.run(query1,{})
    )
    .then(result => {
      session.close();
      return result;
    })
    .catch((error) => {
      console.log(error)
    });
    // 2. delete node
    let query = "MATCH (n:Person) WHERE id(n)="+this._id+" DELETE n";
    let deleteRecord = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result => {
      session.close();
      return result;
    })
    .catch((error) => {
      console.log(error)
    });
    return deleteRecord;
  }
};

/**
* @api {get} /people Get people
* @apiName get people
* @apiGroup People
*
* @apiParam {string} [label] A string to match against the peoples' labels.
* @apiParam {string} [firstName] A string to match against the peoples' first names.
* @apiParam {string} [lastName] A string to match against the peoples' last names.
* @apiParam {string} [fnameSoundex] A string to match against the peoples' first name soundex.
* @apiParam {string} [lnameSoundex] A string to match against the peoples' last name soundex.
* @apiParam {string} [description] A string to match against the peoples' description.
* @apiParam {string} [orderField=firstName] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiSuccessExample {json} Success-Response:
{
  "status": true,
  "data": {
    "currentPage": 1,
    "data": [
      {"lastName": "Fox", "firstName": "Aidan", "honorificPrefix": [""], "middleName": "", "label": "Aidan Fox",…},
    …],
    "totalItems": "221",
    "totalPages": 9
  },
  "error": [],
  "msg": "Query results"
}
*/
const getPeople = async (req, resp) => {
  let parameters = req.query;
  let label = "";
  let firstName = "";
  let lastName = "";
  let fnameSoundex = "";
  let lnameSoundex = "";
  let description = "";
  let status = "";
  let page = 0;
  let orderField = "firstName";
  let queryPage = 0;
  let queryOrder = "";
  let limit = 25;

  let query = "";
  let queryParams = "";
  if (typeof parameters.label!=="undefined") {
    label = parameters.label;
    if (label!=="") {
      queryParams +="LOWER(n.label) =~ LOWER('.*"+label+".*') ";
    }
  }
  if (typeof parameters.firstName!=="undefined") {
    firstName = parameters.firstName;
    if (firstName!=="") {
      if (queryParams !=="") {
        queryParams += " AND ";
      }
      queryParams += "LOWER(n.firstName) =~ LOWER('.*"+firstName+".*') ";
    }
  }
  if (typeof parameters.lastName!=="undefined") {
    lastName = parameters.lastName;
    if (lastName!=="") {
      if (queryParams !=="") {
        queryParams += " AND ";
      }
      queryParams += "LOWER(n.lastName) =~ LOWER('.*"+lastName+".*') ";
    }
  }
  if (typeof parameters.fnameSoundex!=="undefined") {
    fnameSoundex = helpers.soundex(parameters.fnameSoundex);
    if (queryParams !=="") {
      queryParams += " AND ";
    }
    queryParams += "LOWER(n.fnameSoundex) =~ LOWER('.*"+fnameSoundex+".*') ";
  }
  if (typeof parameters.lnameSoundex!=="undefined") {
    lnameSoundex = helpers.soundex(parameters.lnameSoundex);
    if (queryParams !=="") {
      queryParams += " AND ";
    }
    queryParams += "LOWER(n.lnameSoundex) =~ LOWER('.*"+lnameSoundex+".*') ";
  }
  if (typeof parameters.description!=="undefined") {
    description = parameters.description.toLowerCase();
    if (queryParams !=="") {
      queryParams += " AND ";
    }
    queryParams += "LOWER(n.description) =~ LOWER('.*"+description+".*') ";
  }
  if (typeof parameters.status!=="undefined") {
    status = parameters.status;
    if (status!=="") {
      if (queryParams !=="") {
        queryParams += " AND ";
      }
      queryParams += "LOWER(n.status) =~ LOWER('.*"+status+".*') ";
    }
  }
  if (typeof parameters.orderField!=="undefined") {
    orderField = parameters.orderField;
  }
  if (orderField!=="") {
    queryOrder = "ORDER BY n."+orderField;
    if (typeof parameters.orderDesc!=="undefined" && parameters.orderDesc==="true") {
      queryOrder += " DESC";
    }
  }

  if (typeof parameters.page!=="undefined") {
    page = parseInt(parameters.page,10);
    queryPage = parseInt(parameters.page,10)-1;
  }
  if (typeof parameters.limit!=="undefined") {
    limit = parseInt(parameters.limit,10);
  }
  let currentPage = page;
  if (page===0) {
    currentPage = 1;
  }
  let skip = limit*queryPage;
  if (queryParams!=="") {
    queryParams = "WHERE "+queryParams;
  }
  query = "MATCH (n:Person) "+queryParams+" RETURN n "+queryOrder+" SKIP "+skip+" LIMIT "+limit;
  let data = await getPeopleQuery(query, queryParams, limit);
  if (data.error) {
    resp.json({
      status: false,
      data: [],
      error: data.error,
      msg: data.error.message,
    })
  }
  else {
    let responseData = {
      currentPage: currentPage,
      data: data.nodes,
      totalItems: data.count,
      totalPages: data.totalPages,
    }
    resp.json({
      status: true,
      data: responseData,
      error: [],
      msg: "Query results",
    })
  }
}

const getPeopleQuery = async (query, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  }).catch((error) => {
    console.log(error)
  });

  let nodes = helpers.normalizeRecordsOutput(nodesPromise);
  // get related resources
  let nodeResourcesPromises = nodes.map(node => {
    let newPromise = new Promise(async (resolve,reject)=> {
      let relations = {};
      relations.nodeId = node._id;
      relations.resources = await helpers.loadRelations(node._id, "Person", "Resource");
      resolve(relations);
    })
    return newPromise;
  });

  let nodesResourcesRelations = await Promise.all(nodeResourcesPromises)
  .then(data=>{
    return data;
  })
  .catch((error) => {
    console.log(error)
  });



  let nodesPopulated = nodes.map(node=> {
    let resources = [];
    let nodeResources = nodesResourcesRelations.find(relation=>relation.nodeId===node._id);
    if (typeof nodeResources!=="undefined") {
      resources = nodeResources.resources.map(item=>{
        let ref = item.ref;
        let paths = item.ref.paths.map(path=> {
          let pathOut = null;
          if (typeof path==="string") {
            pathOut = JSON.parse(path);
            if (typeof pathOut==="string") {
              pathOut = JSON.parse(pathOut);
            }
          }
          else {
            pathOut = path;
          }
          return pathOut;
        });

        item.ref.paths = paths;
        return item;
      });
    }
    node.resources = nodeResources.resources;
    return node;
  });
  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Person) "+queryParams+" RETURN count(*)")
  )
  .then(result=> {
    session.close();
    let resultRecord = result.records[0];
    let countObj = resultRecord.toObject();
    helpers.prepareOutput(countObj);
    let output = countObj['count(*)'];
    return output;
  });
  let totalPages = Math.ceil(count/limit)
  let result = {
    nodes: nodesPopulated,
    count: count,
    totalPages: totalPages
  }
  return result;
}

/**
* @api {get} /person Get person
* @apiName get person
* @apiGroup People
*
* @apiParam {string} _id The _id of the requested person.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"2069","honorificPrefix":["My"],"firstName":"fname","middleName":"mname","lastName":"lname","label":"fname mname lname","fnameSoundex":"F550","lnameSoundex":"L550","description":"description","status":"private","alternateAppelations":[{"appelation":"","firstName":"altfname","middleName":"altmname","lastName":"altlname","note":"note","language":{"value":"en","label":"English"}}],"createdBy":"260","createdAt":"2020-01-14T15:39:10.638Z","updatedBy":"260","updatedAt":"2020-01-14T15:42:42.939Z","events":[],"organisations":[],"people":[],"resources":[]},"error":[],"msg":"Query results"}
*/
const getPerson = async(req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id==="undefined" || parameters._id==="") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id to continue.",
    });
    return false;
  }
  let _id = parameters._id;
  let person = new Person({_id: _id});
  await person.load();
  resp.json({
    status: true,
    data: person,
    error: [],
    msg: "Query results",
  });
}

/**
* @api {put} /person Put person
* @apiName put person
* @apiGroup People
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the person. This should be undefined|null|blank in the creation of a new person.
* @apiParam {array} [honorificPrefix] The various honorific prefixes a person has.
* @apiParam {string} firstName The person's first name.
* @apiParam {string} [middleName] The person's middle name.
* @apiParam {string} lastName The person's lastName name.
* @apiParam {string} [description] A description about the person.
* @apiParam {string} [status=private] The status of the person.
* @apiParam {array} [alternateAppelations] The person's alternate appelations.
* @apiParam {string}  [alternateAppelation[appelation]] The person's alternate appelation label.
* @apiParam {string}  alternateAppelation[firstName] The person's alternate appelation first name.
* @apiParam {string}  [alternateAppelation[middleName]] The person's alternate appelation middle name.
* @apiParam {string}  alternateAppelation[lastName] The person's alternate appelation lastName name.
* @apiParam {string}  [alternateAppelation[note]] The person's alternate appelation note.
* @apiParam {object}  [alternateAppelation[language]] The person's alternate appelation language.
* @apiSuccessExample {json} Success-Response:
{"error":[],"status":true,"data":{"lastName":"lname","updatedBy":"260","description":"description","honorificPrefix":["Mr"],"label":"fname mname lname","alternateAppelations":[],"firstName":"fname","createdAt":"2020-01-14T15:39:10.638Z","createdBy":"260","middleName":"mname","lnameSoundex":"L550","fnameSoundex":"F550","status":"private","updatedAt":"2020-01-14T15:39:10.638Z","_id":"2069"}}
*/
const putPerson = async(req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length===0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "The person must not be empty",
    });
    return false;
  }
  let personData = {};
  for (let key in postData) {
    if (postData[key]!==null) {
      personData[key] = postData[key];
      // add the soundex
      if (key==='firstName') {
        personData.fnameSoundex = helpers.soundex(postData.firstName.trim());
      }
      if (key==='lastName') {
        personData.lnameSoundex = helpers.soundex(postData.lastName.trim());
      }
    }
  }
  let userId = req.decoded.id;
  let person = new Person(personData);
  let output = await person.save(userId);
  resp.json(output);
}

/**
* @api {delete} /person Delete person
* @apiName delete person
* @apiGroup People
* @apiPermission admin
*
* @apiParam {string} _id The id of the person for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Person) WHERE id(n)=2069 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":17,"high":0}}},"error":[],"msg":"Query results"}*/
const deletePerson = async(req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id==="undefined" || parameters._id==="") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id to continue.",
    });
    return false;
  }
  let person = new Person({_id: parameters._id});
  let data = await person.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}
/**
* @api {delete} /people Delete people
* @apiName delete people
* @apiGroup People
* @apiPermission admin
*
* @apiParam {array} _ids The ids of the people for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":[{"records":[],"summary":{"statement":{"text":"MATCH (n:Event) WHERE id(n)=1149 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":6,"high":0}}}],"error":[],"msg":"Query results"}
*/
const deletePeople = async(req, resp) => {
  let deleteData = req.body;
  if (typeof deleteData._ids==="undefined" || deleteData._ids.length===0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select valid ids to continue.",
    });
    return false;
  }
  let responseData = [];
  for (let i=0; i<deleteData._ids.length; i++) {
    let _id = deleteData._ids[i];
    let person = new Person({_id: _id});
    responseData.push(await person.delete());
  }
  resp.json({
    status: true,
    data: responseData,
    error: [],
    msg: "Query results",
  });
}

module.exports = {
  Person: Person,
  getPeople: getPeople,
  getPerson: getPerson,
  putPerson: putPerson,
  deletePerson: deletePerson,
  deletePeople: deletePeople,
};
