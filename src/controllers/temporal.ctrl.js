const driver = require("../config/db-driver");
const helpers = require("../helpers");

class Temporal {
  constructor({_id=null,label=null,startDate=null,endDate=null,format=null,createdBy=null,createdAt=null,updatedBy=null,updatedAt=null}) {
    if (_id!==null) {
      this._id = _id;
    }
    this.label = label;
    this.startDate = startDate;
    this.endDate = endDate;
    this.format = format;
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
    let query = "MATCH (n:Temporal) WHERE id(n)="+this._id+" return n";
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
      else return {};
    })
    .catch((error) => {
      console.log(error)
    });
    for (let key in node) {
      this[key] = node[key];
    }
    // relations
    let events = await helpers.loadRelations(this._id, "Temporal", "Event");
    this.events = events;
  }

  async countRelations() {
    if (this._id===null || this.label==="") {
      return false;
    }
    let session = driver.session();
    let query = "MATCH (n)-[r]->() WHERE id(n)="+this._id+" RETURN count(*) AS c";
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

  async save(userId) {
    let validateTemporal = this.validate();
    if (!validateTemporal.status) {
      return validateTemporal;
    }
    else {
      let session = driver.session();
      let query = "";
      let params = {};
      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id==="undefined" || this._id===null) {
        this.createdBy = userId;
        this.createdAt = now;
      }
      else {
        let original = new Temporal({_id:this._id});
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      if (typeof this._id==="undefined" || this._id===null) {
        let nodeProperties = helpers.prepareNodeProperties(this);
        params = helpers.prepareParams(this);
        query = "CREATE (n:Temporal "+nodeProperties+") RETURN n";
      }
      else {
        let update = "";
        let i=0;
        for (let key in this) {
          if (i>0) {
            update +=",";
          }
          if (typeof this[key]==="string") {
            update += " n."+key+"='"+this[key]+"'";
          }
          else {
            update += " n."+key+"="+this[key];
          }
          i++;
        }
        query = "MATCH (n:Temporal) WHERE id(n)="+this._id+" SET "+update+" RETURN n";
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
      })
      .catch((error) => {
        let output = {error: error, status: false, data: []};
        return output;
      });
      return resultPromise;
    }
  }

  async delete() {
    let session = driver.session();
    await this.countRelations();
    if (parseInt(this.count,10)>0) {
      let output = {error: ["You must remove the record's relations before deleting"], status: false, data: []};
      return output;
    }
    let query = "MATCH (n:Temporal) WHERE id(n)="+this._id+" DELETE n";
    let deleteRecord = await session.writeTransaction(tx=>
      tx.run(query,{})
    ).then(result => {
      session.close();
      return result;
    });
    return deleteRecord;
  }

}
/**
* @api {get} /temporals Get temporals
* @apiName get temporals
* @apiGroup Temporals
*
* @apiParam {string} [label] A label to match against the temporals' label.
* @apiParam {string} [orderField=firstName] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
*
* @apiExample {request} Example:
http://localhost:5100/api/temporals?page=1&limit=25
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"currentPage":1,"data":[{"createdAt":"2020-01-17T10:07:49.237Z","updatedBy":"260","createdBy":"260","endDate":"1999","format":"","label":"00s","startDate":"1990","updatedAt":"2020-01-17T10:07:49.237Z","_id":"2514","systemLabels":["Temporal"]}],"totalItems":"1","totalPages":1},"error":[],"msg":"Query results"}
*/
const getTemporals = async (req, resp) => {
  let parameters = req.query;
  let systemType = null;
  let page = 0;
  let orderField = "label";
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
  query = "MATCH (n:Temporal) "+queryParams+" RETURN n "+queryOrder+" SKIP "+skip+" LIMIT "+limit;
  let data = await getTemporalsQuery(query, queryParams, limit);
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

const getTemporalsQuery = async (query, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  })
  let nodes = helpers.normalizeRecordsOutput(nodesPromise);
  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Temporal) "+queryParams+" RETURN count(*)")
  )
  .then(result=> {
    session.close();
    let resultRecord = result.records[0];
    let countObj = resultRecord.toObject();
    helpers.prepareOutput(countObj);
    let output = countObj['count(*)'];
    return output;
  });
  let totalPages = Math.ceil(count/limit);
  let result = {
    nodes: nodes,
    count: count,
    totalPages: totalPages
  }
  return result;
}

/**
* @api {get} /temporal Get temporal
* @apiName get temporal
* @apiGroup Temporals
*
* @apiParam {string} _id The _id of the requested temporal
*
* @apiExample {request} Example:
http://localhost:5100/api/temporal?_id=2514
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"2514","label":"00s","startDate":"1990","endDate":"1999","format":"","createdBy":"260","createdAt":"2020-01-17T10:07:49.237Z","updatedBy":"260","updatedAt":"2020-01-17T10:07:49.237Z","events":[]},"error":[],"msg":"Query results"}
*/
const getTemporal = async(req, resp) => {
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
  let _id=null;
  if (typeof parameters._id!=="undefined" && parameters._id!=="") {
    _id = parameters._id;
  }
  let query = {_id: _id};
  let temporal = new Temporal(query);
  await temporal.load();
  resp.json({
    status: true,
    data: temporal,
    error: [],
    msg: "Query results",
  });
}

/**
* @api {put} /temporal Put temporal
* @apiName put temporal
* @apiGroup Temporals
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the temporal. This should be undefined|null|blank in the creation of a new temporal.
* @apiParam {string} label The temporal's label.
* @apiParam {string} [startDate] The temporal's start date.
* @apiParam {string} [endDate] The temporal's end date.
* @apiParam {string} [format] The temporal's date format.
*
* @apiExample {json} Example:
{"label":"00s","startDate":"1990","endDate":"1999","format":""}
*
* @apiSuccessExample {json} Success-Response:
{"error":[],"status":true,"data":{"createdAt":"2020-01-17T10:07:49.237Z","updatedBy":"260","createdBy":"260","endDate":"1999","format":"","label":"00s","startDate":"1990","updatedAt":"2020-01-17T10:07:49.237Z","_id":"2514"}}

*/
const putTemporal = async(req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length===0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "The temporal must not be empty",
    });
    return false;
  }
  let userId = req.decoded.id;
  let temporal = new Temporal(postData);
  let output = await temporal.save(userId);
  resp.json(output);
}

/**
* @api {delete} /temporal Delete temporal
* @apiName delete temporal
* @apiGroup Temporals
* @apiPermission admin
*
* @apiParam {string} _id The id of the temporal for deletion.
*
* @apiExample {request} Example:
http://localhost:5100/api/temporal?_id=2514
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Temporal) WHERE id(n)=2514 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":1,"high":0}}},"error":[],"msg":"Query results"}
*/
const deleteTemporal = async(req, resp) => {
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
  let temporal = new Temporal({_id: parameters._id});
  let data = await temporal.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

module.exports = {
  Temporal: Temporal,
  getTemporals: getTemporals,
  getTemporal: getTemporal,
  putTemporal: putTemporal,
  deleteTemporal: deleteTemporal,
};
