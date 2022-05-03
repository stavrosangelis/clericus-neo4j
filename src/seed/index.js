const { loadSettings, disallowSeeding } = require('./settings.js');
const { initDB } = require('./init-db.js');

// seeds
const { seedTaxonomies } = require('./taxonomies.js');
const { seedTaxonomyTerms } = require('./taxonomy-terms.js');
const {
  seedUsergroups,
  usergroupUpdateCreatedBy,
} = require('./user-groups.js');
const { seedUser } = require('./user.js');
const { addUserToGroup } = require('./user.js');
const { seedEntities } = require('./entities.js');
const { seedEntitiesProperties } = require('./entities-properties.js');

/**
 * @api {post} /seed-db Post seed db
 * @apiName post seed db
 * @apiGroup Seed
 *
 * @apiParam {string} email The admin user email.
 * @apiParam {string} password The admin user password.
 */
const seedData = async (req, resp) => {
  const postData = req.body;
  const { email = null, password = null } = postData;
  let status = true;
  const errors = [];
  const data = {};

  // 0. check settings
  // 0.1. check if seeding is allowed
  const settingsData = await loadSettings();

  // 0.2. if seeding is not allowed output error and stop executing
  if (!settingsData.seedingAllowed) {
    status = false;
    errors.push('The database has already been seeded.');
    return resp.json({
      status: status,
      data: [],
      error: errors,
      msg: [],
    });
  }
  // else proceed to seed the db

  // 1. set db indexes and constraints
  data.initdb = await initDB();
  console.log('step 1 complete');

  // 2. insert usergroups
  data.usergroups = await seedUsergroups();
  console.log('step 2 complete');

  // 3. insert default admin account
  data.user = await seedUser(email, password);
  const { _id: userId = null } = data.user.user;

  // if new user hasn't been created successfully stop here
  if (userId === null) {
    status = false;
    errors.push(
      'There was an error while creating the default admin user account'
    );
    return resp.json({
      status: status,
      data: [],
      error: errors,
      msg: [],
    });
  }

  // 3.2. add default user account _id as creator to all user groups
  await usergroupUpdateCreatedBy(userId);
  console.log('step 3 complete');

  // 4. insert taxonomies
  data.taxonomies = await seedTaxonomies(userId);
  console.log('step 4 complete');

  // 5. insert taxonomy terms
  data.taxonomyTerms = await seedTaxonomyTerms(userId);
  console.log('step 5 complete');

  // 6. add user to usergroup
  data.userUsergroup = await addUserToGroup(userId);
  console.log('step 6 complete');

  // 7. insert entities
  let seedEntitiesPromise = await seedEntities(userId);
  data.entities = seedEntitiesPromise;
  console.log('step 7 complete');

  // 8. insert entity properties
  data.entitiesProperties = await seedEntitiesProperties(userId);
  console.log('step 8 complete');

  // 9. dissalow any further seeding in the database
  data.seeding = await disallowSeeding();
  console.log('step 9 complete');
  console.log('seeding complete');

  return resp.json({
    status: status,
    data: data,
    error: errors,
    msg: [],
  });
};

module.exports = {
  seedData,
};
