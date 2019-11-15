const User = require('../controllers/user.ctrl').User;
const TaxonomyTerm = require('../controllers/taxonomyTerm.ctrl').TaxonomyTerm;
const Usergroup = require('../controllers/usergroup.ctrl').Usergroup;
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
  let newUser = new User(defaultUser);

  // 4. save new User
  let saveUser = await newUser.save();

  //5. save user password
  newUser._id = saveUser.data._id;
  newUser.password = defaultUser.password;
  await newUser.updatePassword();
  console.log(newUser)

  // 6. link user to admin userGroup
  // 6.1. load taxonomy term
  let taxTerm = new TaxonomyTerm({labelId: "belongsToUserGroup"});
  await taxTerm.load();

  // 6.2. load admin usergroup
  let adminUsergroup = new Usergroup({label: 'Administrator'});
  await adminUsergroup.load();

  // 6.3. add relation
  let ref = {
    items: [
      {_id:newUser._id, type: "User", role: ""},
      {_id:adminUsergroup._id, type: "Usergroup", role: ""},
    ],
    taxonomyTermId: taxTerm._id
  }
  let addReference = await updateReference(ref);

  let output = {
    user: newUser,
    ref: addReference
  }
  return output;
}


module.exports = {
  seedUser: seedUser
}
