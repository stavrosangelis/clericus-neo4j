const driver = require('../config/db-driver');
const helpers = require('../helpers');
const fs = require('fs');
const mimeType = require('mime-types');
const formidable = require('formidable');
const readXlsxFile = require('read-excel-file/node');
const { UploadedFile } = require('./uploadedFile.ctrl');

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

const uploadFile = async (uploadedFile = null, hashedName = '') => {
  if (uploadedFile === null || hashedName === '') {
    return false;
  }
  // patch for the case when the archive path is in a different drive
  const tempPath = `${ARCHIVEPATH}temp/${hashedName}`;
  await fs.copyFileSync(uploadedFile.path, tempPath);
  uploadedFile.path = tempPath;

  const date = new Date();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const sourcePath = uploadedFile.path;
  const newDir = `${ARCHIVEPATH}/imports/${year}/${month}/`;
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

const parseUploadedFile = async (path = null) => {
  if (path === null) {
    return false;
  }
  const parsedFile = readXlsxFile(path).then((rows, errors) => {
    if (errors) {
      return errors;
    } else {
      return rows;
    }
  });
  return parsedFile;
};

class Import {
  constructor({
    _id = null,
    label = '',
    uploadedFile = null,
    uploadedFileDetails = null,
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
    const query = `MATCH (n:Import) WHERE id(n) = ${this._id} RETURN n`;
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
    // 1. delete related files
    await this.load();
    if (this.uploadedFile !== null) {
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
  const queryPage = queryPage > 0 ? page - 1 : 0;
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
  const { _id, label } = postData;
  const userId = req.decoded.id;
  const importData = new Import({ _id, label });
  const output = await importData.save(userId);
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
  await deleteUploadedFile(importData.uploadedFile);

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
  }

  const { file: uploadedFile } = data.file;
  const allowedExtensions = ['csv', 'xls', 'xlsx'];
  const extension = mimeType.extension(uploadedFile.type);

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
  const hashedName = `${helpers.hashFileName(uploadedFile.name)}.${extension}`;

  // upload file
  await uploadFile(uploadedFile, hashedName);
  const date = new Date();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  // store file reference to the db
  const userId = req.decoded.id;
  const postData = {
    filename: uploadedFile.name,
    year: year,
    month: month,
    hashedName: hashedName,
    type: 'import',
  };
  const newFile = new UploadedFile(postData);
  const output = await newFile.save(userId);
  output.rows = await parseUploadedFile(output.paths[0].path);
  const { _id: fileId } = output.data;
  importData.uploadedFile = fileId;
  await importData.save(userId);
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
};
