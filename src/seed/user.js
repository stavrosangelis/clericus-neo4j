const User = require('../controllers/user.ctrl').User;
const updateReference = require('../controllers/references.ctrl').updateReference;
const readJSONFile = require('../helpers').readJSONFile;
const driver = require("../config/db-driver");
const helpers = require("../helpers");
const crypto = require('crypto-js');

const seedUser = async() => {
  // 1. load default user data
  const entries = await readJSONFile(process.env.ABSPATH+'src/seed/data/user.json');
  let defaultUser = entries.data;

  // 2. hash user password
  defaultUser.password = crypto.SHA1(defaultUser.password).toString();

  // 3. initiate a user from the user model
  let newUser = new User({});
  for (key in defaultUser) {
    newUser[key] = defaultUser[key];
  }

  // 4. save new User
  let adminUser = await newUser.save();

  // 5. link user to admin userGroup
  // 5.1. load taxonomy term
  let taxTerm = await new Promise(async(resolve, reject) => {
    let session = driver.session();
    let query = "MATCH (n:TaxonomyTerm {label: 'belongsToUserGroup'}) return n";
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
        delete outputRecord.n.identity;
        return outputRecord;
      }
    })
    resolve(node);
  })
  .catch((error)=> {
    return error;
  });

  // 5.2. load admin usergroup
  let adminUsergroup = await new Promise(async(resolve, reject)=>{
    let session = driver.session();
    let query = "MATCH (n:Usergroup {label: 'Administrator'}) return n";
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
    resolve(node);
  })
  .catch((error)=> {
    return error;
  });

  // 5.3. add relation
  let ref = {
    items: [
      {_id:adminUser.n._id, type: "User", role: ""},
      {_id:adminUsergroup.n._id, type: "Usergroup", role: ""},
    ],
    taxonomyTermId: taxTerm.n._id
  }
  let addReference = await updateReference(ref);

  let output = {
    user: adminUser,
    ref: addReference
  }
  return output;
}


module.exports = {
  seedUser: seedUser
}
