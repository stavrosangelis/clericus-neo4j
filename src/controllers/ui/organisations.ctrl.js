const driver = require("../../config/db-driver");
const helpers = require("../../helpers");

/**
* @api {get} /organisations Get organisations
* @apiName get organisations
* @apiGroup Organisations
*
* @apiParam {string} [label] A string to match against the organisations' labels.
* @apiParam {string} [organisationType] An organisation type label.
* @apiParam {string} [orderField=firstName] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiSuccessExample {json} Success-Response:
{
  "status": true,
  "data": {
    "currentPage": 1,
    "data": [{
      "label": "Achadh Conaire",
      "labelSoundex": "A232",
      "alternateAppelations": [],
      "organisationType": "Diocese",
      "status": false,
      "_id": "135",
      "systemLabels": ["Organisation"],
      "resources": []
    }],
    "totalItems": 80,
    "totalPages": 4
  },
  "error": [],
  "msg": "Query results"
}
*/
const getOrganisations = async (req, resp) => {
  let parameters = req.query;
  let label = "";
  let organisationType = "";
  let status = "";
  let page = 0;
  let orderField = "label";
  let queryPage = 0;
  let queryOrder = "";
  let limit = 25;

  let query = "";
  let queryParams = " n.status='public'";

  if (typeof parameters.label!=="undefined") {
    label = parameters.label;
    if (label!=="") {
      queryParams = "LOWER(n.label) =~ LOWER('.*"+label+".*') ";
    }
  }
  if (typeof parameters.orderField!=="undefined") {
    orderField = parameters.orderField;
  }
  if (typeof parameters.organisationType!=="undefined") {
    organisationType = parameters.organisationType;
    if (organisationType!=="") {
      if (queryParams !=="") {
        queryParams += " AND ";
      }
      queryParams += "LOWER(n.organisationType) =~ LOWER('.*"+organisationType+".*') ";
    }
  }
  if (orderField!=="") {
    queryOrder = "ORDER BY n."+orderField;
    if (typeof parameters.orderDesc!=="undefined" && parameters.orderDesc==="true") {
      queryOrder += " DESC";
    }
  }
  if (typeof parameters.status!=="undefined") {
    status = parameters.status;
    if (status!=="") {
      if (queryParams !=="") {
        queryParams += " AND ";
      }
      queryParams += "LOWER(n.status) =~ LOWER('.*"+status+".*') ";
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
  query = "MATCH (n:Organisation) "+queryParams+" RETURN n "+queryOrder+" SKIP "+skip+" LIMIT "+limit;
  let data = await getOrganisationsQuery(query, queryParams, limit);
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

const getOrganisationsQuery = async (query, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  })

  let nodes = helpers.normalizeRecordsOutput(nodesPromise);
  // get related resources
  let nodeResourcesPromises = nodes.map(node => {
    let newPromise = new Promise(async (resolve,reject)=> {
      let relations = {};
      relations.nodeId = node._id;
      relations.resources = await helpers.loadRelations(node._id, "Organisation", "Resource");
      resolve(relations);
    })
    return newPromise;
  });

  let nodesResourcesRelations = await Promise.all(nodeResourcesPromises)
  .then(data=>{
    return data;
  })
  .catch((error) => {
    console.log(error)
  });

  let nodesPopulated = nodes.map(node=> {
    let resources = [];
    let nodeResources = nodesResourcesRelations.find(relation=>relation.nodeId===node._id);
    if (typeof findResources!=="undefined") {
      resources = nodeResources;
    }
    node.resources = nodeResources.resources;
    return node;
  });
  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Organisation) "+queryParams+" RETURN count(*)")
  )
  .then(result=> {
    session.close()
    let resultRecord = result.records[0];
    let countObj = resultRecord.toObject();
    helpers.prepareOutput(countObj);
    let output = countObj['count(*)'];
    output = parseInt(output,10);
    return output;
  });
  let totalPages = Math.ceil(count/limit)
  let result = {
    nodes: nodesPopulated,
    count: count,
    totalPages: totalPages
  }
  return result;
}

/**
* @api {get} /organisation Get organisation
* @apiName get organisation
* @apiGroup Organisations
*
* @apiParam {string} _id The _id of the requested organisation.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"375","label":"Cill Da Lua","labelSoundex":"C434","description":null,"organisationType":"Diocese","status":false,"alternateAppelations":[],"createdBy":null,"createdAt":null,"updatedBy":null,"updatedAt":null,"events":[],"organisations":[],"people":[],"resources":[]},"error":[],"msg":"Query results"}
*/
const getOrganisation = async(req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id==="undefined" || parameters._id==="") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id to continue.",
    });
    return false;
  }
  let _id = parameters._id;
  let query = "MATCH (n:Organisation) WHERE id(n)="+_id+" AND n.status='public' return n";
  let organisation = await session.writeTransaction(tx=>
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
  let events = await helpers.loadRelations(_id, "Organisation", "Event");
  let organisations = await helpers.loadRelations(_id, "Organisation", "Organisation");
  let people = await helpers.loadRelations(_id, "Organisation", "Person");
  let resources = await helpers.loadRelations(_id, "Organisation", "Resource");
  organisation.events = events;
  organisation.organisations = organisations;
  organisation.people = people;
  organisation.resources = resources;
  resp.json({
    status: true,
    data: organisation,
    error: [],
    msg: "Query results",
  });
}

const getOrganisationsActiveFilters = async(req, resp) => {
  let parameters = req.body;
  let _ids = [];
  if (typeof parameters._ids!=="undefined" && parameters._ids.length>0) {
    _ids = parameters._ids;
  }
  let query = `MATCH (o:Organisation)-->(n) WHERE o.status='public' AND id(o) IN [${_ids}] AND (n:Event OR n:Organisation OR n:Person OR n:Resource) RETURN DISTINCT id(n) AS _id, n.label AS label, labels(n) as labels`;
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  });

  let nodes = nodesPromise.map(record=> {
    helpers.prepareOutput(record);
    let outputItem = record.toObject();
    outputItem.type = outputItem.labels[0];
    delete outputItem.labels;
    return outputItem;
  });
  let events = [];
  let organisations = [];
  let people = [];
  let resources = [];
  let eventsFind = nodes.filter(n=>n.type==="Event");
  if (eventsFind!=="undefined") {
    events = eventsFind;
  }
  let organisationsFind = nodes.filter(n=>n.type==="Organisation");
  if (organisationsFind!=="undefined") {
    organisations = organisationsFind;
  }
  let peopleFind = nodes.filter(n=>n.type==="Person");
  if (peopleFind!=="undefined") {
    people = peopleFind;
  }
  let resourcesFind = nodes.filter(n=>n.type==="Resource");
  if (resourcesFind!=="undefined") {
    resources = resourcesFind;
  }

  let output = {
    events: events,
    organisations: organisations,
    people: people,
    resources: resources,
  }
  resp.json({
    status: true,
    data: output,
    error: [],
    msg: "Query results",
  })
}

module.exports = {
  getOrganisations: getOrganisations,
  getOrganisation: getOrganisation,
  getOrganisationsActiveFilters: getOrganisationsActiveFilters,
};
