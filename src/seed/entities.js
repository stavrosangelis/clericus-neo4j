const Entity = require('../controllers/entity.ctrl').Entity;
const readJSONFile = require('../helpers').readJSONFile;

const seedEntities = async(userId) => {
  const entries = await readJSONFile(process.env.ABSPATH+'src/seed/data/entities.json');
  const promises = [];
  for (let key in entries.data) {
    let insertPromise = new Promise(async(resolve, reject)=> {
      let entry = entries.data[key];
      let entity = new Entity(entry);
      resolve(await entity.save(userId));
    });
    promises.push(insertPromise);
  }

  return Promise.all(promises).then((data)=> {
    return data;
  })
  .catch((error)=> {
    console.log(error);
  });;
}


module.exports = {
  seedEntities: seedEntities
}
