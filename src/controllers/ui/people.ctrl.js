const driver = require("../../config/db-driver");
const helpers = require("../../helpers");

/**
* @api {get} /people Get people
* @apiName get people
* @apiGroup People
*
* @apiParam {string} [label] A string to match against the peoples' labels.
* @apiParam {string} [firstName] A string to match against the peoples' first names.
* @apiParam {string} [lastName] A string to match against the peoples' last names.
* @apiParam {string} [fnameSoundex] A string to match against the peoples' first name soundex.
* @apiParam {string} [lnameSoundex] A string to match against the peoples' last name soundex.
* @apiParam {string} [description] A string to match against the peoples' description.
* @apiParam {string} [orderField=firstName] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiSuccessExample {json} Success-Response:
{
  "status": true,
  "data": {
    "currentPage": 1,
    "data": [
      {"lastName": "Fox", "firstName": "Aidan", "honorificPrefix": [""], "middleName": "", "label": "Aidan Fox",…},
    …],
    "totalItems": "221",
    "totalPages": 9
  },
  "error": [],
  "msg": "Query results"
}
*/
const getPeople = async (req, resp) => {
  let parameters = req.query;
  let label = "";
  let firstName = "";
  let lastName = "";
  let fnameSoundex = "";
  let lnameSoundex = "";
  let description = "";
  let page = 0;
  let orderField = "label";
  let queryPage = 0;
  let queryOrder = "";
  let limit = 25;

  let match = "(n:Person)";

  let query = "";
  let queryParams = " n.status='public'";

  if (typeof parameters.label!=="undefined") {
    label = parameters.label;
    if (label!=="") {
      queryParams +="LOWER(n.label) =~ LOWER('.*"+label+".*') ";
    }
  }
  if (typeof parameters.firstName!=="undefined") {
    firstName = parameters.firstName;
    if (firstName!=="") {
      if (queryParams !=="") {
        queryParams += " AND ";
      }
      queryParams += "LOWER(n.firstName) =~ LOWER('.*"+firstName+".*') ";
    }
  }
  if (typeof parameters.lastName!=="undefined") {
    lastName = parameters.lastName;
    if (lastName!=="") {
      if (queryParams !=="") {
        queryParams += " AND ";
      }
      queryParams += "LOWER(n.lastName) =~ LOWER('.*"+lastName+".*') ";
    }
  }
  if (typeof parameters.fnameSoundex!=="undefined") {
    fnameSoundex = helpers.soundex(parameters.fnameSoundex);
    if (queryParams !=="") {
      queryParams += " AND ";
    }
    queryParams += "LOWER(n.fnameSoundex) =~ LOWER('.*"+fnameSoundex+".*') ";
  }
  if (typeof parameters.lnameSoundex!=="undefined") {
    lnameSoundex = helpers.soundex(parameters.lnameSoundex);
    if (queryParams !=="") {
      queryParams += " AND ";
    }
    queryParams += "LOWER(n.lnameSoundex) =~ LOWER('.*"+lnameSoundex+".*') ";
  }
  if (typeof parameters.description!=="undefined") {
    description = parameters.description.toLowerCase();
    if (queryParams !=="") {
      queryParams += " AND ";
    }
    queryParams += "LOWER(n.description) =~ LOWER('.*"+description+".*') ";
  }

  if (typeof parameters.orderField!=="undefined") {
    orderField = parameters.orderField;
  }
  if (orderField!=="") {
    queryOrder = "ORDER BY n."+orderField;
    if (typeof parameters.orderDesc!=="undefined" && parameters.orderDesc==="true") {
      queryOrder += " DESC";
    }
  }

  if (typeof parameters.page!=="undefined") {
    page = parseInt(parameters.page,10);
    queryPage = parseInt(parameters.page,10)-1;
  }
  if (typeof parameters.limit!=="undefined") {
    limit = parseInt(parameters.limit,10);
  }

  let events=[], organisations=[], people=[], resources=[];
  if (typeof parameters.events!=="undefined") {
    events = parameters.events;
    match = "(n:Person)-[revent]->(e:Event)";
    if (events.length===1) {
      queryParams += `AND id(e)=${events[0]} `;
    }
    else {
      queryParams += `AND id(e) IN [${events}] `;
    }
  }
  if (typeof parameters.organisations!=="undefined") {
    organisations = parameters.organisations;
    if (events.length>0) {
      match += ", (n:Person)-[rorganisation]->(o:Organisation)";
    }
    else {
      match = "(n:Person)-[rorganisation]->(o:Organisation)";
    }
    if (organisations.length===1) {
      queryParams += `AND id(o)=${organisations[0]} `;
    }
    else {
      queryParams += `AND id(o) IN [${organisations}] `;
    }
  }
  if (typeof parameters.people!=="undefined") {
    people = parameters.people;
    if (events.length>0 || organisations.length>0) {
      match += ", (n:Person)-[rperson]->(p:Person)";
    }
    else {
      match = "(n:Person)-[rperson]->(p:Person)";
    }
    if (people.length===1) {
      queryParams += `AND id(p)=${people[0]} `;
    }
    else {
      queryParams += `AND id(p) IN [${people}] `;
    }
  }
  if (typeof parameters.resources!=="undefined") {
    resources = parameters.resources;
    if (events.length>0 || organisations.length>0 || people.length>0) {
      match += ", (n:Person)-[rresource]->(re:Resource)";
    }
    else {
      match = "(n:Person)-[rresource]->(re:Resource)";
    }
    if (resources.length===1) {
      queryParams += `AND id(re)=${resources[0]} `;
    }
    else {
      queryParams += `AND id(re) IN [${resources}] `;
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
  query = `MATCH ${match} ${queryParams} RETURN n ORDER BY n.label SKIP ${skip} LIMIT ${limit}`;
  let data = await getPeopleQuery(query, match, queryParams, limit);
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

const getPeopleQuery = async (query, match, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  }).catch((error) => {
    console.log(error)
  });

  let nodes = helpers.normalizeRecordsOutput(nodesPromise, "n");

  // get related resources/thumbnails
  let nodeResourcesPromises = nodes.map(node => {
    let newPromise = new Promise(async (resolve,reject)=> {
      let relations = {};
      relations.nodeId = node._id;
      relations.resources = await helpers.loadRelations(node._id, "Person", "Resource", true);
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
    if (typeof nodeResources!=="undefined") {
      resources = nodeResources.resources.map(item=>{
        let ref = item.ref;
        let paths = item.ref.paths.map(path=> {
          let pathOut = null;
          if (typeof path==="string") {
            pathOut = JSON.parse(path);
            if (typeof pathOut==="string") {
              pathOut = JSON.parse(pathOut);
            }
          }
          else {
            pathOut = path;
          }
          return pathOut;
        });

        item.ref.paths = paths;
        return item;
      });
    }
    node.resources = nodeResources.resources;
    return node;
  });
  let count = await session.writeTransaction(tx=>
    tx.run(`MATCH ${match} ${queryParams} RETURN count(*)`)
  )
  .then(result=> {
    session.close();
    let resultRecord = result.records[0];
    let countObj = resultRecord.toObject();
    helpers.prepareOutput(countObj);
    let output = countObj['count(*)'];
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
* @api {get} /person Get person
* @apiName get person
* @apiGroup People
*
* @apiParam {string} _id The _id of the requested person.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"2069","honorificPrefix":["My"],"firstName":"fname","middleName":"mname","lastName":"lname","label":"fname mname lname","fnameSoundex":"F550","lnameSoundex":"L550","description":"description","status":"private","alternateAppelations":[{"appelation":"","firstName":"altfname","middleName":"altmname","lastName":"altlname","note":"note","language":{"value":"en","label":"English"}}],"createdBy":"260","createdAt":"2020-01-14T15:39:10.638Z","updatedBy":"260","updatedAt":"2020-01-14T15:42:42.939Z","events":[],"organisations":[],"people":[],"resources":[]},"error":[],"msg":"Query results"}
*/
const getPerson = async(req, resp) => {
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
  let session = driver.session();
  let query = "MATCH (n:Person) WHERE id(n)="+_id+" AND n.status='public' return n";
  let person = await session.writeTransaction(tx=>
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
  let events = await helpers.loadRelations(_id, "Person", "Event", true);
  let organisations = await helpers.loadRelations(_id, "Person", "Organisation", true);
  let people = await helpers.loadRelations(_id, "Person", "Person", true);
  let resources = await helpers.loadRelations(_id, "Person", "Resource", true);
  person.events = events;
  person.organisations = organisations;
  person.people = people;
  person.resources = resources;
  resp.json({
    status: true,
    data: person,
    error: [],
    msg: "Query results",
  });
}

const getPersonActiveFilters = async(req, resp) => {
  let parameters = req.body;
  let _ids = [];
  if (typeof parameters._ids!=="undefined" && parameters._ids.length>0) {
    _ids = parameters._ids;
  }
  let query = `MATCH (p:Person)-->(n) WHERE p.status='public' AND id(p) IN [${_ids}] AND (n:Event OR n:Organisation OR n:Person OR n:Resource) RETURN DISTINCT id(n) AS _id, n.label AS label, labels(n) as labels`;
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
  getPeople: getPeople,
  getPerson: getPerson,
  getPersonActiveFilters: getPersonActiveFilters,
};
