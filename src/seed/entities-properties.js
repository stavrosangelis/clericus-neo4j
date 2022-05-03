const { normalizeRecordsOutput, readJSONFile } = require('../helpers');
const { updateReference } = require('../controllers/references.ctrl');
const driver = require('../config/db-driver');

const { ABSPATH } = process.env;

const seedEntitiesProperties = async () => {
  const session = driver.session();

  // 1. load entities
  const entitiesQuery = 'MATCH (n:Entity) RETURN n';
  const entities = await session
    .writeTransaction((tx) => tx.run(entitiesQuery, {}))
    .then((result) => {
      const { records = [] } = result;
      const { length } = records;
      if (length > 0) {
        return normalizeRecordsOutput(records);
      }
      return [];
    });

  // 2. loadTerms
  const taxonomyTermsQuery = 'MATCH (n:TaxonomyTerm) RETURN n';
  const taxonomyTerms = await session
    .writeTransaction((tx) => tx.run(taxonomyTermsQuery, {}))
    .then((result) => {
      const { records = [] } = result;
      const { length } = records;
      if (length > 0) {
        return normalizeRecordsOutput(records);
      }
      return [];
    });

  session.close();
  // 3. prepare properties for update
  // load the entries data from file
  const entries = await readJSONFile(
    `${ABSPATH}src/seed/data/entities-properties.json`
  );
  const addReferences = [];
  const { data } = entries;
  for (const key in data) {
    const entry = data[key];
    // find source value
    const source =
      entities.find((item) => item.labelId === entry.sourceEntityLabelId) ||
      null;
    const target =
      entities.find((item) => item.labelId === entry.targetEntityLabelId) ||
      null;
    const term =
      taxonomyTerms.find((item) => item.labelId === entry.termLabelId) || null;
    if (source !== null && target !== null && term !== null) {
      const ref = {
        items: [
          { _id: source._id, type: 'Entity', role: '' },
          { _id: target._id, type: 'Entity', role: '' },
        ],
        taxonomyTermId: term._id,
      };
      addReferences.push(updateReference(ref));
    }
  }

  // 4. add properties to their respective entities
  return Promise.all(addReferences).then((data) => {
    return data;
  });
};

module.exports = {
  seedEntitiesProperties,
};
