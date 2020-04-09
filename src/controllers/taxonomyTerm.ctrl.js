const driver = require("../config/db-driver");
const helpers = require("../helpers");

class TaxonomyTerm {
  constructor({_id=null,label=null,labelId=null,locked=false,inverseLabel=null,inverseLabelId=null,scopeNote=null,count=0,relations=[],createdBy=null,createdAt=null,updatedBy=null,updatedAt=null}) {
    this._id = null;
    if (_id!==null) {
      this._id = _id;
    }
    this.label = label;
    this.labelId = labelId;
    this.locked = locked;
    this.inverseLabel = inverseLabel;
    this.inverseLabelId = inverseLabelId;
    this.scopeNote = scopeNote;
    this.count = count;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedBy = updatedBy;
    this.updatedAt = updatedAt;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.label==="") {
      status = false;
      errors.push({field: "label", msg: "The label must not be empty"});
    }
    if (this.inverseLabel==="") {
      status = false;
      errors.push({field: "inverseLabel", msg: "The inverseLabel must not be empty"});
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
    if (this._id===null && this.labelId==="" && this.inverseLabelId==="") {
      return false;
    }
    let session = driver.session()
    let query = "";
    if (this._id!==null) {
      query = "MATCH (n:TaxonomyTerm) WHERE id(n)="+this._id+" return n";
    }
    else if (this.labelId!==null) {
      query = "MATCH (n:TaxonomyTerm {labelId: '"+this.labelId+"'}) return n";
    }
    else if (this.inverseLabelId!==null) {
      query = "MATCH (n:TaxonomyTerm {inverseLabelId: '"+this.inverseLabelId+"'}) return n";
    }
    else {
      return false;
    }
    let node = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      session.close();
      let records = result.records;
      if (records.length>0) {
        let record = records[0];
        let key = record.keys[0];
        let output = record.toObject()[key];
        output = helpers.outputRecord(output);
        return output;
      }
    })
    // assign results to class values
    for (let key in node) {
      this[key] = node[key];
    }
    await this.countRelations();
    await this.loadRelations();
  }

  async countRelations() {
    if (this._id===null || this.labelId==="") {
      return false;
    }
    let session = driver.session();
    let query = "MATCH ()-[r:"+this.labelId+"]->() RETURN count(*) AS c";
    let count = await session.writeTransaction(tx=>
      tx.run(query, {})
    )
    .then(result=> {
      session.close()
      let records = result.records;
      if (records.length>0) {
        let record = records[0];
        let key = record.keys[0];
        let output = record.toObject();
        helpers.prepareOutput(output);
        output = output[key];
        return output;
      }
    });
    this.count = count;
  }

  async loadRelations() {
    if (this._id===null || this.labelId==="") {
      return false;
    }
    let session = driver.session();
    let query = `MATCH (s)-[r:${this.labelId}]->(t) RETURN s,t SKIP 0 LIMIT 25`;
    let relations = await session.writeTransaction(tx=>
      tx.run(query, {})
    )
    .then(result=> {
      session.close()
      let records = result.records;
      let outputRecords = [];
      if (records.length>0) {
        outputRecords = records.map(record=>{
          let sourceKey = record.keys[0];
          let targetKey = record.keys[1];
          let output = record.toObject();
          helpers.prepareOutput(output);
          output = {
            source: output[sourceKey],
            target: output[targetKey]
          }
          return output;
        });
      }
      return outputRecords;
    });
    this.relations = relations;
  }

  async save(userId) {
    let validateTaxonomyTerm = this.validate();
    if (!validateTaxonomyTerm.status) {
      return validateTaxonomyTerm;
    }
    else {
      let session = driver.session();
      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id==="undefined" || this._id===null) {
        this.createdBy = userId;
        this.createdAt = now;
      }
      else {
        let original = new TaxonomyTerm({_id:this._id});
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      let newData = this;
      if (typeof this._id==="undefined" || this._id===null) {
        this.labelId = helpers.normalizeLabelId(this.label);
        this.inverseLabelId = helpers.normalizeLabelId(this.inverseLabel);
      }
      else {
        await this.load();
        newData.labelId = this.labelId;
        newData.inverseLabelId = this.inverseLabelId;
      }

      if (parseInt(this.count,10)>0) {
        let output = {error: ["You must remove the record's relations before updating"], status: false, data: []};
        return output;
      }
      let nodeProperties = helpers.prepareNodeProperties(newData);
      let params = helpers.prepareParams(newData);

      let query = "";
      if (typeof this._id==="undefined" || this._id===null) {
        query = "CREATE (n:TaxonomyTerm "+nodeProperties+") RETURN n";
      }
      else {
        query = "MATCH (n:TaxonomyTerm) WHERE id(n)="+this._id+" SET n="+nodeProperties+" RETURN n";
      }
      let resultPromise = await session.run(
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
    await this.load();
    if (parseInt(this.count,10)>0) {
      let output = {error: true, msg: ["You must remove the record's relations before deleting"], status: false, data: []};
      return output;
    }
    // 1. disassociate with the taxonomy
    let query1 = "MATCH (n:TaxonomyTerm)-[r]-(l:Taxonomy) WHERE id(n)="+this._id+" DELETE r";
    let deleteRel = await session.writeTransaction(tx=>
      tx.run(query1,{})
    )
    .then(result => {
      return result;
    })
    .catch((error) => {
      console.log(error)
    });
    // 2. delete term
    let query = "MATCH (n:TaxonomyTerm) WHERE id(n)="+this._id+" DELETE n";
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
* @api {get} /taxonomy-terms Get taxonomy terms
* @apiName get taxonomy terms
* @apiGroup Taxonomy terms
*
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiSuccessExample {json} Success-Response:
{
    "status": true,
    "data": {
        "currentPage": 1,
        "data": [
            {
                "inverseLabel": "Diocese",
                "inverseLabelId": "Diocese",
                "labelId": "Diocese",
                "count": 0,
                "label": "Diocese",
                "locked": false,
                "scopeNote": "A Diocese is a religious administrative location division",
                "_id": "20",
                "systemLabels": [
                    "TaxonomyTerm"
                ]
            }
        ],
        "totalItems": 60,
        "totalPages": 3
    },
    "error": [],
    "msg": "Query results"
}
*/
const getTaxonomyTerms = async (req, resp) => {
  let parameters = req.query;
  let page = 0;
  let queryPage = 0;
  let limit = 25;

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

  let skip = limit*page;
  query = "MATCH (n:TaxonomyTerm) RETURN n SKIP "+skip+" LIMIT "+limit;
  let data = await getTaxonomyTermsQuery(query, limit);
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

const getTaxonomyTermsQuery = async (query, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  })

  let nodes = helpers.normalizeRecordsOutput(nodesPromise);

  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:TaxonomyTerm) RETURN count(*)")
  )
  .then(result=> {
    session.close()
    let resultRecord = result.records[0];
    let countObj = resultRecord.toObject();
    helpers.prepareOutput(countObj);
    let output = countObj['count(*)'];
    output = parseInt(output,10);
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

/**
* @api {get} /taxonomy-term Get taxonomy term
* @apiName get taxonomy term
* @apiGroup Taxonomy terms
*
* @apiParam {string} _id The _id of the requested taxonomy term. Either the _id or the labelId or the inverseLabelId should be provided.
* @apiParam {string} labelId The labelId of the requested taxonomy term. Either the _id or the labelId or the inverseLabelId should be provided.
* @apiParam {string} inverseLabelId The inverseLabelId of the requested taxonomy term. Either the _id or the labelId or the inverseLabelId should be provided.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"87","label":"Classpiece","labelId":"Classpiece","locked":false,"inverseLabel":"Classpiece","inverseLabelId":"Classpiece","scopeNote":null,"count":"0","createdBy":null,"createdAt":null,"updatedBy":null,"updatedAt":null},"error":[],"msg":"Query results"}
*/
const getTaxonomyTerm = async(req, resp) => {
  let parameters = req.query;
  if (
    (typeof parameters._id==="undefined" || parameters._id==="") && (typeof parameters.labelId==="undefined" || parameters.labelId==="")
  ) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id to continue.",
    });
    return false;
  }
  let _id=null, labelId=null, inverseLabel=null;
  if (typeof parameters._id!=="undefined" && parameters._id!=="") {
    _id = parameters._id;
  }
  if (typeof parameters.labelId!=="undefined" && parameters.labelId!=="") {
    labelId = parameters.labelId;
  }
  if (typeof parameters.inverseLabel!=="undefined" && parameters.inverseLabel!=="") {
    inverseLabel = parameters.inverseLabel;
  }
  let query = {};
  if (_id!==null) {
    query._id = _id;
  }
  if (labelId!==null) {
    query.labelId = labelId;
  }
  if (inverseLabel!==null) {
    query.inverseLabel = inverseLabel;
  }
  let term = new TaxonomyTerm(query);
  await term.load();
  resp.json({
    status: true,
    data: term,
    error: [],
    msg: "Query results",
  });
}

/**
* @api {put} /taxonomy-term Put taxonomy term
* @apiName put taxonomy term
* @apiGroup Taxonomy terms
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the taxonomy term. This should be undefined|null|blank in the creation of a new taxonomy term.
* @apiParam {string} label The taxonomy term's label.
* @apiParam {boolean} [locked=false] If the taxonomy term can be updated or not.
* @apiParam {string} inverseLabel The taxonomy term's inverseLabel.
* @apiParam {string} [scopeNote] A scopeNote about the taxonomy term.
* @apiExample {json} Example:
* {
  "label":"Test",
  "description":"test description"
}
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"error":[],"status":true,"data":{"inverseLabel":"enteredSchool","inverseLabelId":"enteredSchool","updatedBy":"260","labelId":"enteredSchool","count":"0","_id":"102","label":"enteredSchool","locked":false,"updatedAt":"2020-01-15T15:02:48.163Z"}},"error":[],"msg":"Query results"}
*/
const putTaxonomyTerm = async(req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length===0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "The taxonomy term must not be empty",
    });
    return false;
  }
  let userId = req.decoded.id;
  let term = new TaxonomyTerm(postData);
  let data = await term.save(userId);
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

/**
* @api {delete} /taxonomy-term Delete taxonomy term
* @apiName delete taxonomy term
* @apiGroup Taxonomy terms
* @apiPermission admin
*
* @apiParam {string} _id The id of the taxonomy term for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:TaxonomyTerm) WHERE id(n)=2500 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":1,"high":0},"resultAvailableAfter":{"low":9,"high":0}}},"error":[],"msg":"Query results"}
*/
const deleteTaxonomyTerm = async(req, resp) => {
  let postData = req.body;
  let term = new TaxonomyTerm(postData);
  let data = await term.delete();
  let output = {};
  if (data.error) {
    output = data;
  }
  else {
    output = {
      status: true,
      data: data,
      error: [],
      msg: "Query results",
    }
  }
  resp.json(output);
}

module.exports = {
  TaxonomyTerm: TaxonomyTerm,
  getTaxonomyTerms: getTaxonomyTerms,
  getTaxonomyTerm: getTaxonomyTerm,
  putTaxonomyTerm: putTaxonomyTerm,
  deleteTaxonomyTerm: deleteTaxonomyTerm,
};
