const Entity = require('../controllers/entity.ctrl').Entity;
const readJSONFile = require('../helpers').readJSONFile;

const seedEntities = async (userId) => {
  const entries = await readJSONFile(
    process.env.ABSPATH + 'src/seed/data/entities.json'
  );
  let output = [];
  for (let key in entries.data) {
    let entry = entries.data[key];
    let entity = new Entity(entry);
    output.push(await entity.save(userId));
  }
  return output;
};

module.exports = {
  seedEntities: seedEntities,
};
