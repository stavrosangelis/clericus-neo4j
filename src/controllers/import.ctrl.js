const driver = require('../config/db-driver');
const helpers = require('../helpers');
const fs = require('fs');
const mimeType = require('mime-types');
const formidable = require('formidable');
const readXlsxFile = require('read-excel-file/node');
const csvParser = require('csv-parser');
const { UploadedFile } = require('./uploadedFile.ctrl');
const { Job } = require('./jobs.ctrl');
const { ARCHIVEPATH } = process.env;

const parseFormDataPromise = (req) => {
  return new Promise((resolve) => {
    new formidable.IncomingForm().parse(req, (err, fields, files) => {
      if (err) {
        console.error('Error', err);
        throw err;
      }
      const output = {};
      output.fields = fields;
      output.file = files;
      resolve(output);
    });
  });
};

const uploadFilePath = (importDataLabel = null) => {
  const date = new Date();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  let path = `${ARCHIVEPATH}imports/${year}/${month}/`;
  if (importDataLabel !== null && importDataLabel !== '') {
    path += `${helpers.normalizeLabelId(importDataLabel)}/`;
  }
  return path;
};

const uploadFile = async (
  uploadedFile = null,
  hashedName = '',
  importDataLabel = null
) => {
  if (uploadedFile === null || hashedName === '') {
    return false;
  }
  // patch for the case when the archive path is in a different drive
  const tempPath = `${ARCHIVEPATH}temp/${hashedName}`;
  await fs.copyFileSync(uploadedFile.path, tempPath);
  uploadedFile.path = tempPath;

  const sourcePath = uploadedFile.path;
  const newDir = uploadFilePath(importDataLabel);
  const targetPath = `${newDir}${hashedName}`;
  uploadedFile.path = targetPath;

  if (!fs.existsSync(newDir)) {
    await fs.mkdirSync(newDir, { recursive: true }, (err) => {
      console.log(err);
    });
  }
  const uploadFilePromise = await new Promise((resolve) => {
    fs.rename(sourcePath, targetPath, function (error) {
      const output = {};
      if (error) {
        output.status = false;
        output.msg = error;
      } else {
        output.status = true;
        output.msg = `File "${uploadedFile.name}" uploaded successfully`;
        output.path = targetPath;
        output.fileName = hashedName;
      }
      resolve(output);
    });
  });
  return uploadFilePromise;
};

const deleteUploadedFile = async (_id) => {
  const file = new UploadedFile({ _id });
  await file.delete();
};

const parseUploadedFile = async ({
  importData = null,
  userId = null,
  path = null,
  extension = 'csv',
}) => {
  if (importData === null || path === null) {
    return false;
  }
  const fileExists = await fs.existsSync(path);
  if (fileExists) {
    if (extension === 'csv') {
      const csvHeaders = await new Promise((resolve, reject) => {
        fs.createReadStream(path)
          .pipe(csvParser())
          .on('error', (error) => {
            console.log(error);
            reject(error);
          })
          .on('headers', (headers) => {
            resolve(headers);
          });
      });
      importData.columns = csvHeaders;
      importData.columnsParsed = true;
      const updatedImport = new Import(importData);
      updatedImport.save(userId);
    } else {
      readXlsxFile(path).then((rows, errors) => {
        if (errors) {
          return errors;
        } else {
          importData.columns = rows[0];
          importData.columnsParsed = true;
          const updatedImport = new Import(importData);
          updatedImport.save(userId);
        }
      });
    }
  }
};

class Import {
  constructor({
    _id = null,
    label = '',
    uploadedFile = null,
    uploadedFileDetails = null,
    columns = [],
    columnsParsed = false,
    relations = [],
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
    if (uploadedFile !== null) {
      this.uploadedFile = uploadedFile;
    }
    if (uploadedFileDetails !== null) {
      this.uploadedFileDetails = uploadedFileDetails;
    }
    this.columns = columns;
    this.columnsParsed = columnsParsed;
    this.relations = relations;
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
        msg: 'Label must not be empty',
      });
    }

    let msg = 'The record is valid';
    if (!status) {
      msg = 'The record is not valid';
    }
    let output = {
      status: status,
      msg: msg,
      errors: errors,
      data: [],
    };
    return output;
  }

  async load() {
    if (this._id === null) {
      return false;
    }
    const session = driver.session();
    const query = `MATCH (n:Import) WHERE id(n)=${this._id} RETURN n`;
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        let records = result.records;
        if (records.length > 0) {
          let record = records[0].toObject();
          let outputRecord = helpers.outputRecord(record.n);
          return outputRecord;
        }
      })
      .catch((error) => {
        console.log(error);
      });
    for (let key in node) {
      this[key] = node[key];
    }
    if (typeof this.uploadedFile !== 'undefined' && this.uploadedFile !== '') {
      const uploadedFileDetails = new UploadedFile({ _id: this.uploadedFile });
      await uploadedFileDetails.load();
      this.uploadedFileDetails = uploadedFileDetails;
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
        const original = new Import({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;
      if (typeof this.uploadedFileDetails !== 'undefined') {
        this.uploadedFileDetails = null;
      }

      const nodeProperties = helpers.prepareNodeProperties(this);
      const params = helpers.prepareParams(this);
      let query = '';
      if (typeof this._id === 'undefined' || this._id === null) {
        query = `CREATE (n:Import ${nodeProperties}) RETURN n`;
      } else {
        query = `MATCH (n:Import) WHERE id(n) = ${this._id} SET n=${nodeProperties} RETURN n`;
      }
      const resultPromise = await session
        .run(query, params)
        .then((result) => {
          session.close();
          let records = result.records;
          let output = {
            error: ['The record cannot be updated'],
            status: false,
            data: [],
          };
          if (records.length > 0) {
            let record = records[0];
            let key = record.keys[0];
            let resultRecord = record.toObject()[key];
            resultRecord = helpers.outputRecord(resultRecord);
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
    await this.load();
    // 1. delete related directory
    if (
      typeof this.uploadedFileDetails !== 'undefined' &&
      this.uploadedFileDetails !== null
    ) {
      const { year, month } = this.uploadedFileDetails;

      if (typeof year !== 'undefined' && month !== 'undefined') {
        const dir = `${ARCHIVEPATH}imports/${year}/${month}/${helpers.normalizeLabelId(
          this.label
        )}`;
        fs.rmdirSync(dir, { recursive: true });
      }
      await deleteUploadedFile(this.uploadedFile);
    }

    // 2. delete relations
    const query1 = `MATCH (n:Import)-[r]-() WHERE id(n)=${this._id} DELETE r`;
    await session
      .writeTransaction((tx) => tx.run(query1, {}))
      .then((result) => {
        return result;
      })
      .catch((error) => {
        console.log(error);
      });
    // 3. delete node
    const query = `MATCH (n:Import) WHERE id(n)=${this._id} DELETE n`;
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
 * @api {get} /imports Get imports
 * @apiName get imports
 * @apiGroup Imports
 *
 * @apiParam {_id} [_id] A unique _id.
 * @apiParam {string} [label] A string to match against the peoples' labels.
 * @apiParam {string} [orderField=label] The field to order the results by.
 */
const getImports = async (req, resp) => {
  const parameters = req.query;
  const label = parameters.label || '';
  const page = Number(parameters.page) || 1;
  const orderField = parameters.orderField || 'label';
  const queryPage = page - 1 > 0 ? page - 1 : 0;
  const limit = Number(parameters.limit) || 25;
  let queryParams = '';
  let queryOrder = '';

  if (
    typeof parameters._id !== 'undefined' &&
    parameters._id !== null &&
    parameters._id !== ''
  ) {
    const newId = parameters._id.trim();
    queryParams = `id(n)=${newId} `;
  } else {
    if (label !== '') {
      const labelValue = helpers.addslashes(parameters.label);
      queryParams += `toLower(n.label) =~ toLower('.*${labelValue}.*') `;
    }
  }

  if (queryParams !== '') {
    queryParams = `WHERE ${queryParams}`;
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

  const currentPage = page === 0 ? 1 : page;
  const skip = limit * queryPage;
  const query = `MATCH (n:Import) ${queryParams} RETURN n ${queryOrder} SKIP ${skip} LIMIT ${limit}`;

  const data = await getQuery(query, queryParams, limit);
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

const getQuery = async (query = '', queryParams = null, limit = 25) => {
  const session = driver.session();
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });

  const nodes = helpers.normalizeRecordsOutput(nodesPromise);

  const queryCount = `MATCH (n:Import) ${queryParams} RETURN count(*)`;

  const count = await session
    .writeTransaction((tx) => tx.run(queryCount))
    .then((result) => {
      session.close();
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['count(*)'];
      return output;
    });

  const totalPages = Math.ceil(count / limit);
  const result = {
    nodes,
    count,
    totalPages,
  };
  return result;
};

/**
* @api {get} /import Get import
* @apiName get import
* @apiGroup imports
*
* @apiParam {string} _id The _id of the requested import.

*/
const getImport = async (req, resp) => {
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
  const importData = new Import({ _id });
  await importData.load();
  resp.json({
    status: true,
    data: importData,
    error: [],
    msg: 'Query results',
  });
};

const saveDatacleaning = async (item = null, userId) => {
  if (item === null) {
    return false;
  }
  const session = driver.session();
  // timestamps
  const now = new Date().toISOString();
  item.updatedBy = userId;
  item.updatedAt = now;
  if (item.rule !== null && typeof item.rule !== 'string') {
    item.rule = JSON.stringify(item.rule);
  }

  const nodeProperties = helpers.prepareNodeProperties(item);
  const params = helpers.prepareParams(item);

  const query = `MATCH (n:DataCleaning) WHERE id(n)=${item._id} SET n=${nodeProperties} RETURN n`;
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
        const resultRecord = helpers.outputRecord(recordObj);
        for (let key in resultRecord) {
          item[key] = resultRecord[key];
        }
        output = { error: [], status: true, data: resultRecord };
      }
      return output;
    })
    .catch((error) => console.log(error));
  return resultPromise;
};

const copyDataCleaning = async (
  existingImportId = null,
  newImportId = null,
  userId
) => {
  if (existingImportId === null && newImportId === null) {
    return false;
  }
  const session = driver.session();
  const queryDataCleaningInstances = `MATCH (n:DataCleaning {importId: ${existingImportId}}) RETURN n`;
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(queryDataCleaningInstances, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  const existingDataCleaningInstancesNodes =
    helpers.normalizeRecordsOutput(nodesPromise);
  for (let i = 0; i < existingDataCleaningInstancesNodes.length; i += 1) {
    const existingDataCleaningInstancesNode =
      existingDataCleaningInstancesNodes[i];
    existingDataCleaningInstancesNode._id = null;
    existingDataCleaningInstancesNode.importId = newImportId;

    // 1. save new node
    const newInstance = saveDatacleaning(
      existingDataCleaningInstancesNode,
      userId
    );
    // copy output
  }
};

const copy = async (copyId = null, newId = null, userId) => {
  if (copyId === null || newId === null) {
    return null;
  }
  // load existing import
  const existingImport = new Import({ _id: copyId });
  await existingImport.load();

  // load new import
  const newImport = new Import({ _id: newId });
  await newImport.load();

  // copy uploaded file
  const existingUploadedFile = existingImport.uploadedFileDetails || null;
  if (existingUploadedFile !== null) {
    const date = new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const existingPath = JSON.parse(existingUploadedFile.paths).path;
    const newDir = uploadFilePath(newImport.label);
    const targetPath = `${newDir}${existingUploadedFile.hashedName}`;

    // extract extension from file path
    const pathParts = existingUploadedFile.hashedName.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const mtype = mimeType.lookup(fileName);
    const extension = mimeType.extension(mtype);

    // create file dir
    if (!fs.existsSync(newDir)) {
      await fs.mkdirSync(newDir, { recursive: true }, (err) => {
        console.log(err);
      });
    }

    // copy file to new dir
    await fs.copyFileSync(existingPath, targetPath);
    const newPath = {
      path: targetPath,
    };
    const newUploadedFileData = {
      filename: existingUploadedFile.filename,
      type: existingUploadedFile.type,
      year,
      month,
      hashedName: existingUploadedFile.hashedName,
      paths: [JSON.stringify(newPath)],
      label: existingUploadedFile.label,
    };
    const newUploadedFile = new UploadedFile(newUploadedFileData);
    const newFile = await newUploadedFile.save(userId);
    // expand file columns
    await parseUploadedFile({
      importData: newImport,
      userId,
      path: targetPath,
      extension,
    });
    const { _id: fileId } = newFile.data;
    newImport.uploadedFile = fileId;
    await newImport.save(userId);

    // copy data cleaning
    copyDataCleaning(existingImport._id, newImport.data._id, userId);
  }

  return existingImport;
};

/**
 * @api {put} /import Put import
 * @apiName put import
 * @apiGroup Imports
 * @apiPermission admin
 *
 * @apiParam {string} [_id] The _id of the import. This should be undefined|null|blank in the creation of a new import.
 * @apiParam {array} [label] The label of the new import.
 */
const putImport = async (req, resp) => {
  const postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The import must not be empty',
    });
    return false;
  }
  const { _id, label, copyId } = postData;
  const userId = req.decoded.id;
  const importData = new Import({ _id, label });
  const output = await importData.save(userId);
  if (
    typeof _id === 'undefined' &&
    typeof copyId !== 'undefined' &&
    copyId !== null
  ) {
    await copy(copyId, output.data._id, userId);
  }
  resp.json(output);
};

/**
 * @api {delete} /import Delete import
 * @apiName delete import
 * @apiGroup Imports
 * @apiPermission admin
 *
 * @apiParam {string} _id The id of the import for deletion.
 **/
const deleteImport = async (req, resp) => {
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
  const importData = new Import({ _id });
  const data = await importData.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: 'Query results',
  });
};

/**
 * @api {delete} /import-file-delete Delete import file
 * @apiName delete import file
 * @apiGroup Imports
 * @apiPermission admin
 *
 * @apiParam {string} _id The id of the import file for deletion.
 **/
const deleteImportFile = async (req, resp) => {
  const parameters = req.body;
  const { _id } = parameters;
  const userId = req.decoded.id;
  if (typeof _id === 'undefined' || _id === '') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
    return false;
  }
  const importData = new Import({ _id });
  await importData.load();
  // delete file
  await deleteUploadedFile(importData.uploadedFile);

  // delete job
  const relatedJob = new Job({ relId: importData.uploadedFile });
  await relatedJob.delete();

  importData.uploadedFile = null;
  importData.uploadedFileDetails = null;
  const responseData = await importData.save(userId);
  resp.json({
    status: true,
    data: responseData.data,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {post} /import-file-upload Upload file to an import
* @apiName upload file to an import
* @apiGroup Imports
* @apiPermission admin
*
* @apiParam {formData} [file] A form data object with the name "file" containing the filename and the file blob.
* @apiExample {formData} Example:
* Content-Disposition: form-data; name="file"; filename="some-file.csv"
Content-Type: image/jpeg
*/
const uploadedFile = async (req, resp) => {
  const data = await parseFormDataPromise(req);
  const userId = req.decoded.id;
  if (Object.keys(data.file).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: ['The uploaded file must not be empty'],
    });
    return false;
  }
  const { _id } = data.fields;
  if (typeof _id === 'undefined' || _id === '') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: ['Please provide a valid import id to continue'],
    });
    return false;
  }
  const importData = new Import({ _id });
  await importData.load();
  if (importData.uploadedFile !== null) {
    await deleteUploadedFile(importData.uploadedFile);
    if (importData.columnsParsed) {
      importData.columnsParsed = false;
      const updatedImport = new Import(importData);
      await updatedImport.save(userId);
    }
  }

  const { file: uploadedFileDetails } = data.file;
  const allowedExtensions = ['csv', 'xls', 'xlsx'];
  const extension = mimeType.extension(uploadedFileDetails.type);

  if (allowedExtensions.indexOf(extension) === -1) {
    const output = {
      status: false,
      data: [],
      error: true,
      msg: [
        `The file extension "${extension}" is not allowed. Please provide a valid file.`,
      ],
    };
    return resp.json(output);
  }
  const hashedName = `${helpers.hashFileName(
    uploadedFileDetails.name
  )}.${extension}`;

  // upload file
  const importDataLabel = importData.label || null;
  await uploadFile(uploadedFileDetails, hashedName, importDataLabel);
  const date = new Date();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const newDir = uploadFilePath(importDataLabel);
  const targetPath = `${newDir}${hashedName}`;

  // store file reference to the db
  const postData = {
    filename: uploadedFileDetails.name,
    year: year,
    month: month,
    hashedName: hashedName,
    type: 'import',
    paths: [JSON.stringify({ path: targetPath })],
  };
  const newFile = new UploadedFile(postData);
  const output = await newFile.save(userId);
  output.rows = await parseUploadedFile({
    importData,
    userId,
    path: targetPath,
    extension,
  });
  console.log(importData);
  const { _id: fileId } = output.data;
  importData.uploadedFile = fileId;
  await importData.save(userId);
  resp.json(output);
};

/**
 * @api {put} /import-plan-relation Put import plan relation
 * @apiName put import plan relation
 * @apiGroup Imports
 * @apiPermission admin
 *
 * @apiParam {String} importId The _id of the import.
 * @apiParam {Number} index The index of the relation in the relations list. -1 for new relations.
 * @apiParam {Object} relation An object that contains the relation data.
 * @apiParamExample {json} Request-Example:
 *  {
 *    importId: "96991",
 *    index: -1,
 *    relation: {
 *      relationLabel: "hasAffiliation",
 *      srcId: "96995",
 *      srcType: "Person",
 *      targetId: "96994",
 *      targetType: "Organisation"
 *    }
 *  }
 */
const putImportPlanRelation = async (req, resp) => {
  const postData = req.body;
  const { importId, index, relation } = postData;
  if (
    typeof importId === 'undefined' ||
    importId === '' ||
    typeof index === 'undefined' ||
    index === '' ||
    typeof relation === 'undefined'
  ) {
    let errorMsg = '';
    if (typeof importId === 'undefined' || importId === '') {
      errorMsg = 'The importId must not be empty';
    }
    if (typeof index === 'undefined' || index === '') {
      errorMsg = 'The index must not be empty';
    }
    if (typeof relation === 'undefined') {
      errorMsg = 'The relation must not be empty';
    }
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: errorMsg,
    });
    return false;
  }
  const userId = req.decoded.id;
  const importData = new Import({ _id: importId });
  await importData.load();
  const relations = importData.relations || [];
  if (index === -1) {
    relations.push(JSON.stringify(relation));
  } else {
    relations[index] = JSON.stringify(relation);
  }
  const output = await importData.save(userId);
  resp.json(output);
};

/**
 * @api {delete} /import-plan-relation Delete import plan relation
 * @apiName delete import plan relation
 * @apiGroup Imports
 * @apiPermission admin
 *
 * @apiParam {String} importId The _id of the import.
 * @apiParam {Number} index The index of the relation in the relations list.
 * @apiParamExample {json} Request-Example:
 *  {
 *    importId: "96991",
 *    index: 0,
 *  }
 */
const deleteImportPlanRelation = async (req, resp) => {
  const postData = req.body;
  const { importId, index } = postData;
  if (
    typeof importId === 'undefined' ||
    importId === '' ||
    typeof index === 'undefined' ||
    index === ''
  ) {
    let errorMsg = '';
    if (typeof importId === 'undefined' || importId === '') {
      errorMsg = 'The importId must not be empty';
    }
    if (typeof index === 'undefined' || index === '') {
      errorMsg = 'The index must not be empty';
    }
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: errorMsg,
    });
    return false;
  }
  const userId = req.decoded.id;
  const importData = new Import({ _id: importId });
  await importData.load();
  const relations = importData.relations || [];
  relations.splice(index, 1);
  importData.relations = relations;
  const output = await importData.save(userId);
  resp.json(output);
};

module.exports = {
  Import: Import,
  getImports,
  getImport,
  putImport,
  deleteImport,
  deleteImportFile,
  uploadedFile,
  putImportPlanRelation,
  deleteImportPlanRelation
};
