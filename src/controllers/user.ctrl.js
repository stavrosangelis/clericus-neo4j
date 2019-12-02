const driver = require("../config/db-driver");
const fs = require("fs");
const helpers = require("../helpers");
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const privateKey = fs.readFileSync('./src/config/.private.key', 'utf8');
const referencesController = require('../controllers/references.ctrl');

class User {
  constructor({_id=null,firstName=null,lastName=null,email=null,password=null,token=false, isAdmin=false, usergroup=null,createdBy=null,createdAt=null,updatedBy=null,updatedAt=null}) {
    this._id = null;
    if (_id!==null) {
      this._id = _id;
    }
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.usergroup = usergroup;
    if (password!==null) {
      this.password = password;
    }
    if (token!==null) {
      this.token = token;
    }
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedBy = updatedBy;
    this.updatedAt = updatedAt;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.email==="") {
      status = false;
      errors.push({field: "email", msg:  "The email must not be empty"});
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
    let query = "MATCH (n:User)-[r:belongsToUserGroup]-(ug:Usergroup) WHERE id(n)="+this._id+" return n,ug";
    let node = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      session.close();
      let records = result.records;
      if (records.length>0) {
        let record = records[0];
        let user = record.toObject().n;
        user = helpers.outputRecord(user);
        let userGroup = record.toObject().ug;
        userGroup = helpers.outputRecord(userGroup);
        user.usergroup = userGroup;
        return user;
      }
    })
    // assign results to class values
    for (let key in node) {
      this[key] = node[key];
    }
    let hasPassword = false;
    if (typeof this.password!=="undefined") {
      hasPassword = true;
    }
    this.hasPassword = hasPassword;
    delete this.password;
    delete this.token;
  }

  async save() {
    let newData = Object.assign({}, this);
    let validateUser = this.validate();
    if (!validateUser.status) {
      return validateUser;
    }
    else {
      let session = driver.session();
      this.password = null;
      await this.load();
      let nodeProperties = helpers.prepareNodeProperties(newData);
      let params = helpers.prepareParams(newData);

      let query = "";
      if (typeof this._id==="undefined" || this._id===null) {
        query = "CREATE (n:User "+nodeProperties+") RETURN n";
      }
      else {
        query = "MATCH (n:User) WHERE id(n)="+this._id+" SET n="+nodeProperties+" RETURN n";
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
      if (resultPromise.status) {
        // add | update user group
        let savedRecord = resultPromise.data;
        if (newData.usergroup!==null && newData.usergroup!==savedRecord.usergroup._id) {
          if (typeof savedRecord.usergroup!=="undefined") {
            // 1. remove reference to usergroup
            let existingUsergroupRef = {
              items: [
                {_id: savedRecord._id, type: "User"},
                {_id: savedRecord.usergroup, type: "Usergroup"}
              ],
              taxonomyTermLabel: "belongsToUserGroup",
            }
            referencesController.removeReference(existingUsergroupRef);
          }

          // 2. add reference to new usergroup
          let newUsergroupRef = {
            items: [
              {_id: savedRecord._id, type: "User"},
              {_id: newData.usergroup, type: "Usergroup"}
            ],
            taxonomyTermLabel: "belongsToUserGroup",
          }
          referencesController.updateReference(newUsergroupRef);
        }
      }
      return resultPromise;
    }
  }

  async updatePassword() {
    await this.setPassword(this.password);
    let query = "MATCH (n:User) WHERE id(n)="+this._id+" SET n.password='"+this.password+"' RETURN n";
    let session = driver.session()
    const resultPromise = await session.run(
      query,
      {}
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

  async delete() {
    if (this._id===null) {
      return false;
    }
    await this.load();
    if (this.usergroup.isAdmin) {
      return {error: ["Users belonging to the admin user group cannot be deleted. To delete this user you must first change the usergroup to something other than Admin"], status: false, data: []};
    }
    let session = driver.session();
    // 1. delete relations
    let query1 = "MATCH (n:User)-[r]-() WHERE id(n)="+this._id+" DELETE r";
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
    let query = "MATCH (n:User) WHERE id(n)="+this._id+" DELETE n";
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

  async setPassword(password) {
    this.password = await argon2.hash(password);
  };

  async validatePassword(password) {
    const passwordVerify = await argon2.verify(this.password, password);
    let newpass = await argon2.hash(password)
    return passwordVerify;
  };

  generateJWT() {
    let today = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(today.getDate()+1);
    let signOptions = {
      issuer:  "Clericus app",
      email: this.email,
      id: this._id,
      expiresIn:  expirationDate,
      algorithm:  "RS256",
      isAdmin: this.usergroup.isAdmin,
    };
    return jwt.sign(signOptions, privateKey);
  }

};

const getUsers = async (req, resp) => {
  let parameters = req.query;
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
  query = "MATCH (n:User) RETURN n SKIP "+skip+" LIMIT "+limit;
  let data = await getUsersQuery(query, limit);
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

const getUsersQuery = async (query, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  })

  let nodesResults = helpers.normalizeRecordsOutput(nodesPromise);
  let nodes = nodesResults.map(node=> {
    delete node.password;
    delete node.token;
    return node;
  })

  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:User) RETURN count(*)")
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

const getUser = async(req, resp) => {
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
  let user = new User({_id: _id});
  await user.load();
  resp.json({
    status: true,
    data: user,
    error: [],
    msg: "Query results",
  });
}

const putUser = async(req, resp) => {
  let postData = req.body;
  let userData = {};
  for (let key in postData) {
    if (postData[key]!==null) {
      userData[key] = postData[key];
      // add the soundex
      if (key==='firstName') {
        userData.fnameSoundex = helpers.soundex(postData.firstName.trim());
      }
      if (key==='lastName') {
        userData.lnameSoundex = helpers.soundex(postData.lastName.trim());
      }
    }
  }
  let now = new Date().toISOString();
  let userId = req.decoded.id;
  if (typeof userData._id==="undefined" || userData._id===null) {
    userData.createdBy = userId;
    userData.createdAt = now;
  }
  userData.updatedBy = userId;
  userData.updatedAt = now;
  let user = new User(userData);
  let output = await user.save();
  resp.json(output);
}

const deleteUser = async(req, resp) => {
  let parameters = req.body;
  let user = new User({_id: parameters._id});
  let output = await user.delete();
  resp.json(output);
}

const updateUserPassword = async (req, resp) => {
  let postData = req.body;
  let decoded = req.decoded;
  if (typeof decoded==="undefined") {
    resp.json({
      status: false,
      data: [],
      error: "Unauthorised access",
      msg: "",
    });
  }
  let _id = postData._id;
  let user = new User({_id: _id});
  await user.load();
  let responseData = [];
  if (decoded.isAdmin || _id===user._id) {
    user.password = postData.password;
    responseData = await user.updatePassword();
    delete responseData.password;
  }
  resp.json({
    status: true,
    data: responseData,
    error: [],
    msg: "",
  });
}

module.exports = {
  User: User,
  getUsers: getUsers,
  getUser: getUser,
  putUser: putUser,
  deleteUser: deleteUser,
  updateUserPassword: updateUserPassword,
};
