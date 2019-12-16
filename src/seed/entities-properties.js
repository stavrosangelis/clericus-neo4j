const Entity = require('../controllers/entity.ctrl').Entity;
const TaxonomyTerm = require('../controllers/taxonomyTerm.ctrl').TaxonomyTerm;
const readJSONFile = require('../helpers').readJSONFile;
const updateReference = require('../controllers/references.ctrl').updateReference;
const driver = require("../config/db-driver");
const helpers = require("../helpers");

const seedEntitiesProperties = async() => {
  const entries = await readJSONFile(process.env.ABSPATH+'src/seed/data/entities-properties.json');

  // 1. load entities
  let entities = await new Promise(async(resolve, reject) => {
    let session = driver.session();
    let query = "MATCH (n:Entity) RETURN n";
    let entitiesPromise = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      let outputRecords = [];
      if (result.records.length>0) {
        let record = result.records[0];
        outputRecords = result.records.map(record=> {
          let outputRecord = record.toObject();
          helpers.prepareOutput(outputRecord);
          outputRecord.n._id = outputRecord.n.identity;
          delete outputRecord.n.identity;
          return outputRecord;
        })
      }
      resolve(outputRecords);
    })
  })
  .catch((error)=> {
    return error;
  });
  // 2. loadTerms
  let taxonomyTerms = await new Promise(async(resolve, reject) => {
    let session = driver.session();
    let query = "MATCH (n:TaxonomyTerm) RETURN n";
    let dbTaxonomyTermsPromise = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      let outputRecords = [];
      if (result.records.length>0) {
        let record = result.records[0];
        outputRecords = result.records.map(record=> {
          let outputRecord = record.toObject();
          helpers.prepareOutput(outputRecord);
          outputRecord.n._id = outputRecord.n.identity;
          delete outputRecord.n.identity;
          return outputRecord;
        })
      }
      resolve(outputRecords);
    })
  })
  .catch((error)=> {
    return error;
  });
  // 3. prepare properties for update
  let addReferences = [];
  for (let key in entries.data) {
    let entry = entries.data[key];
    let source = entities.find(item=>item.n.properties.labelId===entry.sourceEntityLabelId);
    let target = entities.find(item=>item.n.properties.labelId===entry.targetEntityLabelId);
    let term = taxonomyTerms.find(item=>item.n.properties.labelId===entry.termLabelId);
    let ref = {
      items: [
        {_id:source.n._id, type: "Entity", role: ""},
        {_id:target.n._id, type: "Entity", role: ""},
      ],
      taxonomyTermId: term.n._id
    }
    addReferences.push(updateReference(ref));
  }

  // 4. add properties to their respective entities
  return Promise.all(addReferences).then(data=> {
    return data;
  });

}


module.exports = {
  seedEntitiesProperties: seedEntitiesProperties
}
