const fs = require("fs");
const settings = require('./settings.js');
const initDB = require('./init-db.js').initDB;
const seedTaxonomies = require('./taxonomies.js').seedTaxonomies;
const seedTaxonomyTerms = require('./taxonomy-terms.js').seedTaxonomyTerms;
const seedUsergroups = require('./user-groups.js').seedUsergroups;
const seedUser = require('./user.js').seedUser;
const seedEntities = require('./entities.js').seedEntities;
const seedEntitiesProperties = require('./entities-properties.js').seedEntitiesProperties;

/**
* @api {post} /seed-db Post seed db
* @apiName post seed db
* @apiGroup Seed
*
* @apiParam {string} email The admin user email.
* @apiParam {string} password The admin user password.
*/
const seedData = async(req, resp) => {
  let postData = req.body;
  let email = null;
  let password = null;
  if (typeof postData.email!=="undefined" && postData.email!=="") {
    email = postData.email;
  }
  if (typeof postData.password!=="undefined" && postData.password!=="") {
    password = postData.password;
  }
  let status = true;
  let errors = [];
  let data = {};

  // 1. check settings
  // 1.1. check if seeding is allowed
  let settingsData = await settings.loadSettings();
  // 1.2. if seeding is not allowed output error and stop executing
  if (!settingsData.seedingAllowed) {
    status = false;
    let error = "The database has already been seeded.";
    errors.push(error);
    resp.json({
      status: status,
      data: [],
      error: errors,
      msg: [],
    });
    return false;
  }
  console.log("step 1 complete");
  // else proceed to seed the db

  // 2. set db indexes and constraints
  let initDBPromise = await initDB();
  data.initdb = initDBPromise;
  console.log("step 2 complete");

  // 3. insert taxonomies
  let seedTaxonomiesPromise = await seedTaxonomies();
  data.taxonomies = seedTaxonomiesPromise;
  console.log("step 3 complete");

  // 4. insert taxonomy terms
  let seedTaxonomyTermsPromise = await seedTaxonomyTerms();
  data.taxonomyTerms = seedTaxonomyTermsPromise;
  console.log("step 4 complete");

  // 5. insert usergroups
  let seedUsergroupsPromise = await seedUsergroups();
  data.usergroups = seedUsergroupsPromise;
  console.log("step 5 complete");

  // 6. insert default admin account
  let seedUserPromise = await seedUser(email, password);
  data.user = seedUserPromise;
  console.log("step 6 complete");

  // 7 insert entities
  let seedEntitiesPromise = await seedEntities();
  data.entities = seedEntitiesPromise;
  console.log("step 7.1 complete");

  // 8 insert entity properties
  let seedEntitiesPropertiesPromise = await seedEntitiesProperties();
  data.entitiesProperties = seedEntitiesPropertiesPromise;
  console.log("step 7.2 complete");

  // 9. dissalow any further seeding in the database
  let disallowSeeding = await settings.disallowSeeding();
  data.seeding = disallowSeeding;
  console.log("step 8 complete");
  console.log("seeding complete");


  resp.json({
    status: status,
    data: data,
    error: errors,
    msg: [],
  });
};

module.exports = {
  seedData: seedData
}
