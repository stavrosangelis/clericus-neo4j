const driver = require("../config/db-driver");

const helpers = require("../helpers");

class Person {
  constructor({_id=null,label=null,honorificPrefix=null,firstName=null,middleName=null,lastName=null,fnameSoundex=null,lnameSoundex=null,alternateAppelations=[],description=null,status=false}) {
    if (typeof _id!=="undefined" && _id!==null) {
      this._id = _id;
    }
    this.honorificPrefix = honorificPrefix;
    this.firstName = firstName;
    this.middleName = middleName;
    this.lastName = lastName;
    this.fnameSoundex = fnameSoundex;
    this.lnameSoundex = lnameSoundex;
    this.alternateAppelations = alternateAppelations;
    this.description = description;
    this.status = status;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.firstName.length<2) {
      status = false;
      errors.push({field: "firstName", msg: "First name must contain at least 2 characters"});
    }
    if (this.middleName!=="" && this.firstName.length<2) {
      status = false;
      errors.push({field: "middleName", msg: "If middle name is entered it must contain at least 2 characters"});
    }
    if (this.lastName.length<2) {
      status = false;
      errors.push({field: "lastName", msg: "Last name must contain at least 2 characters"});
    }
    if (this.alternateAppelations.length>0) {
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
  }

  async save() {
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

const getPeople = async (req, resp) => {
  let parameters = req.query;
  let label = "";
  let firstName = "";
  let lastName = "";
  let fnameSoundex = "";
  let lnameSoundex = "";
  let _id = "";
  let description = "";
  let page = 0;
  let queryPage = 0;
  let limit = 25;

  let query = {};
  let $and = [];

  /*if (typeof parameters.label!=="undefined") {
    label = parameters.label;
    if (label!=="") {
      let queryBlock = {
        '$or':[
        {"firstName": {"$regex": label, "$options": "i"}},
        {"lastName": {"$regex": label, "$options": "i"}}
      ]}
      $and.push(queryBlock);
    }
  }
  if (typeof parameters.firstName!=="undefined") {
    firstName = parameters.firstName;
    if (firstName!=="") {
      let queryBlock = {"firstName": {"$regex": firstName, "$options": "i"}};
      $and.push(queryBlock);
    }
  }
  if (typeof parameters.lastName!=="undefined") {
    lastName = parameters.lastName;
    if (lastName!=="") {
      let queryBlock = {"lastName": {"$regex": lastName, "$options": "i"}};
      $and.push(queryBlock);
    }
  }
  if (typeof parameters.fnameSoundex!=="undefined") {
    fnameSoundex = helpers.soundex(parameters.fnameSoundex);
    let queryBlock = {"fnameSoundex": fnameSoundex};
    $and.push(queryBlock);
  }
  if (typeof parameters.lnameSoundex!=="undefined") {
    lnameSoundex = helpers.soundex(parameters.lnameSoundex);
    let queryBlock = {"lnameSoundex": lnameSoundex};
    $and.push(queryBlock);
  }
  if (typeof parameters.description!=="undefined") {
    description = parameters.description.toLowerCase();
    if (description!=="") {
      let queryBlock = {"description": {"$regex": description, "$options": "i"}};
      $and.push(queryBlock);
    }
  }
  if ($and.length>0) {
    query = {$and};
  }*/
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
  query = "MATCH (n:Person) RETURN n SKIP "+skip+" LIMIT "+limit;
  let data = await getPeopleQuery(query, limit);
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

const getPeopleQuery = async (query, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  })

  let nodes = helpers.normalizeRecordsOutput(nodesPromise);
  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Person) RETURN count(*)")
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
    nodes: nodes,
    count: count,
    totalPages: totalPages
  }
  return result;
}

const getPerson = async(req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id==="undefined" && parameters._id==="") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id to continue.",
    });
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

const putPerson = async(req, resp) => {
  let postData = req.body;
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
  let person = new Person(personData);
  let output = await person.save();
  resp.json(output);
}

const deletePerson = async(req, resp) => {
  let parameters = req.query;
  let person = new Person({_id: parameters._id});
  let data = await person.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

module.exports = {
  getPeople: getPeople,
  getPerson: getPerson,
  putPerson: putPerson,
  deletePerson: deletePerson,
};
