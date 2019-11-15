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

    // relations
    let events = await helpers.loadRelations(this._id, "Organisation", "Event");
    let organisations = await helpers.loadRelations(this._id, "Organisation", "Organisation");
    let people = await helpers.loadRelations(this._id, "Organisation", "Person");
    let resources = await helpers.loadRelations(this._id, "Organisation", "Resource");
    this.events = events;
    this.organisations = organisations;
    this.people = people;
    this.resources = resources;
  }

  async save() {
    let validateOrganisation = this.validate();
    if (!validateOrganisation.status) {
      return validateOrganisation;
    }
    else {
      let session = driver.session();
      if (this.labelSoundex===null) {
        this.labelSoundex = helpers.soundex(this.label.trim());
      }
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

  let query = "";
  let queryParams = "";

  if (typeof parameters.label!=="undefined") {
    label = parameters.label;
    if (label!=="") {
      queryParams = "LOWER(n.label) =~ LOWER('.*"+label+".*') ";
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
  query = "MATCH (n:Organisation) "+queryParams+" RETURN n SKIP "+skip+" LIMIT "+limit;
  let data = await getOrganisationsQuery(query, queryParams, limit);
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

const getOrganisationsQuery = async (query, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  })

  let nodes = helpers.normalizeRecordsOutput(nodesPromise);
  // get related resources
  let nodeResourcesPromises = nodes.map(node => {
    let newPromise = new Promise(async (resolve,reject)=> {
      let relations = {};
      relations.nodeId = node._id;
      relations.resources = await helpers.loadRelations(node._id, "Organisation", "Resource");
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
    if (typeof findResources!=="undefined") {
      resources = nodeResources;
    }
    node.resources = nodeResources.resources;
    return node;
  });
  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Organisation) "+queryParams+" RETURN count(*)")
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
    nodes: nodesPopulated,
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
        organisationData.labelSoundex = helpers.soundex(postData.label.trim());
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
  Organisation: Organisation,
  getOrganisations: getOrganisations,
  getOrganisation: getOrganisation,
  putOrganisation: putOrganisation,
  deleteOrganisation: deleteOrganisation,
};
