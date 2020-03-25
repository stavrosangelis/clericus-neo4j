const Usergroup = require('../controllers/usergroup.ctrl').Usergroup;
const readJSONFile = require('../helpers').readJSONFile;

const seedUsergroups = async(userId) => {
  const entries = await readJSONFile(process.env.ABSPATH+'src/seed/data/usergroups.json');
  const promises = [];
  for (let key in entries.data) {
    let insertPromise = new Promise(async(resolve, reject)=> {
      let entry = entries.data[key];
      let usergroup = new Usergroup(entry);
      resolve(await usergroup.save(userId));
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
  seedUsergroups: seedUsergroups
}
