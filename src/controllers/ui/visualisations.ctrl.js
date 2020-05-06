const driver = require("../../config/db-driver");
const helpers = require("../../helpers");
const fs = require('fs');
const archivePath = process.env.ARCHIVEPATH;

const getHeatmap = async (req, resp) => {
  let data = [];

  let query = `MATCH (n:Organisation)-[r]->(p:Person) WHERE n.status='public' AND n.organisationType='Diocese' RETURN n, count(r) AS count`;
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  })
  let organisations = prepareOrganisations(nodesPromise);

  // load features
  let featuresDataPath = `${archivePath}documents/dioceses&cathedral-cities-features.json`;
  let featuresData = await fs.readFileSync(featuresDataPath, 'utf8');
  featuresData = JSON.parse(featuresData);
  for (let i=0;i<organisations.length; i++) {
    let organisation = organisations[i];
    organisation.features = null;
    let features = featuresData.find(o=>o.diocese===organisation.label);
    if (typeof features!=="undefined") {
      organisation.features = features;
    }
  }
  resp.json({
    status: true,
    data: organisations,
    error: [],
    msg: "Query results",
  })
}

const prepareOrganisations = (records) => {
  let output = [];
  for (let i=0; i<records.length; i++) {
    let record = records[i];
    let labels = null;
    if (typeof record._fields[0].labels!=="undefined") {
      labels = record._fields[0].labels;
    }
    let key = record.keys[0];
    helpers.prepareOutput(record);
    let recordObject = record.toObject();
    let outputItem = helpers.outputRecord(recordObject[key]);
    if (labels!==null) {
      outputItem.systemLabels = labels;
    }
    outputItem.count = recordObject.count;
    output.push(outputItem)
  }
  return output;
}

module.exports = {
  getHeatmap: getHeatmap
}
