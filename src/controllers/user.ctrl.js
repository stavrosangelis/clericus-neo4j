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
    let session = driver.session();
    let query = `MATCH (n:User) WHERE id(n)=${this._id} return n`;
    let node = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      let records = result.records;
      if (records.length>0) {
        let record = records[0];
        let user = record.toObject().n;
        user = helpers.outputRecord(user);
        return user;
      }
    });
    let query2 = `MATCH (u)-[r:belongsToUserGroup]-(ug) WHERE id(u)=${this._id} return u,ug`;
    let ug = await session.writeTransaction(tx=>
      tx.run(query2,{})
    )
    .then(result=> {
      let records = result.records;
      if (records.length>0) {
        session.close();
        let record = records[0];
        let usergroup = record.toObject().ug;
        usergroup = helpers.outputRecord(usergroup);
        return usergroup;
      }
    });
    if (typeof ug==="undefined") {
      let session = driver.session()
      let query2 = `MATCH (n:Usergroup) WHERE id(n)=${node.usergroup} return n`;
      ug = await session.writeTransaction(tx=>
        tx.run(query2,{})
      )
      .then(result=> {
        let records = result.records;
        if (records.length>0) {
          session.close();
          let record = records[0];
          let usergroup = record.toObject().n;
          usergroup = helpers.outputRecord(usergroup);
          return usergroup;
        }
      });
    }
    if (typeof ug!=="undefined") {
      node.usergroup = ug;
    }
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

  async save(userId) {
    let newData = Object.assign({}, this);
    let validateUser = this.validate();
    if (!validateUser.status) {
      return validateUser;
    }
    else {
      await this.load();
      let session = driver.session();
      let params = {};
      let query = "";

      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id==="undefined" || this._id===null) {
        this.createdBy = userId;
        this.createdAt = now;
      }
      else {
        let original = new User({_id:this._id});
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      if (typeof this._id==="undefined" || this._id===null) {
        let nodeProperties = helpers.prepareNodeProperties(newData);
        params = helpers.prepareParams(newData);
        query = "CREATE (n:User "+nodeProperties+") RETURN n";
      }
      else {
        let update = "";
        let i=0;
        for (let key in newData) {
          if (i>0) {
            update +=",";
          }
          if (typeof newData[key]==="string") {
            update += " n."+key+"='"+newData[key]+"'";
          }
          else {
            update += " n."+key+"="+newData[key];
          }
          i++;
        }
        query = "MATCH (n:User) WHERE id(n)="+this._id+" SET "+update+" RETURN n";
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
        if (newData.usergroup!==null) {

          // update reference to usergroup
          let newUsergroupRef = {
            items: [
              {_id: this._id, type: "User"},
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
    if (this.usergroup!==null && this.usergroup.isAdmin) {
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

/**
* @api {get} /users Get users
* @apiName get users
* @apiGroup Users
* @apiPermission admin
*
* @apiParam {string} [orderField=firstName] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"currentPage":1,"data":[{"firstName":"Admin","lastName":"","email":"admin@test.com","_id":"260","systemLabels":["User"]}],"totalItems":1,"totalPages":1},"error":[],"msg":"Query results"}
*/
const getUsers = async (req, resp) => {
  let parameters = req.query;
  let page = 0;
  let orderField = "firstName";
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
  query = "MATCH (n:User) RETURN n "+queryOrder+" SKIP "+skip+" LIMIT "+limit;
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
* @api {get} /user Get user
* @apiName get user
* @apiGroup Users
* @apiPermission admin
*
* @apiParam {string} _id The _id of the requested user.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"260","firstName":"Admin","lastName":"","email":"admin@test.com","usergroup":{"description":"This group has access to the back-end","isDefault":false,"isAdmin":true,"label":"Administrator","_id":"401"},"createdBy":null,"createdAt":null,"updatedBy":null,"updatedAt":null,"hasPassword":true},"error":[],"msg":"Query results"}
*/
const getUser = async(req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id==="undefined" || parameters._id==="") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please provide a valid user id to continue.",
    });
    return false;
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

/**
* @api {put} /user Put user
* @apiName put user
* @apiGroup Users
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the user. This should be undefined|null|blank in the creation of a new user.
* @apiParam {string} [firstName] The user's first name.
* @apiParam {string} [lastName] The user's last name.
* @apiParam {string} email The user's email.
* @apiParam {string} usergroup The user's usergroup id.
* @apiParam {string} [password] The user's password.

* @apiSuccessExample {json} Success-Response:
{"error":[],"status":true,"data":{"firstName":"","createdAt":"2020-01-15T16:49:21.096Z","lastName":"","updatedBy":"260","createdBy":"260","usergroup":"240","email":"test@test.com","token":false,"updatedAt":"2020-01-15T16:49:21.096Z","_id":"2656"}}
*/
const putUser = async(req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length===0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "The user must not be empty",
    });
    return false;
  }
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
  let userId = req.decoded.id;
  let user = new User(userData);
  let output = await user.save(userId);
  resp.json(output);
}

/**
* @api {delete} /user Delete user
* @apiName delete user
* @apiGroup Users
* @apiPermission admin
*
* @apiParam {string} _id The id of the user for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"error":[],"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:User) WHERE id(n)=2656 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":20,"high":0}}}}
*/
const deleteUser = async(req, resp) => {
  let parameters = req.body;
  if (typeof parameters._id==="undefined") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please provide a valid user id to continue.",
    });
    return false;
  }
  let user = new User({_id: parameters._id});
  let output = await user.delete();
  resp.json(output);
}

/**
* @api {post} /user-password Post user password
* @apiName post user password
* @apiGroup Users
* @apiPermission admin
*
* @apiParam {string} _id The _id of the user.
* @apiParam {string} password The user's new password.
* @apiParam {string} passwordRepeat The user's new password repeat.

* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"error":[],"status":true,"data":{"lastName":"test 2","createdAt":"2020-01-15T16:54:49.345Z","firstName":"test 2","password":"$argon2i$v=19$m=4096,t=3,p=1$ASReF+F6uNDu/x1pQjzABg$10eyaxG8yCh7rPqUVKx2CDejIYe6mAyMn5sUWx2ARJQ","updatedBy":"260","createdBy":"260","usergroup":"240","email":"test3@test.com","updatedAt":"2020-01-15T16:54:49.345Z","token":false,"_id":"2656"}},"error":[],"msg":""}
*/
const updateUserPassword = async (req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length===0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "The uploaded file must not be empty",
    });
    return false;
  }
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
