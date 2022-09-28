const driver = require('../config/db-driver');
const { TaxonomyTerm } = require('../controllers/taxonomyTerm.ctrl');
const { updateReference } = require('../controllers/references.ctrl');
const { readJSONFile, outputRecord } = require('../helpers');

const seedTaxonomyTerms = async (userId) => {
  const path = `${process.env.ABSPATH}src/seed/data/taxonomy-terms.json`;
  const entries = await readJSONFile(path);
  const session = driver.session();
  const queryTaxonomies = 'MATCH (n:Taxonomy) RETURN n';

  // 1. load taxonomies
  const taxonomies = await session
    .writeTransaction((tx) => tx.run(queryTaxonomies, {}))
    .then((result) => {
      const { records } = result;
      if (records.length > 0) {
        const outputRecords = records.map((record) => {
          const key = record.keys[0];
          let output = record.toObject()[key];
          output = outputRecord(output);
          return output;
        });
        return outputRecords;
      }
      return [];
    });

  // 2. insert taxonomy terms
  const { data: taxonomyTerms = [] } = entries;
  const saveTaxonomyTerms = [];
  for (let key in taxonomyTerms) {
    const entry = taxonomyTerms[key];
    const newTermData = {
      inverseLabel: entry.inverseLabel,
      label: entry.label,
      scopeNote: entry.scopeNote,
    };
    const taxonomyTerm = new TaxonomyTerm(newTermData);
    saveTaxonomyTerms.push(await taxonomyTerm.save(userId));
  }

  // 3. find taxonomy term hasChild to use for the reference
  const hasChildQuery = "MATCH (n:TaxonomyTerm {labelId: 'hasChild'}) return n";
  const hasChildTerm = await session
    .writeTransaction((tx) => tx.run(hasChildQuery, {}))
    .then((result) => {
      let output = {};
      const { records } = result;
      if (records.length > 0) {
        const record = records[0];
        const key = record.keys[0];
        let output = record.toObject()[key];
        output = outputRecord(output);
        return output;
      }
      return output;
    })
    .catch((error) => {
      return error;
    });

  // 4. load taxonomy terms to get the ids
  const dbTaxonomyTermsQuery = 'MATCH (n:TaxonomyTerm) RETURN n';
  const dbTaxonomyTerms = await session
    .writeTransaction((tx) => tx.run(dbTaxonomyTermsQuery, {}))
    .then((result) => {
      const { records } = result;
      if (records.length > 0) {
        const outputRecords = records.map((record) => {
          const key = record.keys[0];
          let output = record.toObject()[key];
          output = outputRecord(output);
          return output;
        });
        return outputRecords;
      }
      return [];
    });

  session.close();

  // 5. update parent references
  const addReferences = [];
  for (let key in taxonomyTerms) {
    const entry = taxonomyTerms[key];
    const source =
      taxonomies.find((item) => item.systemType === entry.taxonomyRef) || null;
    const target =
      dbTaxonomyTerms.find((item) => item.label === entry.label) || null;
    if (source !== null && target !== null) {
      const ref = {
        items: [
          { _id: source._id, type: 'Taxonomy', role: '' },
          { _id: target._id, type: 'TaxonomyTerm', role: '' },
        ],
        taxonomyTermId: hasChildTerm._id,
      };
      addReferences.push(updateReference(ref));
    }
  }

  return Promise.all(addReferences)
    .then((data) => {
      return data;
    })
    .catch((error) => {
      console.log(error);
    });
};

module.exports = {
  seedTaxonomyTerms,
};
