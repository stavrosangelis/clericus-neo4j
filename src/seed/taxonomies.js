const { Taxonomy } = require('../controllers/taxonomy.ctrl');
const { readJSONFile } = require('../helpers');

const seedTaxonomies = async (userId) => {
  const path = `${process.env.ABSPATH}src/seed/data/taxonomies.json`;
  const entries = await readJSONFile(path);
  const promises = [];
  const { data } = entries;
  for (let key in data) {
    const entry = data[key];
    const taxonomy = new Taxonomy(entry);
    promises.push(await taxonomy.save(userId));
  }
  return promises;
};

module.exports = {
  seedTaxonomies,
};
