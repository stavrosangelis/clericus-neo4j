const driver = require("../config/db-driver");
const fs = require("fs");
const helpers = require("../helpers");
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const privateKey = fs.readFileSync('./src/config/.private.key', 'utf8');

class User {
  constructor({_id=null,firstName=null,lastName=null,email=null,password=null,token=false, isAdmin=false, usergroup=null}) {
    if (typeof _id!=="undefined" && _id!==null) {
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
    let query = "MATCH (n:User) WHERE id(n)="+this._id+" return n";
    let node = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      session.close();
      if (result.records.length>0) {
        let record = result.records[0];
        let outputRecord = helpers.outputRecord(record);
        return outputRecord;
      }
    })
    return node;
  }

  async save() {
    let validateUser = this.validate();
    if (!validateUser.status) {
      return validateUser;
    }
    else {
      let session = driver.session();
      if (typeof this._id==="undefined" || this._id===null) {
        if (this.password===null) {
          let output = {
            status: false,
            msg: "",
            errors: {field: "password", msg:  "Please provide a password to continue"}
          }
          return output;
        }
        await this.setPassword(this.password);
      }
      else {
        this.password = null;
      }
      let nodeProperties = helpers.prepareNodeProperties(this);
      let params = helpers.prepareParams(this);

      let query = "";
      if (typeof this._id==="undefined" || this._id===null) {
        query = "CREATE (n:User "+nodeProperties+") RETURN n";
      }
      else {
        query = "MATCH (n:User) WHERE id(n)="+this._id+" SET n="+nodeProperties+" RETURN n";
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

  async updatePassword() {
    let password = await this.setPassword(this.password);
    const resultPromise = await new Promise((resolve, reject)=> {
      let query = "MATCH (n:User) WHERE id(n)=$_id SET n.password=$password RETURN n";
      let params = {$_id: this._id, password: password};
      let result = session.run(
        query,
        params
      ).then(result => {
        session.close();
        let outputRecord = result.records[0].toObject();
        helpers.prepareOutput(outputRecord);
        outputRecord.n._id = outputRecord.n.identity;
        delete outputRecord.n.identity;
        delete outputRecord.n.password;
        resolve(outputRecord);
      });
    })
    return resultPromise;
  }

  async delete() {
    if (this._id===null) {
      return false;
    }
    let session = driver.session()
    let tx = session.beginTransaction()
    let query = "MATCH (n:User) WHERE id(n)="+this._id+" DELETE n";
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

  async setPassword(password) {
    this.password = await argon2.hash(password);
  };

  async validatePassword(password) {
    const passwordVerify = await argon2.verify(this.password, password);
    return passwordVerify;
  };

  generateJWT() {
    let today = new Date();
    const expirationDate = new Date(today.getDate()+1);
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

  let skip = limit*page;
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

  let nodes = helpers.normalizeRecordsOutput(nodesPromise);

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
  let data = await user.load();
  resp.json({
    status: true,
    data: data,
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
  let user = new User(userData);
  let data = await user.save();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

const deleteUser = async(req, resp) => {
  let parameters = req.query;
  let user = new User();
  let data = await user.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

module.exports = {
  User: User,
  getUsers: getUsers,
  getUser: getUser,
  putUser: putUser,
  deleteUser: deleteUser,
};
