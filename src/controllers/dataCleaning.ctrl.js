const driver = require('../config/db-driver');
const {
  addslashes,
  hashFileName,
  normalizeRecordsOutput,
  outputRecord,
  prepareDate,
  prepareNodeProperties,
  prepareOutput,
  prepareParams,
  splitMultiString,
} = require('../helpers');
const { ImportPlan } = require('./importPlan.ctrl');
const mimeType = require('mime-types');
const readXlsxFile = require('read-excel-file/node');
const csvParser = require('csv-parser');
const fs = require('fs');

const unlinkFile = (path) => {
  return new Promise((resolve) => {
    fs.unlink(path, (err) => {
      let output = {};
      if (err) {
        output.error = err;
        output.status = false;
      } else {
        output.status = true;
        output.message = 'File "' + path + '" deleted successfully';
      }
      resolve(output);
    });
  }).catch((error) => {
    return error;
  });
};

class DataCleaning {
  constructor({
    _id = null,
    label = '',
    type = '',
    output = null,
    importPlanId = null,
    rule = null,
    completed = false,
    createdBy = null,
    createdAt = null,
    updatedBy = null,
    updatedAt = null,
  }) {
    if (typeof _id !== 'undefined' && _id !== null) {
      this._id = _id;
    }
    if (label !== '') {
      this.label = label.trim();
    }
    this.type = type;
    if (output !== null) {
      this.output = output;
    }
    if (importPlanId !== null) {
      this.importPlanId = importPlanId;
    }
    this.rule = rule;
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
        msg: 'The data cleaning / disambiguation label must not be empty',
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
    const query = `MATCH (n:DataCleaning) WHERE ${params} RETURN n`;
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
        const original = new DataCleaning({ _id: this._id });
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
        query = `CREATE (n:DataCleaning ${nodeProperties}) RETURN n`;
      } else {
        query = `MATCH (n:DataCleaning) WHERE id(n)=${this._id} SET n=${nodeProperties} RETURN n`;
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
    const instance = new DataCleaning({ _id: this._id });
    await instance.load();

    if (instance.output !== null) {
      await unlinkFile(instance.output);
    }
    const query = `MATCH (n:DataCleaning) WHERE id(n)=${this._id} DELETE n`;
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
* @api {get} /data-cleaning Get Data cleaning / disambiguation
* @apiName get data-cleaning
* @apiGroup DataCleanings
*
* @apiParam {_id} [_id] A unique _id.
* @apiParam {string} [label] A string to match against the data cleaning / disambiguations labels.
* @apiParam {string} [type] A string to match against the data cleaning / disambiguations type.
* @apiParam {string} [importPlanId] A string to match against the data cleaning / disambiguation related _id.
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
const getDataCleaning = async (req, resp) => {
  const parameters = req.query;
  const _id = parameters._id || null;
  const label = parameters.label || null;
  const type = parameters.type || null;
  const importPlanId = parameters.importPlanId || null;
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
    if (importPlanId !== null && importPlanId !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += `n.importPlanId = "${importPlanId}" `;
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
  const query = `MATCH (n:DataCleaning) ${queryParams} RETURN n ${queryOrder} SKIP ${skip} LIMIT ${limit}`;
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

  const queryCount = `MATCH (n:DataCleaning) ${queryParams} RETURN count(*)`;

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
* @api {get} /data-cleaning-instance Get Data cleaning / disambiguation
* @apiName get data-cleaning instance
* @apiGroup DataCleanings
*
* @apiParam {string} _id The _id of the requested data cleaning instance.

*/
const getInstance = async (req, resp) => {
  const parameters = req.query;
  if (typeof parameters._id === 'undefined' || parameters._id === '') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
    return false;
  }
  const { _id } = parameters;
  const instance = new DataCleaning({ _id });
  await instance.load();
  if (typeof instance.output !== 'undefined' && instance.output !== null) {
    const newOutput = await new Promise((resolve, reject) => {
      fs.readFile(instance.output, 'utf-8', (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    }).catch((error) => {
      console.log(error);
    });
    instance.outputData = newOutput;
  }
  resp.json({
    status: true,
    data: instance,
    error: [],
    msg: 'Query results',
  });
};

/**
 * @api {put} /data-cleaning-instance Put Data cleaning /
 * @apiName put data-cleaning instance
 * @apiGroup DataCleanings
 * @apiPermission admin
 *
 * @apiParam {string} [_id] The _id of the import. This should be undefined|null|blank in the creation of a new import.
 * @apiParam {string} [label] The label of the new import.
 */
const putInstance = async (req, resp) => {
  const postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The Data Cleaning data must not be empty',
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
  const instance = new DataCleaning(instanceData);
  const output = await instance.save(userId);
  resp.json(output);
};

const extractDirPath = (path) => {
  const parts = path.split('/');
  parts.splice(-1);
  return parts.join('/');
};

/**
 * @api {delete} /data-cleaning-instance Get Data cleaning / disambiguation
 * @apiName delete data-cleaning instance
 * @apiGroup DataCleanings
 * @apiPermission admin
 *
 * @apiParam {string} _id The id of the data cleaning instance for deletion.
 **/
const deleteInstance = async (req, resp) => {
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
  const instance = new DataCleaning({ _id });
  await instance.load();
  // delete existing file if exists
  const existingFilePath = instance.output || null;
  if (existingFilePath !== null) {
    unlinkFile(existingFilePath);
  }

  const data = await instance.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: 'Query results',
  });
};

const loadDataRows = async (importData = null) => {
  if (importData === null) {
    return [];
  }
  const paths = importData.uploadedFileDetails.paths[0];
  const path = typeof paths === 'string' ? JSON.parse(paths).path : paths.path;
  const type = mimeType.lookup(path);
  const extension = mimeType.extension(type);
  const excel = ['xls', 'xlsx'];
  let rows = [];
  if (excel.indexOf(extension) > -1) {
    rows = readXlsxFile(path).then((results, errors) => {
      if (errors) {
        return errors;
      } else {
        return results;
      }
    });
  } else if (extension === 'csv') {
    const csvData = await new Promise((resolve) => {
      const results = [];
      fs.createReadStream(path)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve(results);
        });
    });
    for (let i = 0; i < csvData.length; i += 1) {
      const row = csvData[i];
      const rowsKeys = Object.keys(row);
      const newRow = [];
      for (let j = 0; j < rowsKeys.length; j += 1) {
        const col = rowsKeys[j];
        let value = row[col];
        if (value === '') {
          value = null;
        } else if (!isNaN(value)) {
          value = Number(value);
        }
        newRow.push(value);
      }
      rows.push(newRow);
    }
  }
  return rows;
};

const compareArrayChildrenLength = (columnsLength, array) => {
  let key = 0;
  for (let i = 0; i < columnsLength; i += 1) {
    const length = array[i].length;
    const prevLength = i > 0 ? array[i - 1].length : 0;
    if (length >= prevLength) {
      key = i;
    }
  }
  return key;
};

const fetchSiblingArrayValue = (array, siblingIndex, next = false) => {
  let value = array[siblingIndex] || '';
  if (value === '' && siblingIndex >= 0) {
    if (next) {
      value = fetchSiblingArrayValue(array, siblingIndex + 1);
    } else {
      value = fetchSiblingArrayValue(array, siblingIndex - 1);
    }
  }
  return value;
};

const mergeArrayValues = (array, key) => {
  const texts = [];
  for (let i = 0; i < array[key].length; i += 1) {
    let text = [];
    const obj = array[key][i];
    text.push(obj);
    if (key > 0) {
      for (let j = key - 1; j >= 0; j -= 1) {
        const prevSiblingVal = fetchSiblingArrayValue(array[j], i);
        text = [prevSiblingVal, ...text];
      }
      for (let k = key + 1; k < array.length; k += 1) {
        const nextSiblingVal = fetchSiblingArrayValue(array[k], i);
        text.push(nextSiblingVal);
      }
    }
    texts.push(text);
  }
  return texts;
};
/**
* @api {get} /data-cleaning-unique Get Data cleaning / disambiguation unique values
* @apiName get data-cleaning unique values
* @apiGroup DataCleanings
*
* @apiParam {string} _id The _id of the requested import.
* @apiSuccessExample {json} Success-Response:
{"error":[],"status":true,"data":{"createdAt":"2021-11-09T12:13:46.110Z","updatedBy":"53930","importPlanId":"93912","createdBy":"53930","rule":"{\"type\":\"unique\",\"columns\":[{\"value\":8,\"label\":\"[I] Diocese\"}],\"entityType\":\"\"}","_id":"93958","label":"date unique","completed":false,"type":"unique","updatedAt":"2021-11-09T12:14:03.991Z"}}
*/
const getUnique = async (req, resp) => {
  const parameters = req.query;
  const { columns: columnsParam } = parameters || [];
  const { _id } = parameters || null;
  const userId = req.decoded.id;
  if (_id === null) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid _id to continue.',
    });
    return false;
  }
  if (typeof columnsParam === 'undefined' || columnsParam.length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select one or more columns to continue.',
    });
    return false;
  }
  const columns = columnsParam.map((c) => JSON.parse(c));

  const instance = new DataCleaning({ _id });
  await instance.load();

  const importData = new ImportPlan({ _id: instance.importPlanId });
  await importData.load();

  const paths = importData.uploadedFileDetails.paths[0];
  const path = typeof paths === 'string' ? JSON.parse(paths).path : paths.path;
  const type = mimeType.lookup(path);
  const extension = mimeType.extension(type);
  const dir = extractDirPath(path);

  const rows = await loadDataRows(importData);
  const uniqueValues = [];
  const uniqueOut = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowsKeys = Object.keys(row);
    let texts = [];
    const textParts = [];
    for (let c = 0; c < columns.length; c += 1) {
      const col = columns[c];
      textParts[c] = [];
      const { value } = col;
      const key = rowsKeys[value];
      let cellVal = row[key] !== null ? row[key] : '';
      if (cellVal !== '' && typeof cellVal === 'string') {
        cellVal = cellVal.trim();
      }
      const colValues = cellVal !== '' ? splitMultiString(cellVal) : [];
      if (colValues.length > 0) {
        for (let vi = 0; vi < colValues.length; vi += 1) {
          const colValue = colValues[vi];
          textParts[c].push(colValue);
        }
      }
    }
    if (textParts.length > 0) {
      // get the key of the child array containing the most objects
      const activeKey = compareArrayChildrenLength(columns.length, textParts);
      // loop through the biggest child array and fill in with values from its siblings
      texts = mergeArrayValues(textParts, activeKey);
    }
    if (texts.length > 0) {
      for (let ti = 0; ti < texts.length; ti += 1) {
        const textRow = texts[ti];
        const text = textRow.join(' ');
        if (uniqueValues.indexOf(text) === -1) {
          uniqueValues.push(text);
          uniqueOut.push({ text, rows: [i + 1] });
        } else {
          const index = uniqueValues.indexOf(text);
          const row = { ...uniqueOut[index] };
          row.rows.push(i + 1);
          uniqueOut[index].row = row;
        }
      }
    }
  }

  // delete existing file if exists
  const existingFilePath = instance.output || null;
  if (existingFilePath !== null) {
    unlinkFile(existingFilePath);
  }
  const outputPath = `${dir}/${hashFileName(instance.label)}.json`;
  fs.writeFile(outputPath, JSON.stringify(uniqueOut), 'utf8', function (err) {
    if (err) {
      console.log(err);
    }
  });
  instance.output = outputPath;
  instance.completed = true;
  const update = new DataCleaning(instance);
  update.save(userId);

  resp.json({
    status: true,
    data: extension,
    error: [],
    msg: 'Query results',
  });
};

const getDBentry = async (item = null, itemType = null) => {
  if (item === null || itemType === null) {
    return null;
  }
  let queryParams = '';
  for (let key in item) {
    if (queryParams !== '') {
      queryParams += ' AND ';
    }
    const value = item[key];
    if (key !== '_id') {
      if (isNaN(value)) {
        queryParams += `n.${key}="${value}"`;
      } else {
        queryParams += `n.${key}=${value}`;
      }
    } else {
      if (isNaN(value)) {
        queryParams += `id(n)="${value}"`;
      } else {
        queryParams += `id(n)=${value}`;
      }
    }
  }
  const session = driver.session();
  const query = `MATCH (n:${itemType}) WHERE ${queryParams} RETURN n`;
  const node = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      const results = [];
      const records = result.records;
      for (let i = 0; i < records.length; i += 1) {
        const record = records[i].toObject();
        const dbRecord = outputRecord(record.n);
        results.push(dbRecord);
      }
      return results;
    })
    .catch((error) => {
      console.log(error);
    });
  return node;
};

/**
* @api {get} /data-cleaning-db-entries Get Data cleaning / disambiguation compare with values
* @apiName get data-cleaning unique values
* @apiGroup DataCleanings
*
* @apiParam {string} _id The _id of the requested import.
* @apiSuccessExample {json} Success-Response:
{
  "status": true,
  "data": [
    [null, "O'Byrne", "O'Beirne", "Denis", "Dionysius", "Latin", null, null,  null, null, null, null, null, null, "L. W. B. Brockliss and Patrick Ferté (eds), 'Prosopography of Irish Clerics in the Universities of Paris and Toulouse, 1573-1792'"],
    [null, "Brady", null, "Philip", "Philippus", "Latin", null, null, "Kilmore", 737, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, "University of Paris", "Paris", null, null, null, null, null, null, null, "Faculty of Law", "1703-10-??", null, "Bachelors in Canon Law", "1704-12-12", "Licentiate in Canon Law", "1705-08-29", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, "L. W. B. Brockliss and Patrick Ferté (eds), 'Prosopography of Irish Clerics in the Universities of Paris and Toulouse, 1573-1792'"],
  ],
  "error": [],
  "msg": "Query results"
}
*/
const getDBentries = async (req, resp) => {
  const parameters = req.query;
  const { columns: columnsParam } = parameters || [];
  const { _id } = parameters || null;
  const userId = req.decoded.id;
  const { entityType } = parameters || null;
  if (_id === null) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid _id to continue.',
    });
    return false;
  }
  if (typeof columnsParam === 'undefined' || columnsParam.length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select one or more columns to continue.',
    });
    return false;
  }
  const columns = columnsParam.map((c) => JSON.parse(c));
  const instance = new DataCleaning({ _id });
  await instance.load();

  const importData = new ImportPlan({ _id: instance.importPlanId });
  await importData.load();

  const paths = importData.uploadedFileDetails.paths[0];
  const path = typeof paths === 'string' ? JSON.parse(paths).path : paths.path;
  const dir = extractDirPath(path);

  const rows = await loadDataRows(importData);

  const unique = [];
  const outputRows = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    let value = [];
    const items = [];
    let allValuesValid = true;
    for (let c = 0; c < columns.length; c += 1) {
      // select a row cell and match against the column parameter
      const col = columns[c];
      // split the cell value in multiple values per semi-colon
      let colValues = [];
      if (col.property !== '') {
        if (typeof col.custom !== 'undefined' && col.custom) {
          colValues = splitMultiString(col.customValue);
        } else {
          colValues = splitMultiString(row[Number(col.value)]);
        }
        if (colValues.length > 0) {
          for (let cvi = 0; cvi < colValues.length; cvi += 1) {
            const item = { ...items[cvi] } || {};
            const colValue = colValues[cvi];
            if (colValue !== null && typeof col.type !== 'undefined') {
              let newDate = null;
              switch (col.type) {
                case 'date':
                  newDate = prepareDate(colValue);
                  value = `${newDate.startDate}${newDate.endDate}${newDate.label}`;
                  switch (col.property) {
                    case 'startDate':
                      item.startDate = newDate.startDate;
                      break;
                    case 'endDate':
                      item.endDate = newDate.endDate;
                      break;
                    case 'dateRange (startDate - endDate)':
                      item.startDate = newDate.startDate;
                      item.endDate = newDate.endDate;
                      item.label = newDate.label;
                      break;
                  }
                  items[cvi] = item;
                  break;
                case 'string':
                  value += colValues.join();
                  item[col.property] = colValues;
                  items[cvi] = item;
                  break;
                default:
                  value += colValues.join();
                  item[col.property] = colValues;
                  items[cvi] = item;
                  break;
              }
            } else {
              value = '';
            }
          }
        } else {
          allValuesValid = false;
        }
      }
    }
    if (allValuesValid && value !== '' && unique.indexOf(value) === -1) {
      unique.push(value);

      let itemText = '';
      let itemIndex = 0;
      const entries = [];
      for (let ei = 0; ei < items.length; ei += 1) {
        const itemInstance = items[ei];
        for (let key in itemInstance) {
          if (itemInstance === itemInstance[key]) {
            continue;
          }
          if (itemIndex > 0) {
            itemText += ', ';
          }
          itemText += `${key}: "${itemInstance[key]}"`;
          itemIndex += 1;
        }

        const dbEntries = await getDBentry(itemInstance, entityType);

        for (let dbei = 0; dbei < dbEntries.length; dbei += 1) {
          const dbEntry = dbEntries[dbei];
          const link = `/${entityType.toLowerCase()}/${dbEntry._id}`;
          const entry = {
            _id: dbEntry._id,
            label: dbEntry.label,
            link: link,
          };
          entries.push(entry);
        }
      }
      const outputRow = {
        text: itemText,
        entries: entries,
      };
      outputRows.push(outputRow);
    }
  }
  // delete existing file if exists
  const existingFilePath = instance.output || null;
  if (existingFilePath !== null) {
    unlinkFile(existingFilePath);
  }
  const outputPath = `${dir}/${hashFileName(instance.label)}.json`;
  fs.writeFile(outputPath, JSON.stringify(outputRows), 'utf8', function (err) {
    if (err) {
      console.log(err);
    }
  });
  instance.output = outputPath;
  instance.completed = true;
  const update = new DataCleaning(instance);
  update.save(userId);

  resp.json({
    status: true,
    data: rows,
    error: [],
    msg: 'Query results',
  });
};

module.exports = {
  DataCleaning,
  getDataCleaning,
  getInstance,
  putInstance,
  deleteInstance,
  getUnique,
  getDBentries,
};
