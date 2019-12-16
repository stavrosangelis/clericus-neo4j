const Taxonomy = require('../controllers/taxonomy.ctrl').Taxonomy;
const TaxonomyTerm = require('../controllers/taxonomyTerm.ctrl').TaxonomyTerm;
const updateReference = require('../controllers/references.ctrl').updateReference;
const readJSONFile = require('../helpers').readJSONFile;
const driver = require("../config/db-driver");
const helpers = require("../helpers");

const seedTaxonomyTerms = async() => {
  const entries = await readJSONFile(process.env.ABSPATH+'src/seed/data/taxonomy-terms.json');

  // 1. load taxonomies
  let taxonomies = await new Promise(async(resolve, reject) => {
    let session = driver.session();
    let query = "MATCH (n:Taxonomy) RETURN n";
    let taxonomiesPromise = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      session.close();
      let outputRecords = [];
      let records = result.records;
      if (records.length>0) {
        outputRecords = records.map(record=> {
          let key = record.keys[0];
          let output = record.toObject()[key];
          output = helpers.outputRecord(output);
          return output;
        })
      }
      return outputRecords;
    })
    resolve(taxonomiesPromise);
  })
  .catch((error)=> {
    return error;
  });

  // 2. insert taxonomy terms
  let taxonomyTerms = entries.data;
  const taxonomyTermsPromises = [];
  for (let key in taxonomyTerms) {
    let insertPromise = new Promise(async(resolve, reject)=> {
      let entry = taxonomyTerms[key];
      let newTermData = {
        inverseLabel: entry.inverseLabel,
        label: entry.label,
        scopeNote: entry.scopeNote
      };
      let taxonomyTerm = new TaxonomyTerm(newTermData);
      resolve(await taxonomyTerm.save());
    });
    taxonomyTermsPromises.push(insertPromise);
  }
  let saveTaxonomyTerms = await Promise.all(taxonomyTermsPromises).then((data)=> {
    return data;
  })
  .catch((error)=> {
    console.log(error);
  });

  // 3. find taxonomy term hasChild to use for the reference
  let hasChildTerm = await new Promise(async(resolve, reject) => {
    let session = driver.session();
    let query = "MATCH (n:TaxonomyTerm {labelId: 'hasChild'}) return n";
    let node = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      session.close();
      let output = {};
      let records = result.records;
      if (records.length>0) {
        let record = records[0];
        let key = record.keys[0];
        let output = record.toObject()[key];
        output = helpers.outputRecord(output);
        return output;
      }
      return output;
    })
    .catch((error)=> {
      return error;
    });
    resolve(node);
  })
  .catch((error)=> {
    return error;
  });

  // 4. load taxonomy terms to get the ids
  let dbTaxonomyTerms = await new Promise(async(resolve, reject) => {
    let session = driver.session();
    let query = "MATCH (n:TaxonomyTerm) RETURN n";
    let dbTaxonomyTermsPromise = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      session.close();
      let outputRecords = [];
      let records = result.records;
      if (records.length>0) {
        outputRecords = records.map(record=> {
          let key = record.keys[0];
          let output = record.toObject()[key];
          output = helpers.outputRecord(output);
          return output;
        })
      }
      return outputRecords;
    })
    resolve(dbTaxonomyTermsPromise);
  })
  .catch((error)=> {
    return error;
  });

  // 5. update parent references
  let addReferences = [];
  for (let key in taxonomyTerms) {
    let entry = taxonomyTerms[key];
    let source = taxonomies.find(item=>item.systemType===entry.taxonomyRef);
    let target = dbTaxonomyTerms.find(item=>item.label===entry.label);
    if (typeof source!=="undefined" && typeof target!=="undefined") {
      let ref = {
        items: [
          {_id:source._id, type: "Taxonomy", role: ""},
          {_id:target._id, type: "TaxonomyTerm", role: ""},
        ],
        taxonomyTermId: hasChildTerm._id
      }
      addReferences.push(updateReference(ref));
    }
  }

  return Promise.all(addReferences).then(data=> {
    return data;
  })
  .catch(error=> {
    console.log(error)
  });
}


module.exports = {
  seedTaxonomyTerms: seedTaxonomyTerms
}
