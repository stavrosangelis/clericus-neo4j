const driver = require("../../config/db-driver");
const helpers = require("../../helpers");

/**
* @api {post} /search Generic search
* @apiName generic-search
* @apiGroup Search
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"people":220,"resources":220,"organisations":80,"events":0},"error":false,"msg":""}
*/

const search = async (req, resp) => {
  let parameters = req.body;
  let term = "";
  if (typeof parameters.term!=="undefined") {
    term = parameters.term;
  }
  else {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please provide a valid search term to continue',
    });
    return false;
  }
  let results = await fulltextSearch(term);
  let articles = results.filter(n=>n.type==="Article");
  let events = results.filter(n=>n.type==="Event");
  let organisations = results.filter(n=>n.type==="Organisation");
  let people = results.filter(n=>n.type==="Person");
  let resources = results.filter(n=>n.type==="Resource");
  let spatial = results.filter(n=>n.type==="Spatial");
  let temporal = results.filter(n=>n.type==="Temporal");
  let response = {
    articles: articles,
    events: events,
    organisations: organisations,
    people: people,
    resources: resources,
    spatial: spatial,
    temporal: temporal,
  }
  resp.json({
    status: true,
    data: response,
    error: false,
    msg: '',
  });
}

const fulltextSearch = async (term) => {
  term = term.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
  let session = driver.session();
  let query = `CALL db.index.fulltext.queryNodes("fulltextSearch", "${term}") YIELD node, score
RETURN node, node.label, node.description, node.content, score`;
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  }).catch((error) => {
    console.log(error)
  });

  let nodes = nodesPromise.map(node=>{
    let output = {};
    let record = node.toObject();
    output.label = record['node.label'];
    output.score = record.score;
    helpers.prepareOutput(record);
    let details = helpers.outputRecord(record.node);
    output.type = record.node.labels[0];
    output._id = details._id;
    output.status = details.status;
    if (typeof details.permalink!=="undefined") {
      output.permalink = details.permalink;
    }
    return output;
  });
  nodes = nodes.filter(n=>n.status==="public");
  return nodes;
}


module.exports = {
  search: search
}
