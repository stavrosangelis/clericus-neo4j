const driver = require('../config/db-driver');
const {
  addslashes,
  normalizeRecordsOutput,
  outputRecord,
  prepareNodeProperties,
  prepareOutput,
  prepareParams,
} = require('../helpers');

class ImportRule {
  constructor({
    _id = null,
    label = null,
    rule = null,
    importId = null,
    completed = false,
    createdBy = null,
    createdAt = null,
    updatedBy = null,
    updatedAt = null,
  }) {
    if (_id !== null) {
      this._id = _id;
    }
    if (label !== null && label !== '') {
      this.label = label.trim();
    }
    this.rule = rule;
    this.importId = importId;
    this.completed = completed;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedBy = updatedBy;
    this.updatedAt = updatedAt;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.label === '') {
      status = false;
      errors.push({
        field: 'label',
        msg: 'The import rule label must not be empty',
      });
    }
    const msg = !status ? 'The record is not valid' : 'The record is valid';
    const output = {
      status,
      msg,
      errors,
      data: [],
    };
    return output;
  }

  async load() {
    if (this._id === null) {
      return false;
    }
    const session = driver.session();
    let params = '';
    if (this._id !== null) {
      params = `id(n)=${this._id}`;
    }
    const query = `MATCH (n:ImportRule) WHERE ${params} RETURN n`;
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const records = result.records;
        if (records.length > 0) {
          const record = records[0].toObject();
          const output = outputRecord(record.n);
          return output;
        }
        return null;
      })
      .catch((error) => {
        console.log(error);
      });
    if (node !== null) {
      for (let key in node) {
        if (key === 'rule') {
          this[key] = JSON.parse(node[key]);
        } else {
          this[key] = node[key];
        }
      }
    } else {
      for (let key in this) {
        this[key] = null;
      }
    }
  }

  async save(userId) {
    const validateData = this.validate();
    if (!validateData.status) {
      return validateData;
    } else {
      const session = driver.session();
      // timestamps
      const now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
      } else {
        const original = new ImportRule({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;
      if (this.rule !== null) {
        this.rule = JSON.stringify(this.rule);
      }

      const nodeProperties = prepareNodeProperties(this);
      const params = prepareParams(this);

      let query = '';
      if (typeof this._id === 'undefined' || this._id === null) {
        query = `CREATE (n:ImportRule ${nodeProperties}) RETURN n`;
      } else {
        query = `MATCH (n:ImportRule) WHERE id(n)=${this._id} SET n=${nodeProperties} RETURN n`;
      }
      const resultPromise = await session
        .run(query, params)
        .then((result) => {
          session.close();
          const records = result.records;
          let output = {
            error: ['The record cannot be updated'],
            status: false,
            data: null,
          };
          if (records.length > 0) {
            const record = records[0];
            const key = record.keys[0];
            const recordObj = record.toObject()[key];
            const resultRecord = outputRecord(recordObj);
            for (let key in resultRecord) {
              this[key] = resultRecord[key];
            }
            output = { error: [], status: true, data: resultRecord };
          }
          return output;
        })
        .catch((error) => {
          console.log(error);
        });
      return resultPromise;
    }
  }

  async delete() {
    const session = driver.session();
    const query = `MATCH (n:ImportRule) WHERE id(n)=${this._id} DELETE n`;
    const deleteRecord = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        return result;
      })
      .catch((error) => {
        console.log(error);
      });
    return deleteRecord;
  }
}

const getQuery = async (query, queryParams, limit) => {
  const session = driver.session();
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  const nodes = normalizeRecordsOutput(nodesPromise);

  const queryCount = `MATCH (n:ImportRule) ${queryParams} RETURN count(*)`;

  const count = await session
    .writeTransaction((tx) => tx.run(queryCount))
    .then((result) => {
      session.close();
      const resultRecord = result.records[0];
      const countObj = resultRecord.toObject();
      prepareOutput(countObj);
      const output = countObj['count(*)'];
      return output;
    });

  const totalPages = Math.ceil(count / limit);
  const result = {
    nodes: nodes,
    count: count,
    totalPages: totalPages,
  };
  return result;
};

/**
 * @api {get} /import-rules Get import rules
 * @apiName get import rules
 * @apiGroup Import rules
 *
 * @apiParam {_id} [importId] An import unique _id.
 */
const getImportRules = async (req, resp) => {
  const parameters = req.query;
  const _id = parameters._id || null;
  const label = parameters.label || null;
  const importId = parameters.importId || null;
  const completed = parameters.completed || null;
  const orderField = parameters.orderField || 'createdAt';
  const orderDesc = parameters.orderDesc || null;
  const page = Number(parameters.page) || 1;
  const limit = Number(parameters.limit) || 25;
  const queryPage = page - 1 > 0 ? page - 1 : 0;
  let queryOrder = '';
  let queryParams = '';

  if (_id !== null) {
    queryParams = `id(n)=${_id} `;
  } else {
    if (label !== null && label !== '') {
      queryParams += `toLower(n.label) =~ toLower('.*${addslashes(label)}.*') `;
    }
    if (importId !== null && importId !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += `n.importId = "${importId}" `;
    }
    if (completed !== null && completed !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += `n.completed = "${completed}" `;
    }
    if (orderField !== '') {
      queryOrder = `ORDER BY n.${orderField}`;
      if (orderDesc !== null && orderDesc === 'true') {
        queryOrder += ' DESC';
      }
    }
  }
  if (queryParams !== '') {
    queryParams = `WHERE ${queryParams}`;
  }

  const currentPage = page === 0 ? 1 : page;
  const skip = limit * queryPage;
  const query = `MATCH (n:ImportRule) ${queryParams} RETURN n ${queryOrder} SKIP ${skip} LIMIT ${limit}`;
  const data = await getQuery(query, queryParams, limit);
  if (data.error) {
    resp.json({
      status: false,
      data: [],
      error: data.error,
      msg: data.error.message,
    });
  } else {
    const responseData = {
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

/**
* @api {get} /import-rule Get import rule
* @apiName get import rule
* @apiGroup Import rules
*
* @apiParam {string} _id The _id of the requested import rule.

*/
const getImportRule = async (req, resp) => {
  const parameters = req.query;
  const { _id } = parameters;
  if (typeof _id === 'undefined' || _id === '') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
    return false;
  }
  const instance = new ImportRule({ _id });
  await instance.load();
  resp.json({
    status: true,
    data: instance,
    error: [],
    msg: 'Query results',
  });
};

/**
 * @api {put} /import-rule Put import rule
 * @apiName put import rule
 * @apiGroup Import rules
 * @apiPermission admin
 *
 * @apiParam {string} [_id] The _id of the import rule. This should be undefined|null|blank in the creation of a new import.
 * @apiParam {string} [label] The label of the new import rule.
 * @apiParam {array} [rule] An array containing the import rule details.
 * @apiParam {string} [importId] The _id of the an associated import.
 * @apiParam {boolean} [completed] If the rule execution has completed or not.
 */
const putImportRule = async (req, resp) => {
  const postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The import rule data must not be empty',
    });
    return false;
  }
  let instanceData = {};
  for (let key in postData) {
    if (postData[key] !== null) {
      instanceData[key] = postData[key];
    }
  }
  const userId = req.decoded.id;
  const instance = new ImportRule(instanceData);
  const output = await instance.save(userId);
  resp.json(output);
};

/**
 * @api {delete} /import-rule Delete import rule
 * @apiName delete import rule
 * @apiGroup Import rules
 * @apiPermission admin
 *
 * @apiParam {string} _id The id of the import rule for deletion.
 **/
const deleteImportRule = async (req, resp) => {
  const parameters = req.body;
  const { _id } = parameters;
  if (typeof _id === 'undefined' || _id === '') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
    return false;
  }
  const instance = new ImportRule({ _id });
  const data = await instance.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: 'Query results',
  });
};

module.exports = {
  getImportRules,
  getImportRule,
  putImportRule,
  deleteImportRule,
};
