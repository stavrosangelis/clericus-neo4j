const { Entity } = require('../controllers/entity.ctrl');
const { readJSONFile } = require('../helpers');

const seedEntities = async (userId) => {
  const path = `${process.env.ABSPATH}src/seed/data/entities.json`;
  const entries = await readJSONFile(path);
  const output = [];
  const { data } = entries;
  for (let key in data) {
    const entry = data[key];
    const entity = new Entity(entry);
    output.push(await entity.save(userId));
  }
  return output;
};

module.exports = {
  seedEntities,
};
