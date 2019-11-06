const driver = require("../config/db-driver");

const TaxonomyTerm = require('./taxonomyTerm.ctrl').TaxonomyTerm;

/*
references are bi-directional. An example reference object is the following:

  {
    items: [
      {_id: source entity id, type: source entity type, role: source entity role in relationship if any},
      {_id: target entity id, type: target entity type, role: target entity role in relationship if any}
    ],
    taxonomyTermId: taxonomy term id,
  }

*/
const putReference = async(req, resp) => {
  let postData = req.body;
  let newReference = await updateReference(postData);
  resp.json({
    status: true,
    data: newReference,
    error: [],
    msg: "Query results",
  });
}

const updateReference = async(reference) => {
  let session = driver.session();
  let srcItem = reference.items[0];
  let targetItem = reference.items[1];
  let taxonomyTerm = new TaxonomyTerm({_id: reference.taxonomyTermId})
  await taxonomyTerm.load();
  let query = "MATCH (n1:"+srcItem.type+") WHERE id(n1)="+srcItem._id+" MATCH (n2:"+targetItem.type+") WHERE id(n2)="+targetItem._id+" MERGE (n1)-[:"+taxonomyTerm.labelId+"]->(n2) MERGE (n2)-[:"+taxonomyTerm.inverseLabelId+"]->(n1)";
  let resultExec = await session.writeTransaction(tx=>
    tx.run(query,{})
  ).then(result => {
    session.close();
    return result.summary.counters._stats;
  })
  .catch((error)=> {
    console.log(error);
  });
  return resultExec;
}

const deleteReference = async(req, resp) => {
  let postData = req.body;
  let delReference = await removeReference(postData);
  resp.json({
    status: true,
    data: delReference,
    error: [],
    msg: "Query results",
  });
}

const removeReference = async(reference) => {
  let session = driver.session();
  let srcItem = reference.items[0];
  let targetItem = reference.items[1];
  let taxonomyTerm = await new TaxonomyTerm({_id: reference.taxonomyTermId}).load();
  let query = "MATCH (n1:"+srcItem.type+") WHERE id(n1)="+srcItem._id
  +" MATCH (n2:"+targetItem.type+") WHERE id(n2)="+targetItem._id
  +" MATCH (n1)-[r1:"+taxonomyTerm.n.properties.labelId+"]->(n2)"
  +" MATCH (n2)-[r2:"+taxonomyTerm.n.properties.inverseLabelId+"]->(n1)"
  +" DELETE r1 "
  +" DELETE r2";
  let params = {};
  const resultPromise = await new Promise((resolve, reject)=> {
    let result = session.run(
      query,
      params
    ).then(result => {
      session.close();
      resolve(result.summary.counters._stats);
    })
    .catch((error)=> {
      console.log(error);
    });;
  })
  return resultPromise;
}

module.exports = {
  putReference: putReference,
  updateReference: updateReference,
  deleteReference: deleteReference,
}
