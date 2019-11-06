const driver = require("../config/db-driver");
const helpers = require("../helpers");

class Organisation {
  constructor({_id=null,label=null,labelSoundex=null,description=null,organisationType=null,status=false}) {
    this._id = null;
    if (_id!==null) {
      this._id = _id;
    }
    this.label = label;
    this.labelSoundex = labelSoundex;
    this.description = description;
    this.organisationType = organisationType;
    this.status = status;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.label==="") {
      status = false;
      errors.push({field: "label", msg: "The label must not be empty"});
    }
    let msg = "The record is valid";
    if (!status) {
      msg = "The record is not valid";
    }
    let output = {
      status: status,
      msg: msg,
      errors: errors
    }
    return output;
  }

  async load() {
    if (this._id===null) {
      return false;
    }
    let session = driver.session()
    let query = "MATCH (n:Organisation) WHERE id(n)="+this._id+" return n";
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
    }
  }

  async save() {
    let validateOrganisation = this.validate();
    if (!validateOrganisation.status) {
      return validateOrganisation;
    }
    else {
      let session = driver.session();
      let nodeProperties = helpers.prepareNodeProperties(this);
      let params = helpers.prepareParams(this);

      let query = "";
      if (typeof this._id==="undefined" || this._id===null) {
        query = "CREATE (n:Organisation "+nodeProperties+") RETURN n";
      }
      else {
        query = "MATCH (n:Organisation) WHERE id(n)="+this._id+" SET n="+nodeProperties+" RETURN n";
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
    let tx = session.beginTransaction()
    let query = "MATCH (n:Organisation) WHERE id(n)="+this._id+" DELETE n";
    const resultPromise = await new Promise((resolve, reject)=> {
      let result = session.run(
        query,
        {}
      ).then(result => {
        session.close();
        resolve(result);
      });
    })
    return resultPromise;
  }


};

const getOrganisations = async (req, resp) => {
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
  query = "MATCH (n:Organisation) RETURN n SKIP "+skip+" LIMIT "+limit;
  let data = await getOrganisationsQuery(query, limit);
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

const getOrganisationsQuery = async (query, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  })

  let nodes = helpers.normalizeRecordsOutput(nodesPromise);

  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Organisation) RETURN count(*)")
  )
  .then(result=> {
    session.close()
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

const getOrganisation = async(req, resp) => {
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
  let organisation = new Organisation({_id:_id});
  await organisation.load();
  resp.json({
    status: true,
    data: organisation,
    error: [],
    msg: "Query results",
  });
}

const putOrganisation = async(req, resp) => {
  let postData = req.body;
  let organisationData = {};
  for (let key in postData) {
    if (postData[key]!==null) {
      organisationData[key] = postData[key];
      // add the soundex
      if (key==='label') {
        organisationData.lnameSoundex = helpers.soundex(postData.label.trim());
      }
    }
  }
  let organisation = new Organisation(organisationData);
  let data = await organisation.save();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

const deleteOrganisation = async(req, resp) => {
  let parameters = req.query;
  let organisation = new Organisation();
  let data = await organisation.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

module.exports = {
  getOrganisations: getOrganisations,
  getOrganisation: getOrganisation,
  putOrganisation: putOrganisation,
  deleteOrganisation: deleteOrganisation,
};
