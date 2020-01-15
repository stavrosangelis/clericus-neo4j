const driver = require("../../config/db-driver");
const helpers = require("../../helpers");
const Resource = require("../resource.ctrl").Resource;
const TaxonomyTerm = require("../taxonomyTerm.ctrl").TaxonomyTerm;

/**
* @api {get} /classpieces Classpieces
* @apiName classpieces
* @apiGroup Classpieces
*
* @apiParam {string} [label] A string to match against a classpiece label
* @apiParam {string} [description] A string to match against a classpiece description
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
*
* @apiSuccess {number} currentPage The current page of results
* @apiSuccess {array} data An array of classpieces objects
* @apiSuccess {number} totalItems The total number of results
* @apiSuccess {number} totalPages The total number of available pages of results
*
* @apiSuccess (classpiece object) {object} Classpiece A classpiece object as part of the data array contains the following fields
* @apiSuccess (classpiece object) {string} Classpiece[metadata] A stringified JSON object containing the classpiece metadata
* @apiSuccess (classpiece object) {string} Classpiece[fileName] The file name of the classpiece
* @apiSuccess (classpiece object) {array} Classpiece[paths] An array containing the path to the fullsize version of the classpiece and to the thumbnail of the classpiece
* @apiSuccess (classpiece object) {string} Classpiece[systemType] The system type _id
* @apiSuccess (classpiece object) {string} Classpiece[label] The label of the classpiece
* @apiSuccess (classpiece object) {string} Classpiece[resourceType] The type of the classpiece, i.e. image
* @apiSuccess (classpiece object) {string} Classpiece[status] If the classpiece is private or public.
* @apiSuccess (classpiece object) {string} Classpiece[_id] The classpiece _id
* @apiSuccess (classpiece object) {array} Classpiece[systemLabels] A list of system tags for the classpiece
*
* @apiSuccessExample {json} Success-Response:
* {
    "status": true,
    "data": {
        "currentPage": 1,
        "data": [
            {
                "metadata": "\"{\\\"image\\\":{\\\"default\\\":{\\\"height\\\":6464,\\\"width\\\":4808,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":0,\\\"y\\\":0,\\\"rotate\\\":0},\\\"exif\\\":{\\\"image\\\":{\\\"XResolution\\\":240,\\\"YResolution\\\":240,\\\"ResolutionUnit\\\":2,\\\"Software\\\":\\\"Adobe Photoshop Lightroom Classic 7.3.1 (Windows)\\\",\\\"ModifyDate\\\":\\\"2018:07:02 12:56:59\\\",\\\"ExifOffset\\\":172},\\\"thumbnail\\\":{},\\\"exif\\\":{\\\"ExifVersion\\\":{\\\"type\\\":\\\"Buffer\\\",\\\"data\\\":[48,50,51,48]},\\\"ColorSpace\\\":1},\\\"gps\\\":{},\\\"interoperability\\\":{},\\\"makernote\\\":{}},\\\"iptc\\\":{}}}\"",
                "fileName": "1969-1970.jpg",
                "paths": [
                    "{\"path\":\"images/fullsize/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg\",\"pathType\":\"source\"}",
                    "{\"path\":\"images/thumbnails/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg\",\"pathType\":\"thumbnail\"}"
                ],
                "systemType": "{\"ref\":\"87\"}",
                "label": "1969-1970",
                "resourceType": "image",
                "status": false,
                "_id": "389",
                "systemLabels": [
                    "Resource"
                ]
            }
        ],
        "totalItems": 1,
        "totalPages": 1
    },
    "error": [],
    "msg": "Query results"
}
*/

const getClasspieces = async (req, resp) => {
  let parameters = req.query;
  let label = "";
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
    output = parseInt(output,10);
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


/**
* @api {get} /classpiece/:_id Classpiece
* @apiName classpiece
* @apiGroup Classpieces
*
* @apiParam {string} _id The id of the requested classpiece
*
* @apiSuccess (classpiece object) {object} metadata The classpiece metadata
* @apiSuccess (classpiece object) {string} fileName The file name of the classpiece
* @apiSuccess (classpiece object) {array} paths An array containing the path to the fullsize version of the classpiece and to the thumbnail of the classpiece
* @apiSuccess (classpiece object) {string} systemType The system type _id
* @apiSuccess (classpiece object) {string} label The label of the classpiece
* @apiSuccess (classpiece object) {string} resourceType The type of the classpiece, i.e. image
* @apiSuccess (classpiece object) {string} status If the classpiece is private or public
* @apiSuccess (classpiece object) {string} _id The classpiece _id
* @apiSuccess (classpiece object) {array} events A list of associated events
* @apiSuccess (classpiece object) {array} organisations A list of associated organisations
* @apiSuccess (classpiece object) {array} people A list of associated people
* @apiSuccess (classpiece object) {array} resources A list of associated resources
*
* @apiSuccessExample {json} Success-Response:
* {
    "status": true,
    "data": {
        "metadata": {},
        "fileName": "1969-1970.jpg",
        "paths": [
            {
                "path": "images/fullsize/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg",
                "pathType": "source"
            },
            {
                "path": "images/thumbnails/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg",
                "pathType": "thumbnail"
            }
        ],
        "systemType": "{\"ref\":\"87\"}",
        "label": "1969-1970",
        "resourceType": "image",
        "status": false,
        "_id": "389",
        "events": [],
        "organisations": [],
        "people": [],
        "resources": [],
      },
  "error": [],
  "msg": "Query results"
}
*/
const getClasspiece = async(req, resp) => {
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
  if (typeof classpiece.metadata==="string") {
    classpiece.metadata = JSON.parse(classpiece.metadata);
  }
  if (typeof classpiece.paths[0]==="string") {
    classpiece.paths = classpiece.paths.map(p=>{
      let path = JSON.parse(p);
      if (typeof path==="string") {
        path = JSON.parse(path)
      }
      return path;
    });
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
