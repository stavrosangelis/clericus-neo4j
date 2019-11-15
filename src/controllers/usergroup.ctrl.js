const driver = require("../config/db-driver");
const helpers = require("../helpers");

class Usergroup {
  constructor({_id=null,label=null,description=null,isAdmin=false,isDefault=false}) {
    this._id = _id;
    if(_id!==null) {
      this._id = _id;
    }
    this.label = label;
    this.description = description;
    this.isAdmin = isAdmin;
    this.isDefault = isDefault;
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

const getUsergroups = async (req, resp) => {
  let parameters = req.query;
  let label = "";
  let page = 0;
  let queryPage = 0;
  let limit = 25;

  let query = {};
  let $and = [];

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
  query = "MATCH (n:Usergroup) RETURN n SKIP "+skip+" LIMIT "+limit;
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

const getUsergroup = async(req, resp) => {
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
  let usergroup = new Usergroup({_id: _id});
  await usergroup.load();
  resp.json({
    status: true,
    data: usergroup,
    error: [],
    msg: "Query results",
  });
}

const putUsergroup = async(req, resp) => {
  let postData = req.body;
  let usergroup = new Usergroup(postData);
  let output = await usergroup.save();
  resp.json(output);
}

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
