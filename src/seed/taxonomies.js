const Taxonomy = require('../controllers/taxonomy.ctrl').Taxonomy;
const readJSONFile = require('../helpers').readJSONFile;

const seedTaxonomies = async() => {
  const entries = await readJSONFile(process.env.ABSPATH+'src/seed/data/taxonomies.json');
  const promises = [];
  for (let key in entries.data) {
    let insertPromise = new Promise(async(resolve, reject)=> {
      let entry = entries.data[key];
      let taxonomy = new Taxonomy(entry);
      resolve(await taxonomy.save());
    });
    promises.push(insertPromise);
  }

  return Promise.all(promises).then((data)=> {
    return data;
  })
  .catch((error)=> {
    console.log(error);
  });
}


module.exports = {
  seedTaxonomies: seedTaxonomies
}
