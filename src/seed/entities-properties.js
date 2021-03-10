const readJSONFile = require('../helpers').readJSONFile;
const updateReference = require('../controllers/references.ctrl')
  .updateReference;
const driver = require('../config/db-driver');
const helpers = require('../helpers');

const seedEntitiesProperties = async () => {
  const entries = await readJSONFile(
    process.env.ABSPATH + 'src/seed/data/entities-properties.json'
  );
  let session = driver.session();

  // 1. load entities
  const entitiesQuery = 'MATCH (n:Entity) RETURN n';
  const entities = await session
    .writeTransaction((tx) => tx.run(entitiesQuery, {}))
    .then((result) => {
      let outputRecords = [];
      if (result.records.length > 0) {
        outputRecords = result.records.map((record) => {
          let outputRecord = record.toObject();
          helpers.prepareOutput(outputRecord);
          outputRecord.n._id = outputRecord.n.identity;
          delete outputRecord.n.identity;
          return outputRecord;
        });
      }
      return outputRecords;
    });

  // 2. loadTerms
  const taxonomyTermsQuery = 'MATCH (n:TaxonomyTerm) RETURN n';
  const taxonomyTerms = await session
    .writeTransaction((tx) => tx.run(taxonomyTermsQuery, {}))
    .then((result) => {
      let outputRecords = [];
      if (result.records.length > 0) {
        outputRecords = result.records.map((record) => {
          let outputRecord = record.toObject();
          helpers.prepareOutput(outputRecord);
          outputRecord.n._id = outputRecord.n.identity;
          delete outputRecord.n.identity;
          return outputRecord;
        });
      }
      return outputRecords;
    });

  session.close();
  // 3. prepare properties for update
  let addReferences = [];
  for (let key in entries.data) {
    let entry = entries.data[key];
    let source = entities.find(
      (item) => item.n.properties.labelId === entry.sourceEntityLabelId
    );
    let target = entities.find(
      (item) => item.n.properties.labelId === entry.targetEntityLabelId
    );
    let term = taxonomyTerms.find(
      (item) => item.n.properties.labelId === entry.termLabelId
    );
    let ref = {
      items: [
        { _id: source.n._id, type: 'Entity', role: '' },
        { _id: target.n._id, type: 'Entity', role: '' },
      ],
      taxonomyTermId: term.n._id,
    };
    addReferences.push(updateReference(ref));
  }

  // 4. add properties to their respective entities
  return Promise.all(addReferences).then((data) => {
    return data;
  });
};

module.exports = {
  seedEntitiesProperties: seedEntitiesProperties,
};
