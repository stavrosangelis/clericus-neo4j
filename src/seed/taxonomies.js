const Taxonomy = require('../controllers/taxonomy.ctrl').Taxonomy;
const readJSONFile = require('../helpers').readJSONFile;

const seedTaxonomies = async (userId) => {
  const entries = await readJSONFile(
    process.env.ABSPATH + 'src/seed/data/taxonomies.json'
  );
  const promises = [];
  for (let key in entries.data) {
    let entry = entries.data[key];
    let taxonomy = new Taxonomy(entry);
    promises.push(await taxonomy.save(userId));
  }
  return promises;
};

module.exports = {
  seedTaxonomies: seedTaxonomies,
};
