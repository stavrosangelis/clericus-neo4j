const driver = require('../config/db-driver');
const helpers = require('../helpers');

const getContactForms = async (req, resp) => {
  let parameters = req.query;
  let name = '';
  let email = '';
  let subject = '';
  let page = 0;
  let orderField = 'createdAt';
  let queryPage = 0;
  let queryOrder = 'DESC';
  let limit = 25;

  let query = '';
  let queryParams = '';
  if (typeof parameters.name !== 'undefined') {
    name = parameters.name;
    if (name !== '') {
      queryParams += "toLower(n.name) =~ toLower('.*" + name + ".*') ";
    }
  }
  if (typeof parameters.email !== 'undefined') {
    email = parameters.email;
    if (email !== '') {
      queryParams += "toLower(n.email) =~ toLower('.*" + email + ".*') ";
    }
  }
  if (typeof parameters.subject !== 'undefined') {
    subject = parameters.subject;
    if (subject !== '') {
      queryParams += "toLower(n.subject) =~ toLower('.*" + subject + ".*') ";
    }
  }

  if (typeof parameters.orderField !== 'undefined') {
    orderField = parameters.orderField;
  }
  if (orderField !== '') {
    queryOrder = 'ORDER BY n.' + orderField;
    if (
      typeof parameters.orderDesc !== 'undefined' &&
      parameters.orderDesc === 'true'
    ) {
      queryOrder += ' DESC';
    }
  }
  if (typeof parameters.page !== 'undefined') {
    page = parseInt(parameters.page, 10);
    queryPage = parseInt(parameters.page, 10) - 1;
  }
  if (typeof parameters.limit !== 'undefined') {
    limit = parseInt(parameters.limit, 10);
  }
  let currentPage = page;
  if (page === 0) {
    currentPage = 1;
  }
  let skip = limit * queryPage;
  if (queryParams !== '') {
    queryParams = 'WHERE ' + queryParams;
  }

  query =
    'MATCH (n:ContactForm) ' +
    queryParams +
    ' RETURN n ' +
    queryOrder +
    ' SKIP ' +
    skip +
    ' LIMIT ' +
    limit;
  let data = await getContactFormsQuery(query, queryParams, limit);
  if (data.error) {
    resp.json({
      status: false,
      data: [],
      error: data.error,
      msg: data.error.message,
    });
  } else {
    let responseData = {
      currentPage: currentPage,
      data: data.nodes,
      totalItems: data.count,
      totalPages: data.totalPages,
    };
    resp.json({
      status: true,
      data: responseData,
      error: [],
      msg: 'Query results',
    });
  }
};

const getContactFormsQuery = async (query, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });

  let nodes = helpers.normalizeRecordsOutput(nodesPromise);

  let count = await session
    .writeTransaction((tx) =>
      tx.run('MATCH (n:ContactForm) ' + queryParams + ' RETURN count(*)')
    )
    .then((result) => {
      session.close();
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['count(*)'];
      return parseInt(output, 10);
    });
  let totalPages = Math.ceil(count / limit);
  let result = {
    nodes: nodes,
    count: count,
    totalPages: totalPages,
  };
  return result;
};

const getContactForm = async (req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id === 'undefined' || parameters._id === '') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
    return false;
  }
  let _id = null;
  if (typeof parameters._id !== 'undefined' && parameters._id !== '') {
    _id = parameters._id;
  }
  let query = `MATCH (n:ContactForm) WHERE id(n)=${_id} return n`;
  let session = driver.session();
  let node = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      let records = result.records;
      if (records.length > 0) {
        let record = records[0];
        let key = record.keys[0];
        let output = record.toObject()[key];
        output = helpers.outputRecord(output);
        return output;
      }
    });
  resp.json({
    status: true,
    data: node,
    error: [],
    msg: 'Query results',
  });
};

module.exports = {
  getContactForms: getContactForms,
  getContactForm: getContactForm,
};
