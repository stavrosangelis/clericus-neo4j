const driver = require("../../config/db-driver");
const helpers = require("../../helpers");
const Resource = require("../resource.ctrl").Resource;
const TaxonomyTerm = require("../taxonomyTerm.ctrl").TaxonomyTerm;

const getClasspieces = async (req, resp) => {
  let parameters = req.query;
  let label = "";
  let _id = "";
  let description = "";
  let page = 0;
  let queryPage = 0;
  let limit = 25;

  let query = "";
  let queryParams = "";

  // get classpiece resource type id
  let classpieceSystemType = new TaxonomyTerm({"labelId":"Classpiece"});
  await classpieceSystemType.load();

  let systemType = classpieceSystemType._id;

  if (typeof parameters.label!=="undefined") {
    label = parameters.label;
    if (label!=="") {
      queryParams = "LOWER(n.label) =~ LOWER('.*"+label+".*') ";
    }
  }
  if (systemType!=="") {
    if (queryParams !=="") {
      queryParams += " AND ";
    }
    queryParams = "LOWER(n.systemType) = '{\"ref\":\""+systemType+"\"}'";
  }
  if (typeof parameters.description!=="undefined") {
    description = parameters.description;
    if (description!=="") {
      if (queryParams !=="") {
        queryParams += " AND ";
      }
      queryParams = "LOWER(n.description) =~ LOWER('.*"+description+".*') ";
    }
  }

  if (typeof parameters.page!=="undefined") {
    page = parseInt(parameters.page,10);
    queryPage = parseInt(parameters.page,10)-1;
  }
  if (typeof parameters.limit!=="undefined") {
    limit = parseInt(parameters.limit,10);
  }
  let currentPage = page;
  if (page===0) {
    currentPage = 1;
  }

  let skip = limit*queryPage;
  if (queryParams!=="") {
    queryParams = "WHERE "+queryParams;
  }
  query = "MATCH (n:Resource) "+queryParams+" RETURN n ORDER BY n.label SKIP "+skip+" LIMIT "+limit;
  let data = await getResourcesQuery(query, queryParams, limit);
  if (data.error) {
    resp.json({
      status: false,
      data: [],
      error: data.error,
      msg: data.error.message,
    })
  }
  else {
    let responseData = {
      currentPage: currentPage,
      data: data.nodes,
      totalItems: data.count,
      totalPages: data.totalPages,
    }
    resp.json({
      status: true,
      data: responseData,
      error: [],
      msg: "Query results",
    })
  }
}

const getResourcesQuery = async (query, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  })

  let nodes = helpers.normalizeRecordsOutput(nodesPromise, "n");
  let nodesOutput = nodes.map(node=> {
    let nodeOutput = {};
    for (let key in node) {
      nodeOutput[key] = node[key];
      let paths = [];
      if (key==="paths" && node[key].length>0) {
        for (let akey in node[key]) {
          let path = JSON.parse(node[key][akey]);
          paths.push(path);
        }
        nodeOutput[key] = paths;
      }
    }
    return nodeOutput;
  });

  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Resource) "+queryParams+" RETURN count(*)")
  )
  .then(result=> {
    session.close()
    let resultRecord = result.records[0];
    let countObj = resultRecord.toObject();
    helpers.prepareOutput(countObj);
    let output = countObj['count(*)'];
    return output;
  });
  let totalPages = Math.ceil(count/limit)
  let result = {
    nodes: nodesOutput,
    count: count,
    totalPages: totalPages
  }
  return result;
}

const getClasspiece = async(req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id==="undefined" && parameters._id==="") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id to continue.",
    });
  }

  let _id = parameters._id;
  let session = driver.session();
  let query = "MATCH (n:Resource) WHERE id(n)="+_id+" return n";
  let classpiece = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    let records = result.records;
    if (records.length>0) {
      let record = records[0].toObject();
      let outputRecord = helpers.outputRecord(record.n);
      return outputRecord;
    }
  }).catch((error) => {
    console.log(error)
  });
  if (typeof classpiece.metadata==="string") {
    classpiece.metadata = JSON.parse(classpiece.metadata);
  }

  let events = await helpers.loadRelations(_id, "Resource", "Event");
  let organisations = await helpers.loadRelations(_id, "Resource", "Organisation");
  let people = await helpers.loadRelations(_id, "Resource", "Person");
  let resources = await classpieceResources(_id, "Resource", "Resource");
  classpiece.events = events;
  classpiece.organisations = organisations;
  classpiece.people = people;
  classpiece.resources = resources;
  resp.json({
    status: true,
    data: classpiece,
    error: [],
    msg: "Query results",
  });
}

const classpieceResources = async (srcId=null, srcType=null, targetType=null) => {
  if (srcId===null || srcType===null) {
    return false;
  }
  let session = driver.session()
  let query = "MATCH (n:"+srcType+")-[r]->(rn) WHERE id(n)="+srcId+" return n, r, rn";
  if (targetType!==null) {
    query = "MATCH (n:"+srcType+")-[r]->(rn:"+targetType+") WHERE id(n)="+srcId+" return n, r, rn";
  }
  let relations = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(async result=> {
    session.close();
    let records = result.records;
    let relations = [];
    for (let key in records) {
      let record = records[key].toObject();
      let sourceItem = helpers.outputRecord(record.n);
      let relation = record.r;
      helpers.prepareOutput(relation);
      let targetItem = helpers.outputRecord(record.rn);
      if (record.rn.labels[0]==="Resource") {
        if (typeof targetItem.metadata==="string") {
          targetItem.metadata = JSON.parse(targetItem.metadata);
        }
        if (typeof targetItem.metadata==="string") {
          targetItem.metadata = JSON.parse(targetItem.metadata);
        }
        targetItem.person = await relatedPerson(targetItem._id);
      }
      let newRelation = await helpers.prepareRelation(sourceItem, relation, targetItem);
      relations.push(newRelation);
    }
    return relations;
  });
  return relations;
}


const relatedPerson = async (resourceId=null) => {
  if (resourceId===null) {
    return false;
  }
  let session = driver.session()
  let query = "MATCH (n:Resource)-[r:isRepresentationOf]->(rn) WHERE id(n)="+resourceId+" return rn";
  let person = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(async result=> {
    session.close();
    let records = result.records;
    if (records.length>0) {
      let record = records[0].toObject();
      let outputRecord = helpers.outputRecord(record.rn);
      return outputRecord;
    }
  });
  return person;
}

module.exports = {
  getClasspieces: getClasspieces,
  getClasspiece: getClasspiece
};
