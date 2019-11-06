const driver = require("../config/db-driver");
const helpers = require("../helpers");

class Usergroup {
  constructor({_id=null,label=null,description=null,isAdmin=false,isDefault=false}) {
    if (typeof _id!=="undefined" && _id!==null) {
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
    if (this._id===null) {
      return false;
    }
    let session = driver.session()
    let query = "MATCH (n:Usergroup) WHERE id(n)="+this._id+" return n";
    let node = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      session.close();
      if (result.records.length>0) {
        let record = result.records[0];
        let outputRecord = record.toObject();
        helpers.prepareOutput(outputRecord);
        outputRecord.n._id = outputRecord.n.identity;
        delete(outputRecord.n.identity);
        return outputRecord;
      }
    })
    return node;
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
      const resultPromise = await new Promise((resolve, reject)=> {
        let result = session.run(
          query,
          params
        ).then(result => {
          session.close();
          let outputRecord = result.records[0].toObject();
          helpers.prepareOutput(outputRecord);
          outputRecord.n._id = outputRecord.n.identity;
          delete(outputRecord.n.identity);
          resolve(outputRecord);
        });
      })
      return resultPromise;
    }
  }

  async delete() {
    if (this._id===null) {
      return false;
    }
    let session = driver.session()
    let tx = session.beginTransaction()
    let query = "MATCH (n:Usergroup) WHERE id(n)="+this._id+" DELETE n";
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

  let skip = limit*page;
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
  })

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
  let data = await usergroup.load();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

const putUsergroup = async(req, resp) => {
  let postData = req.body;
  let usergroupData = {};
  for (let key in postData) {
    if (postData[key]!==null) {
      usergroupData[key] = postData[key];
      // add the soundex
      if (key==='firstName') {
        usergroupData.fnameSoundex = helpers.soundex(postData.firstName.trim());
      }
      if (key==='lastName') {
        usergroupData.lnameSoundex = helpers.soundex(postData.lastName.trim());
      }
    }
  }
  let usergroup = new Usergroup(usergroupData);
  let data = await usergroup.save();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

const deleteUsergroup = async(req, resp) => {
  let parameters = req.query;
  let usergroup = new Usergroup();
  let data = await usergroup.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

module.exports = {
  Usergroup: Usergroup,
  getUsergroups: getUsergroups,
  getUsergroup: getUsergroup,
  putUsergroup: putUsergroup,
  deleteUsergroup: deleteUsergroup,
};
