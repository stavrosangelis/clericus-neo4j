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

const putReferences = async(req, resp) => {
  let references = req.body;
  let promises = [];
  for (let refKey in references) {
    let reference = references[refKey];
    let addReference = updateReference(reference);
    promises.push(addReference);
  }

  let data = await Promise.all(promises).then(data=> {
    return data;
  });
  let error = [];
  let status = true;
  resp.json({
    status: status,
    data: data,
    error: error,
    msg: [],
  })
}

const updateReference = async(reference) => {
  let session = driver.session();
  let srcItem = reference.items[0];
  let targetItem = reference.items[1];
  let taxonomyTermQuery = "";
  if (typeof reference.taxonomyTermId!=="undefined") {
    taxonomyTermQuery = {_id: reference.taxonomyTermId}
  }
  if (typeof reference.taxonomyTermLabel!=="undefined") {
    taxonomyTermQuery = {labelId: reference.taxonomyTermLabel}
  }
  let taxonomyTerm = new TaxonomyTerm(taxonomyTermQuery);
  await taxonomyTerm.load();
  let direction = "from";
  if (taxonomyTerm._id===null) {
    taxonomyTermQuery = {inverseLabel: reference.taxonomyTermLabel};
    taxonomyTerm = new TaxonomyTerm(taxonomyTermQuery);
    await taxonomyTerm.load();
    direction = "to";
  };
  if (taxonomyTerm._id===null) {
    return false;
  }
  let query = "MATCH (n1:"+srcItem.type+") WHERE id(n1)="+srcItem._id+" MATCH (n2:"+targetItem.type+") WHERE id(n2)="+targetItem._id+" CREATE UNIQUE (n1)-[:"+taxonomyTerm.labelId+"]->(n2) CREATE UNIQUE (n2)-[:"+taxonomyTerm.inverseLabelId+"]->(n1)";
  if (direction==="to") {
    query = "MATCH (n1:"+targetItem.type+") WHERE id(n1)="+targetItem._id+" MATCH (n2:"+srcItem.type+") WHERE id(n2)="+srcItem._id+" CREATE UNIQUE (n1)-[:"+taxonomyTerm.labelId+"]->(n2) CREATE UNIQUE (n2)-[:"+taxonomyTerm.inverseLabelId+"]->(n1)";
  }
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
  let taxonomyTermQuery = "";
  if (typeof reference.taxonomyTermId!=="undefined") {
    taxonomyTermQuery = {_id: reference.taxonomyTermId}
  }
  if (typeof reference.taxonomyTermLabel!=="undefined") {
    taxonomyTermQuery = {labelId: reference.taxonomyTermLabel}
  }
  let taxonomyTerm = new TaxonomyTerm(taxonomyTermQuery);
  await taxonomyTerm.load();
  let direction = "from";
  if (taxonomyTerm._id===null) {
    taxonomyTermQuery = {inverseLabel: reference.taxonomyTermLabel};
    taxonomyTerm = new TaxonomyTerm(taxonomyTermQuery);
    await taxonomyTerm.load();
    direction = "to";
  };
  if (taxonomyTerm._id===null) {
    return false;
  }
  let query = "MATCH (n1:"+srcItem.type+") WHERE id(n1)="+srcItem._id
  +" MATCH (n2:"+targetItem.type+") WHERE id(n2)="+targetItem._id
  +" MATCH (n1)-[r1:"+taxonomyTerm.labelId+"]->(n2)"
  +" MATCH (n2)-[r2:"+taxonomyTerm.inverseLabelId+"]->(n1)"
  +" DELETE r1 "
  +" DELETE r2";
  if (direction==="to") {
    query = "MATCH (n1:"+targetItem.type+") WHERE id(n1)="+targetItem._id
    +" MATCH (n2:"+srcItem.type+") WHERE id(n2)="+srcItem._id
    +" MATCH (n1)-[r1:"+taxonomyTerm.labelId+"]->(n2)"
    +" MATCH (n2)-[r2:"+taxonomyTerm.inverseLabelId+"]->(n1)"
    +" DELETE r1 "
    +" DELETE r2";
  }
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
  putReferences: putReferences,
  updateReference: updateReference,
  deleteReference: deleteReference,
  removeReference: removeReference,
}
