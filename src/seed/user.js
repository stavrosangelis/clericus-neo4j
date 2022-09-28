const crypto = require('crypto-js');

const { User } = require('../controllers/user.ctrl');
const { TaxonomyTerm } = require('../controllers/taxonomyTerm.ctrl');
const { Usergroup } = require('../controllers/usergroup.ctrl');
const { updateReference } = require('../controllers/references.ctrl');
const { readJSONFile } = require('../helpers');

// create new default admin account
const seedUser = async (email = null, password = null) => {
  // 1. load default user data
  const userDataPath = `${process.env.ABSPATH}src/seed/data/user.json`;
  const entries = await readJSONFile(userDataPath);
  const { data: defaultUser } = entries;

  // 2. hash user password
  if (email !== null) {
    defaultUser.email = email;
  }
  if (password !== null) {
    defaultUser.password = password;
  } else {
    defaultUser.password = crypto.SHA1(defaultUser.password).toString();
  }

  // 3. initiate a user from the user model
  const newUser = new User(defaultUser);

  // 4. save new User
  const saveUser = await newUser.save();

  // 5. save user password
  newUser._id = saveUser.data._id;
  newUser.password = defaultUser.password;

  await newUser.updatePassword();

  const output = {
    user: newUser,
  };
  return output;
};

// add new admin account to admin user group
const addUserToGroup = async (userId) => {
  // 6. link user to admin userGroup
  // 6.1. load taxonomy term
  const taxTerm = new TaxonomyTerm({ labelId: 'belongsToUserGroup' });
  await taxTerm.load();

  // 6.2. load admin usergroup
  const adminUsergroup = new Usergroup({ label: 'Administrator' });
  await adminUsergroup.load();

  // 6.3. add relation
  const ref = {
    items: [
      { _id: userId, type: 'User', role: '' },
      { _id: adminUsergroup._id, type: 'Usergroup', role: '' },
    ],
    taxonomyTermId: taxTerm._id,
  };
  const addReference = await updateReference(ref);
  const output = {
    ref: addReference,
  };
  return output;
};

module.exports = {
  seedUser,
  addUserToGroup,
};
