const driver = require('../config/db-driver');
const {
  addslashes,
  normalizeRecordsOutput,
  outputRecord,
  prepareNodeProperties,
  prepareOutput,
  prepareParams,
} = require('../helpers');

class Job {
  constructor({
    _id = null,
    label = '',
    type = null,
    output = null,
    relId = null,
    completed = false,
    createdBy = null,
    createdAt = null,
    updatedBy = null,
    updatedAt = null,
  }) {
    this._id = _id;
    if (label !== '') {
      this.label = label.trim();
    }
    this.type = type;
    if (output !== null) {
      this.output = output;
    }
    this.relId = relId;
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
        msg: 'The job label must not be empty',
      });
    }
    const allowedTypes = ['import-csv', 'import-excel'];
    if (this.type === '') {
      status = false;
      errors.push({
        field: 'type',
        msg: 'The job type must not be empty',
      });
    }
    if (allowedTypes.indexOf(this.type) === -1) {
      status = false;
      errors.push({
        field: 'type',
        msg: `The job type "${
          this.type
        }" is not allowed. Allowed values are one of "${allowedTypes.join(
          ','
        )}" must be empty`,
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
    if (this._id === null && this.relId === null) {
      return false;
    }
    const session = driver.session();
    let params = '';
    if (this._id !== null) {
      params = `id(n)=${this._id}`;
    } else {
      if (this.relId !== null) {
        params = `n.relId='${this.relId}'`;
      }
      if (this.type !== null) {
        if (params !== '') {
          params += ' AND ';
        }
        params += `n.type=${this.type}`;
      }
    }

    const query = `MATCH (n:Job) WHERE ${params} RETURN n`;
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const records = result.records;
        if (records.length > 0) {
          const record = records[0].toObject();
          const outputRecord = outputRecord(record.n);
          return outputRecord;
        }
      })
      .catch((error) => {
        console.log(error);
      });

    for (let key in node) {
      this[key] = node[key];
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
        const original = new Job({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      const nodeProperties = prepareNodeProperties(this);
      const params = prepareParams(this);

      let query = '';
      if (typeof this._id === 'undefined' || this._id === null) {
        query = `CREATE (n:Job ${nodeProperties}) RETURN n`;
      } else {
        query = `MATCH (n:Job) WHERE id(n)=${this._id} SET n=${nodeProperties} RETURN n`;
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
            output = { error: [], status: true, data: resultRecord };
          }
          return output;
        })
        .catch((error) => {
          console.log(error);
        });
      return resultPromise.data;
    }
  }

  async delete() {
    const session = driver.session();
    const query = `MATCH (n:Job) WHERE id(n)=${this._id} DELETE n`;
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

/**
* @api {get} /jobs Get jobs
* @apiName get jobs
* @apiGroup Jobs
*
* @apiParam {_id} [_id] A unique _id.
* @apiParam {string} [label] A string to match against the jobs' labels.
* @apiParam {string} [type] A string to match against the jobs' type.
* @apiParam {string} [relId] A string to match against the jobs' related _id.
* @apiParam {boolean} [completed] The jobs' status.
* @apiParam {string} [orderField=_id] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiSuccessExample {json} Success-Response:
{
  "status": true,
  "data": [],
  "error": [],
  "msg": "Query results"
}
*/
const getJobs = async (req, resp) => {
  const parameters = req.query;
  const _id = parameters._id || null;
  const label = parameters.label || null;
  const type = parameters.type || null;
  const relId = parameters.relId || null;
  const completed = parameters.completed || null;
  const orderField = parameters.orderField || '_id';
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
    if (type !== null && type !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += `n.type = "${type}" `;
    }
    if (relId !== null && relId !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += `n.relId = "${relId}" `;
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
  const query = `MATCH (n:Job) ${queryParams} RETURN n ${queryOrder} SKIP ${skip} LIMIT ${limit}`;
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

  const queryCount = `MATCH (n:Job) ${queryParams} RETURN count(*)`;

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

module.exports = {
  Job: Job,
  getJobs: getJobs,
};
