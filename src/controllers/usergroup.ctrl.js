const driver = require("../config/db-driver");
const helpers = require("../helpers");

class Usergroup {
  constructor({_id=null,label=null,description=null,isAdmin=false,isDefault=false,createdBy=null,createdAt=null,updatedBy=null,updatedAt=null}) {
    this._id = _id;
    if(_id!==null) {
      this._id = _id;
    }
    this.label = label;
    this.description = description;
    this.isAdmin = isAdmin;
    this.isDefault = isDefault;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedBy = updatedBy;
    this.updatedAt = updatedAt;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.label=="") {
      status = false;
      errors.push({field: "label", msg:  "The label must not be empty"});
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
    if (this._id===null && this.label==="") {
      return false;
    }
    let session = driver.session();
    let query = "";

    if (this._id!==null) {
      query = "MATCH (n:Usergroup) WHERE id(n)="+this._id+" return n";
    }
    else if (this.label!==null) {
      query = "MATCH (n:Usergroup {label: '"+this.label+"'}) return n";
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
  }

  async save() {
    let validateUsergroup = this.validate();
    if (!validateUsergroup.status) {
      return validateUsergroup;
    }
    else {
      let session = driver.session();
      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id==="undefined" || this._id===null) {
        if (typeof this._id==="userId" && this.userId!==null) {
          this.createdBy = this.userId;
        }
        this.createdAt = now;
      }
      if (typeof this._id==="userId" && this.userId!==null) {
        this.updatedBy = this.userId;
        delete this.userId;
      }
      this.updatedAt = now;
      let nodeProperties = helpers.prepareNodeProperties(this);
      let params = helpers.prepareParams(this);

      let query = "";
      if (typeof this._id==="undefined" || this._id===null) {
        query = "CREATE (n:Usergroup "+nodeProperties+") RETURN n";
      }
      else {
        query = "MATCH (n:Usergroup) WHERE id(n)="+this._id+" SET n="+nodeProperties+" RETURN n";
      }
      // ensure that there is always only one default usergroup
      if (this.isDefault) {
        if (this.isAdmin) {
          let output = {error: ["You can only set a public usergroup as default"], status: false, data: []};
          return output;
        }
        let queryDefault = "MATCH (n:Usergroup) WHERE n.isDefault=true SET n.isDefault=false RETURN n";
        const resultPromise = await session.run(
          queryDefault,
          {}
        ).then(result => {
          session.close();
          return result;
        })
        .catch((error) => {
          console.log(error)
        });
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
        let output = {error: error, status: false, data: []};
        return output;
      });
      return resultPromise;
    }
  }

  async delete() {
    if (this._id===null) {
      return false;
    }
    await this.load();
    if (this.isDefault) {
      let output = {error: "This is the default user group. If you wish to remove it please set another group as default first.", status: false, data: []};
      return output;
    }
    let session = driver.session();
    let count = await session.writeTransaction(tx=>
      tx.run("MATCH (n:User)-[r]->(rn:Usergroup) WHERE id(rn)="+this._id+" RETURN count(*) AS c")
    )
    .then(result=> {
      session.close()
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['c'];
      return output;
    });
    if (count>0) {
      let output = {error: "This usergroup is associated with users. If you wish to delete it you must first remove these associations.", status: false, data: []};
      return output;
    }
    let query = "MATCH (n:Usergroup) WHERE id(n)="+this._id+" DELETE n";
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
    return {status: true, error: [], data: deleteRecord};
  }


};

/**
* @api {get} /user-groups Get usergroups
* @apiName get usergroups
* @apiGroup Usergroups
* @apiPermission admin
*
* @apiParam {string} [orderField=firstName] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"currentPage":1,"data":[{"description":"This group has only access to the front-end","isDefault":true,"isAdmin":false,"label":"Public","_id":"240","systemLabels":["Usergroup"]},{"description":"This group has access to the back-end","isDefault":false,"isAdmin":true,"label":"Administrator","_id":"401","systemLabels":["Usergroup"]}],"totalItems":2,"totalPages":1},"error":[],"msg":"Query results"}
*/
const getUsergroups = async (req, resp) => {
  let parameters = req.query;
  let page = 0;
  let orderField = "label";
  let queryPage = 0;
  let queryOrder = "";
  let limit = 25;

  let query = {};
  let $and = [];

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
  query = "MATCH (n:Usergroup) RETURN n "+queryOrder+" SKIP "+skip+" LIMIT "+limit;
  let data = await getUsergroupsQuery(query, limit);
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

const getUsergroupsQuery = async (query, limit) => {
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

  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Usergroup) RETURN count(*)")
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
* @api {get} /user-group Get usergroup
* @apiName get usergroup
* @apiGroup Usergroups
* @apiPermission admin
*
* @apiParam {string} _id The _id of the requested usergroup.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"240","label":"Public","description":"This group has only access to the front-end","isAdmin":false,"isDefault":true,"createdBy":null,"createdAt":null,"updatedBy":null,"updatedAt":null},"error":[],"msg":"Query results"}
*/
const getUsergroup = async(req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id==="undefined" || parameters._id==="") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id to continue.",
    });
  }
  let _id = parameters._id;
  let usergroup = new Usergroup({_id: _id});
  await usergroup.load();
  resp.json({
    status: true,
    data: usergroup,
    error: [],
    msg: "Query results",
  });
}

/**
* @api {put} /user-group Put usergroup
* @apiName put usergroup
* @apiGroup Usergroups
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the usergroup. This should be undefined|null|blank in the creation of a new usergroup.
* @apiParam {string} label The usergroup's label.
* @apiParam {boolean} [isAdmin=false] If the usergroup has access to the administration back-end.
* @apiParam {boolean} [isDefault=false] If this is the default usergroup.

* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"2656","label":"test","description":"","isAdmin":false,"isDefault":false,"createdBy":"260","createdAt":"2020-01-15T17:03:23.588Z","updatedBy":"260","updatedAt":"2020-01-15T17:03:23.588Z"},"error":[],"msg":"Query results"}
*/
const putUsergroup = async(req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length===0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "The user group must not be empty",
    });
    return false;
  }
  let userId = req.decoded.id;
  postData.userId = userId;

  let usergroup = new Usergroup(postData);
  let output = await usergroup.save();
  resp.json(output);
}

/**
* @api {delete} /usergroup Delete usergroup
* @apiName delete usergroup
* @apiGroup Usergroups
* @apiPermission admin
*
* @apiParam {string} _id The id of the usergroup for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"error":[],"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Usergroup) WHERE id(n)=2656 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":11,"high":0}}}}
*/
const deleteUsergroup = async(req, resp) => {
  let parameters = req.body;
  let usergroup = new Usergroup(parameters);
  let output = await usergroup.delete();
  resp.json(output);
}

module.exports = {
  Usergroup: Usergroup,
  getUsergroups: getUsergroups,
  getUsergroup: getUsergroup,
  putUsergroup: putUsergroup,
  deleteUsergroup: deleteUsergroup,
};
