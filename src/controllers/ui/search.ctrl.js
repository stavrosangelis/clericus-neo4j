const driver = require('../../config/db-driver');
const helpers = require('../../helpers');
const TaxonomyTerm = require('../taxonomyTerm.ctrl').TaxonomyTerm;

/**
* @api {post} /search Generic search
* @apiName generic-search
* @apiGroup Search
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"people":220,"resources":220,"organisations":80,"events":0},"error":false,"msg":""}
*/

const search = async (req, resp) => {
  const { body: params } = req;
  const { term = '' } = params;
  if (term === '') {
    return resp.status(400).json({
      status: false,
      data: [],
      error: true,
      msg: 'Please provide a valid search term to continue',
    });
  }
  const results = await fulltextSearch(term);
  const articles = results.filter((n) => n.type === 'Article');
  const events = results.filter((n) => n.type === 'Event');
  const organisations = results.filter((n) => n.type === 'Organisation');
  const people = results.filter((n) => n.type === 'Person');
  const classpieces = results.filter((n) => n.type === 'Classpiece');
  const resources = results.filter((n) => n.type === 'Resource');
  const spatial = results.filter((n) => n.type === 'Spatial');
  const temporal = results.filter((n) => n.type === 'Temporal');
  const response = {
    articles,
    events,
    organisations,
    people,
    classpieces,
    resources,
    spatial,
    temporal,
  };
  return resp.status(200).json({
    status: true,
    data: response,
    error: false,
    msg: '',
  });
};

const fulltextSearch = async (term) => {
  term = term.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
  const session = driver.session();
  const query = `CALL db.index.fulltext.queryNodes("fulltextSearch", "${term}") YIELD node, score
RETURN node, node.label, node.description, node.content, score`;
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  const nodes = [];
  const { length } = nodesPromise;
  for (let i = 0; i < length; i += 1) {
    const node = nodesPromise[i];
    const output = {};
    const record = node.toObject();
    output.label = record['node.label'];
    output.score = record.score;
    helpers.prepareOutput(record);
    const details = helpers.outputRecord(record.node);
    output.type = record.node.labels[0];
    if (output.type === 'Resource') {
      const classpieceSystemType = new TaxonomyTerm({ labelId: 'Classpiece' });
      await classpieceSystemType.load();
      if (details.systemType === classpieceSystemType._id) {
        output.type = 'Classpiece';
      }
    }
    output._id = details._id;
    output.status = details.status;
    if (typeof details.permalink !== 'undefined') {
      output.permalink = details.permalink;
    }
    if (output.status === 'public') {
      nodes.push(output);
    }
  }
  return nodes;
};

module.exports = {
  search,
};
