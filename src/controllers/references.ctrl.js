const driver = require("../config/db-driver");
const helpers = require("../helpers");

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
  let props = {};
  let srcRole = "";
  let targetRole = "";
  if (
    (typeof srcItem.role!=="undefined" && srcItem.role!=="" && srcItem.role!==null) ||
    (typeof targetItem.role!=="undefined" && targetItem.role!=="" && targetItem.role!==null)
  ) {
    if (srcItem.role!=="" && (targetItem.role===""|| targetItem.role==="null" || targetItem.role===null)) {
      targetItem.role = srcItem.role;
    }
    else if (targetItem.role!=="" && (srcItem.role==="" || srcItem.role==="null" || srcItem.role===null)) {
      srcItem.role = targetItem.role;
    }
    srcRole = " SET r1={role:'"+srcItem.role+"'}";
    targetRole = " SET r2={role:'"+targetItem.role+"'}";
    if (direction==="to") {
      srcRole = " SET r1={role:'"+targetItem.role+"'}";
      targetRole = " SET r2={role:'"+srcItem.role+"'}";
    }
  }

  let query = "MATCH (n1:"+srcItem.type+") WHERE id(n1)="+srcItem._id
  +" MATCH (n2:"+targetItem.type+") WHERE id(n2)="+targetItem._id
  +" CREATE UNIQUE (n1)-[r1:"+taxonomyTerm.labelId+"]->(n2)"+srcRole
  +" CREATE UNIQUE (n2)-[r2:"+taxonomyTerm.inverseLabelId+"]->(n1)"+targetRole;
  if (direction==="to") {
    query = "MATCH (n1:"+targetItem.type+") WHERE id(n1)="+targetItem._id
    +" MATCH (n2:"+srcItem.type+") WHERE id(n2)="+srcItem._id
    +" CREATE UNIQUE (n1)-[r1:"+taxonomyTerm.labelId+"]->(n2)"+srcRole
    +" CREATE UNIQUE (n2)-[r2:"+taxonomyTerm.inverseLabelId+"]->(n1)"+targetRole;
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

const getReferences = async(req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id==="undefined") {
    resp.json({
      status: false,
      data: [],
      error: "Please provide a valid node id to continue",
      msg: "Query results",
    });
  }
  let _id = parameters._id;
  let steps = 0;
  if (typeof parameters.steps!=="undefined") {
    steps = parseInt(parameters.steps,10);
    if (steps>6) {
      steps = 6;
    }
  }

  // 1. query for node
  let session = driver.session()
  let query = "MATCH p=(n)-[r]->(rn) WHERE id(n)="+_id+" AND NOT id(rn)="+_id+" return collect(distinct p) as p";
  if (steps>1) {
    query = "MATCH p=(n)-[r*.."+steps+"]->(rn)  WHERE id(n)="+_id+" AND NOT id(rn)="+_id+" return collect(distinct p) as p";
  }
  let results = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    let records = result.records;
    let output = [];
    if (records.length>0) {
      for (let i in records) {
        let record = records[i].toObject().p;
        let paths = helpers.outputPaths(record, _id);
        output = paths;
      }
    }
    return output;
  });

  resp.json({
    status: true,
    data: results,
    error: [],
    msg: "Query results",
  });
}

module.exports = {
  getReferences: getReferences,
  putReference: putReference,
  putReferences: putReferences,
  updateReference: updateReference,
  deleteReference: deleteReference,
  removeReference: removeReference,
}
