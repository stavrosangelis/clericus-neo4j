const TaxonomyTerm = require('../controllers/taxonomyTerm.ctrl').TaxonomyTerm;
const updateReference = require('../controllers/references.ctrl')
  .updateReference;
const readJSONFile = require('../helpers').readJSONFile;
const driver = require('../config/db-driver');
const helpers = require('../helpers');

const seedTaxonomyTerms = async (userId) => {
  const entries = await readJSONFile(
    process.env.ABSPATH + 'src/seed/data/taxonomy-terms.json'
  );
  const session = driver.session();
  const queryTaxonomies = 'MATCH (n:Taxonomy) RETURN n';
  // 1. load taxonomies
  let taxonomies = await session
    .writeTransaction((tx) => tx.run(queryTaxonomies, {}))
    .then((result) => {
      let outputRecords = [];
      let records = result.records;
      if (records.length > 0) {
        outputRecords = records.map((record) => {
          let key = record.keys[0];
          let output = record.toObject()[key];
          output = helpers.outputRecord(output);
          return output;
        });
      }
      return outputRecords;
    });

  // 2. insert taxonomy terms
  let taxonomyTerms = entries.data;
  const saveTaxonomyTerms = [];
  for (let key in taxonomyTerms) {
    let entry = taxonomyTerms[key];
    let newTermData = {
      inverseLabel: entry.inverseLabel,
      label: entry.label,
      scopeNote: entry.scopeNote,
    };
    let taxonomyTerm = new TaxonomyTerm(newTermData);
    saveTaxonomyTerms.push(await taxonomyTerm.save(userId));
  }

  // 3. find taxonomy term hasChild to use for the reference
  const hasChildQuery = "MATCH (n:TaxonomyTerm {labelId: 'hasChild'}) return n";
  const hasChildTerm = await session
    .writeTransaction((tx) => tx.run(hasChildQuery, {}))
    .then((result) => {
      let output = {};
      let records = result.records;
      if (records.length > 0) {
        let record = records[0];
        let key = record.keys[0];
        let output = record.toObject()[key];
        output = helpers.outputRecord(output);
        return output;
      }
      return output;
    })
    .catch((error) => {
      return error;
    });

  // 4. load taxonomy terms to get the ids
  const dbTaxonomyTermsQuery = 'MATCH (n:TaxonomyTerm) RETURN n';
  let dbTaxonomyTerms = await session
    .writeTransaction((tx) => tx.run(dbTaxonomyTermsQuery, {}))
    .then((result) => {
      let outputRecords = [];
      let records = result.records;
      if (records.length > 0) {
        outputRecords = records.map((record) => {
          let key = record.keys[0];
          let output = record.toObject()[key];
          output = helpers.outputRecord(output);
          return output;
        });
      }
      return outputRecords;
    });

  session.close();

  // 5. update parent references
  let addReferences = [];
  for (let key in taxonomyTerms) {
    let entry = taxonomyTerms[key];
    let source = taxonomies.find(
      (item) => item.systemType === entry.taxonomyRef
    );
    let target = dbTaxonomyTerms.find((item) => item.label === entry.label);
    if (typeof source !== 'undefined' && typeof target !== 'undefined') {
      let ref = {
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
  seedTaxonomyTerms: seedTaxonomyTerms,
};
