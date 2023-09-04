const driver = require('../config/db-driver');
const {
  addslashes,
  compressDirectory,
  expandDirectory,
  hashFileName,
  normalizeLabelId,
  normalizeRecordsOutput,
  outputRecord,
  prepareDate,
  prepareNodeProperties,
  prepareOutput,
  prepareParams,
  readJSONFile,
} = require('../helpers');
const fs = require('fs');
const mimeType = require('mime-types');
const formidable = require('formidable');
const readXlsxFile = require('read-excel-file/node');
const csvParser = require('csv-parser');
const { UploadedFile } = require('./uploadedFile.ctrl');
const { DataCleaning } = require('./dataCleaning.ctrl');
const { ImportRule } = require('./importRules.ctrl');
const { Job } = require('./jobs.ctrl');
const { Event } = require('./event.ctrl');
const { Organisation } = require('./organisation.ctrl');
const { Person } = require('./person.ctrl');
const { Resource } = require('./resource.ctrl');
const { Spatial } = require('./spatial.ctrl');
const { Temporal } = require('./temporal.ctrl');
const { updateReference } = require('./references.ctrl');
const { TaxonomyTerm } = require('./taxonomyTerm.ctrl');

const { ARCHIVEPATH, NODE_ENV } = process.env;

/*
 * A simple function to compare two arrays and see if they have common values
 */
const arrayIntersect = (array1 = [], array2 = []) => {
  const intersect = array1.find((i) => array2.indexOf(i) > -1) || null;
  const result = intersect !== null ? true : false;
  return result;
};

const uploadFilePath = (importDataLabel = null) => {
  const date = new Date();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  let path = `${ARCHIVEPATH}imports/${year}/${month}/`;
  if (importDataLabel !== null && importDataLabel !== '') {
    path += `${normalizeLabelId(importDataLabel)}/`;
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
  const tempDir = `${ARCHIVEPATH}temp/`;
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true }, (err) => {
      console.log(err);
    });
  }
  const tempPath = `${tempDir}${hashedName}`;
  fs.copyFileSync(uploadedFile.path, tempPath);
  uploadedFile.path = tempPath;

  const sourcePath = uploadedFile.path;
  const newDir = uploadFilePath(importDataLabel);
  const targetPath = `${newDir}${hashedName}`;
  uploadedFile.path = targetPath;
  console.log(newDir);
  console.log(targetPath);

  if (!fs.existsSync(newDir)) {
    fs.mkdirSync(newDir, { recursive: true }, (err) => {
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
  const fileExists = fs.existsSync(path);
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
      const updatedImportPlan = new ImportPlan(importData);
      updatedImportPlan.save(userId);
    } else {
      readXlsxFile(path).then((rows, errors) => {
        if (errors) {
          console.log(errors);
          return errors;
        } else {
          const columns = [];
          const headers = rows[0];
          for (const key in headers) {
            const header = headers[key];
            if (header !== null) {
              columns.push(header);
            }
          }
          importData.columns = columns;
          importData.columnsParsed = true;
          const updatedImportPlan = new ImportPlan(importData);
          updatedImportPlan.save(userId);
        }
      });
    }
  }
};

class ImportPlan {
  constructor({
    _id = null,
    label = '',
    uploadedFile = null,
    uploadedFileDetails = null,
    columns = [],
    columnsParsed = false,
    relations = [],
    ingestionStatus = 0, // 0: not started, 1: ongoing, 2: completed, 3: failed
    ingestionProgress = 0,
    ingestionCompleteMessage = '',
    ingestionStartedAt = null,
    ingestionCompletedAt = null,
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
    this.ingestionStatus = ingestionStatus;
    this.ingestionProgress = ingestionProgress;
    this.ingestionCompleteMessage = ingestionCompleteMessage;
    if (ingestionStartedAt !== null) {
      this.ingestionStartedAt = ingestionStartedAt;
    }
    if (ingestionCompletedAt !== null) {
      this.ingestionCompletedAt = ingestionCompletedAt;
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
    const query = `MATCH (n:ImportPlan) WHERE id(n)=${this._id} RETURN n`;
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result;
        let record = null;
        if (records.length > 0) {
          const recordObj = records[0].toObject();
          record = outputRecord(recordObj.n);
        }
        return record;
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

  async loadStatus() {
    if (this._id === null) {
      return false;
    }
    const session = driver.session();
    const query = `MATCH (n:ImportPlan) WHERE id(n)=${this._id} RETURN n.ingestionCompleteMessage, n.ingestionProgress, n.ingestionStatus, n.ingestionStartedAt`;
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result;
        let output = null;
        if (records.length > 0) {
          const recordObj = records[0].toObject();
          output = {
            _id: this._id,
            msg: recordObj['n.ingestionCompleteMessage'],
            progress: recordObj['n.ingestionProgress'],
            started: recordObj['n.ingestionStartedAt'],
            status: recordObj['n.ingestionStatus'],
          };
        }
        return output;
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
        const original = new ImportPlan({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;
      if (typeof this.uploadedFileDetails !== 'undefined') {
        this.uploadedFileDetails = null;
      }

      const nodeProperties = prepareNodeProperties(this);
      const params = prepareParams(this);
      let query = '';
      if (typeof this._id === 'undefined' || this._id === null) {
        query = `CREATE (n:ImportPlan ${nodeProperties}) RETURN n`;
      } else {
        query = `MATCH (n:ImportPlan) WHERE id(n) = ${this._id} SET n=${nodeProperties} RETURN n`;
      }
      const resultPromise = await session
        .run(query, params)
        .then((result) => {
          session.close();
          const records = result.records;
          let output = {
            error: ['The record cannot be updated'],
            status: false,
            data: [],
          };
          if (records.length > 0) {
            const record = records[0];
            const key = record.keys[0];
            let resultRecord = record.toObject()[key];
            resultRecord = outputRecord(resultRecord);
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
      const { uploadedFileDetails = null } = this;

      if (uploadedFileDetails !== null) {
        const filePath =
          typeof uploadedFileDetails.paths[0] === 'string'
            ? JSON.parse(uploadedFileDetails.paths[0]).path
            : uploadedFileDetails.paths[0].path;
        const pathParts = filePath.split('/');
        const index = pathParts.length;
        pathParts.splice(index - 1, 1);
        const dir = pathParts.join('/');
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true });
        }
      }
      await deleteUploadedFile(this.uploadedFile);
    }

    // 2. delete relations
    const query1 = `MATCH (n:ImportPlan)-[r]-() WHERE id(n)=${this._id} DELETE r`;
    await session
      .writeTransaction((tx) => tx.run(query1, {}))
      .then((result) => {
        return result;
      })
      .catch((error) => {
        console.log(error);
      });
    // 3. delete related rules
    const querydr = `MATCH (n:ImportRule {importPlanId: "${this._id}"}) DELETE n`;
    await session
      .writeTransaction((tx) => tx.run(querydr, {}))
      .then((result) => {
        return result;
      })
      .catch((error) => {
        console.log(error);
      });
    // 4. delete node
    const query = `MATCH (n:ImportPlan) WHERE id(n)=${this._id} DELETE n`;
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

const exportImportPlan = async (req, resp) => {
  const { _id } = req.params;
  const importPlanData = new ImportPlan({ _id });
  await importPlanData.load();

  const { label, uploadedFileDetails = null } = importPlanData;
  // create new directory to dump results
  const directory = `${ARCHIVEPATH}imports/exports/${_id}`;
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true }, (err) => {
      console.log(err);
    });
  }

  // import plan rules
  const rules = await loadImportPlanRules(_id);

  // import plan data cleaning
  const session = driver.session();
  const queryDataCleaningInstances = `MATCH (n:DataCleaning {importPlanId: $_id}) RETURN n`;
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(queryDataCleaningInstances, { _id }))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  const dataCleaningNodes = normalizeRecordsOutput(nodesPromise);
  const dataCleaning = dataCleaningNodes.map((n) => {
    n.rule = JSON.parse(n.rule);
    return n;
  });

  // import plan uploaded spreadsheet
  if (uploadedFileDetails !== null) {
    const { paths, hashedName } = uploadedFileDetails;
    const { path = '' } = JSON.parse(paths);
    if (path !== '') {
      const sourcePath = path.replace('/archive/', ARCHIVEPATH);
      fs.copyFileSync(sourcePath, `${directory}/${hashedName}`);
    }
  }

  // put everything into a file
  const file = {
    plan: importPlanData,
    rules,
    dataCleaning,
  };

  // store the file to the filesystem
  const fileLabel = normalizeLabelId(label);
  fs.writeFileSync(
    `${directory}/${fileLabel}.json`,
    JSON.stringify(file),
    { encoding: 'utf8' },
    (error) => {
      if (error) throw error;
      console.log('Data file has been saved successfully!');
    }
  );

  // compress the entire directory
  const compress = await compressDirectory(directory);
  if (compress) {
    const stat = fs.statSync(`${directory}.tar.gz`);
    resp.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Length': stat.size,
    });
    const readStream = fs.createReadStream(`${directory}.tar.gz`);
    readStream.pipe(resp);
    // resp.send(Buffer.from(`${directory}.tar.gz`));
  } else resp.status(500);
};

/**
 * @api {get} /import-plans Get imports
 * @apiName get imports
 * @apiGroup ImportPlans
 *
 * @apiParam {_id} [_id] A unique _id.
 * @apiParam {string} [label] A string to match against the peoples' labels.
 * @apiParam {string} [orderField=label] The field to order the results by.
 */
const getImportPlans = async (req, resp) => {
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
      const labelValue = addslashes(parameters.label);
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
  const query = `MATCH (n:ImportPlan) ${queryParams} RETURN n ${queryOrder} SKIP ${skip} LIMIT ${limit}`;

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

  const nodes = normalizeRecordsOutput(nodesPromise);

  const queryCount = `MATCH (n:ImportPlan) ${queryParams} RETURN count(*)`;

  const count = await session
    .writeTransaction((tx) => tx.run(queryCount))
    .then((result) => {
      session.close();
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      prepareOutput(countObj);
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
* @api {get} /import-plan Get import
* @apiName get import
* @apiGroup imports
*
* @apiParam {string} _id The _id of the requested import.

*/
const getImportPlan = async (req, resp) => {
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
  const importData = new ImportPlan({ _id });
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

  const nodeProperties = prepareNodeProperties(item);
  const params = prepareParams(item);

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
        const resultRecord = outputRecord(recordObj);
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
  existingImportPlanId = null,
  newImportPlanId = null,
  newImportPlanFolderName = null,
  userId
) => {
  if (existingImportPlanId === null && newImportPlanId === null) {
    return false;
  }
  const session = driver.session();
  const queryDataCleaningInstances = `MATCH (n:DataCleaning {importPlanId: ${existingImportPlanId}}) RETURN n`;
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(queryDataCleaningInstances, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  const date = new Date();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const existingDataCleaningInstancesNodes =
    normalizeRecordsOutput(nodesPromise);
  for (let i = 0; i < existingDataCleaningInstancesNodes.length; i += 1) {
    const existingDataCleaningInstancesNode =
      existingDataCleaningInstancesNodes[i];
    existingDataCleaningInstancesNode._id = null;
    existingDataCleaningInstancesNode.importPlanId = newImportPlanId;

    // 1. duplicate output file
    const existingOutput = existingDataCleaningInstancesNode.output;
    const pathParts = existingOutput.split('/');
    const index = pathParts.length;
    const fileName = pathParts[index - 1];
    pathParts.splice(index - 4, 5);
    let newDir = `${pathParts.join(
      '/'
    )}/${year}/${month}/${newImportPlanFolderName}`;
    if (!fs.existsSync(newDir)) {
      await fs.mkdirSync(newDir, { recursive: true }, (err) => {
        console.log(err);
      });
    }
    const targetPath = `${newDir}/${fileName}`;
    // copy file
    await fs.copyFileSync(existingOutput, targetPath);
    existingDataCleaningInstancesNode.output = targetPath;
    // 2. save new node
    await saveDatacleaning(existingDataCleaningInstancesNode, userId);
  }
};

const createNewImportPlanRule = async ({
  label = null,
  rule = null,
  importPlanId = null,
  completed = false,
  userId = null,
}) => {
  const newRule = {};
  const session = driver.session();
  const now = new Date().toISOString();

  newRule.createdBy = userId;
  newRule.createdAt = now;
  newRule.updatedBy = userId;
  newRule.updatedAt = now;
  newRule.label = label;
  newRule.rule = rule;
  newRule.importPlanId = importPlanId;
  newRule.completed = completed;
  const nodeProperties = prepareNodeProperties(newRule);
  const params = prepareParams(newRule);
  const query = `CREATE (n:ImportRule ${nodeProperties}) RETURN n`;
  const output = await session
    .run(query, params)
    .then((result) => {
      session.close();
      const records = result.records;
      if (records.length > 0) {
        const record = records[0];
        const key = record.keys[0];
        const recordObj = record.toObject()[key];
        return outputRecord(recordObj);
      }
      return null;
    })
    .catch((error) => {
      session.close();
      console.log(error);
    });
  return output;
};

const copyImportPlanRulesNRelations = async (
  importPlanId = null,
  newImportPlanId = null,
  relations = [],
  userId
) => {
  if (importPlanId === null || newImportPlanId === null) {
    return false;
  }
  const rules = await loadImportPlanRules(importPlanId);
  if (rules.length > 0) {
    const rulesPair = [];
    const rulesCopy = [...rules];
    for (let i = 0; i < rulesCopy.length; i += 1) {
      const rule = rulesCopy[i];
      rule.importPlanId = newImportPlanId;
      const newRule = await createNewImportPlanRule({
        label: rule.label,
        rule: rule.rule,
        importPlanId: newImportPlanId,
        completed: rule.completed,
        userId,
      });
      rulesPair.push({ old: rule._id, new: newRule._id });
    }
    if (relations.length > 0) {
      const newRelations = [];
      for (let j = 0; j < relations.length; j += 1) {
        const r = JSON.parse(relations[j]);
        const newSrcId = rulesPair.find((p) => p.old === r.srcId).new;
        const newTargetId = rulesPair.find((p) => p.old === r.targetId).new;
        r.srcId = newSrcId;
        r.targetId = newTargetId;
        newRelations.push(JSON.stringify(r));
      }
      const importPlan = new ImportPlan({ _id: newImportPlanId });
      await importPlan.load();
      importPlan.relations = newRelations;
      await importPlan.save(userId);
    }
  }
};

const copyImportPlan = async (copyId = null, newId = null, userId) => {
  if (copyId === null || newId === null) {
    return null;
  }
  // load existing import
  const existingImportPlan = new ImportPlan({ _id: copyId });
  await existingImportPlan.load();
  // load new import
  const newImportPlan = new ImportPlan({ _id: newId });
  await newImportPlan.load();

  // copy uploaded file
  const existingUploadedFile = existingImportPlan.uploadedFileDetails || null;
  if (existingUploadedFile !== null) {
    const date = new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const existingPath = JSON.parse(existingUploadedFile.paths).path;
    let newDir = uploadFilePath(newImportPlan.label);
    if (fs.existsSync(newDir)) {
      newDir = newDir.substr(0, newDir.length - 1);
      newDir += '-copy/';
    }
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
      importData: newImportPlan,
      userId,
      path: targetPath,
      extension,
    });
    // update new import plan data
    const { _id: fileId } = newFile.data;
    newImportPlan.uploadedFile = fileId;
    await newImportPlan.save(userId);

    // copy data cleaning
    await copyDataCleaning(
      existingImportPlan._id,
      newImportPlan._id,
      normalizeLabelId(newImportPlan.label),
      userId
    );
    // copy import plan rules
    await copyImportPlanRulesNRelations(
      existingImportPlan._id,
      newImportPlan._id,
      existingImportPlan.relations,
      userId
    );
  }
  await newImportPlan.load();

  return newImportPlan;
};

/**
 * @api {put} /import-plan Put import
 * @apiName put import
 * @apiGroup ImportPlans
 * @apiPermission admin
 *
 * @apiParam {string} [_id] The _id of the import. This should be undefined|null|blank in the creation of a new import.
 * @apiParam {array} [label] The label of the new import.
 */
const putImportPlan = async (req, resp) => {
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
  const importData = new ImportPlan({ _id, label });
  const output = await importData.save(userId);
  if (
    typeof _id === 'undefined' &&
    typeof copyId !== 'undefined' &&
    copyId !== null
  ) {
    await copyImportPlan(copyId, output.data._id, userId);
  }
  resp.json(output);
};

/**
 * @api {delete} /import-plan Delete import
 * @apiName delete import
 * @apiGroup ImportPlans
 * @apiPermission admin
 *
 * @apiParam {string} _id The id of the import for deletion.
 **/
const deleteImportPlan = async (req, resp) => {
  const { body } = req;
  const { _id = '' } = body;
  if (_id === '') {
    return resp.status(400).json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
  }
  const importData = new ImportPlan({ _id });
  const { data = null, error = [], status = true } = await importData.delete();
  return resp.status(200).json({
    status,
    data,
    error,
    msg: '',
  });
};

/**
 * load source file data
 */
const loadFileData = async (path, extension) => {
  const data = await new Promise((resolve, reject) => {
    const excel = ['xls', 'xlsx'];
    const results = [];
    if (extension === 'csv') {
      fs.createReadStream(path)
        .pipe(csvParser())
        .on('error', (error) => {
          console.log(error);
          reject(error);
        })
        .on('data', (rows) => results.push(rows))
        .on('end', () => {
          resolve(results);
        });
    } else if (excel.indexOf(extension) > -1) {
      readXlsxFile(path).then((rows, errors) => {
        if (errors) {
          return errors;
        } else {
          resolve(rows);
        }
      });
    }
  });
  return data;
};

/**
 * parse rules
 */
const parseColumn = (col, row, temporal = false) => {
  const result = {};
  const { data } = row;
  let value = '';
  const { children = [] } = col;
  if (children.length > 0) {
    const results = {};
    const length = children.length;
    for (let i = 0; i < length; i += 1) {
      const child = children[i];
      const childResult = parseColumn(child, row);
      if (childResult !== null) {
        const key = Object.keys(childResult)[0];
        results[key] = childResult[key];
      }
    }
    if (Object.keys(results).length > 0) {
      result[col.property] = [JSON.stringify(results)];
    }
  } else {
    if (col.custom && col.customValue !== '') {
      value = col.customValue;
    } else if (col.value > -1) {
      value =
        data[col.value] !== null &&
        data[col.value] !== '' &&
        data[col.value] !== ' '
          ? data[col.value]
          : '';
    }
    if (value !== null && value !== '') {
      if (
        typeof col.regexp !== 'undefined' &&
        col.regexp !== '' &&
        col.regexp !== ' '
      ) {
        const match = value.match(col.regexp);
        if (match.length > 0) {
          value = match[0];
        }
      }
      if (
        typeof col.prefixText !== 'undefined' &&
        col.prefixText !== '' &&
        col.prefixText !== ' '
      ) {
        const prefix = col.prefixText.trim();
        value = `${prefix} ${value}`;
      }
      if (temporal) {
        if (typeof value === 'string') {
          value = prepareDate(value);
        } else {
          value = '';
        }
      }
      if (col.property === '_id') {
        if (!isNaN(value)) {
          result[col.property] = value;
        }
      } else {
        result[col.property] = value;
      }
    }
  }
  if (Object.keys(result).length > 0) {
    return result;
  }
  return null;
};

const parseEvents = async (value, rows = []) => {
  const events = [];
  const { length } = rows;
  for (let i = 0; i < length; i += 1) {
    const data = [];
    const row = rows[i];
    const { columns } = value;
    const { length: cLength } = columns;
    for (let v = 0; v < cLength; v += 1) {
      const { property: columnType = '' } = columns[v];
      const newValue = parseColumn(columns[v], row);
      if (newValue !== null) {
        data.push(newValue);
      } else if (columnType === 'condition') {
        data.push({ condition: false });
      }
    }

    const eventData = {};
    const { length: dataLength = 0 } = data;
    let hasConditions = false;
    let conditionsFullfilled = false;
    for (let j = 0; j < dataLength; j += 1) {
      const dataItem = data[j];
      const key = Object.keys(dataItem)[0];
      if (key === 'condition') {
        hasConditions = true;
      }
      if (key === 'condition' && dataItem[key]) {
        conditionsFullfilled = true;
      }
      eventData[key] = dataItem[key];
    }
    if (
      (!hasConditions || (hasConditions && conditionsFullfilled)) &&
      ((typeof eventData._id !== 'undefined' &&
        eventData._id !== null &&
        eventData._id !== '') ||
        (typeof eventData.label !== 'undefined' &&
          eventData.label !== null &&
          eventData.label !== ''))
    ) {
      const event = new Event(eventData);
      if (typeof event._id !== 'undefined' && event._id !== null) {
        await event.loadUnpopulated();
      }
      event.row = row.key;
      event.refId = value.refId;
      events.push(event);
    }
  }
  return events;
};

const parseOrganisations = async (value, rows = []) => {
  const organisations = [];
  const { length } = rows;
  for (let i = 0; i < length; i += 1) {
    const data = [];
    const row = rows[i];
    const { columns } = value;
    const { length: cLength } = columns;
    for (let v = 0; v < cLength; v += 1) {
      const newValue = parseColumn(columns[v], row);
      if (newValue !== null) {
        data.push(newValue);
      } else if (columns[v].type === 'condition') {
        data.push({ condition: false });
      }
    }
    const organisationsData = {};
    const dataLength = data.length;
    let hasConditions = false;
    let conditionsFullfilled = false;
    for (let j = 0; j < dataLength; j += 1) {
      const dataItem = data[j];
      const key = Object.keys(dataItem)[0];
      if (key === 'condition') {
        hasConditions = true;
      }
      if (key === 'condition' && dataItem[key]) {
        conditionsFullfilled = true;
      }
      organisationsData[key] = dataItem[key];
    }
    if (
      (!hasConditions || (hasConditions && conditionsFullfilled)) &&
      ((typeof organisationsData._id !== 'undefined' &&
        organisationsData._id !== null &&
        organisationsData._id !== '') ||
        (typeof organisationsData.label !== 'undefined' &&
          organisationsData.label !== null &&
          organisationsData.label !== ''))
    ) {
      const organisation = new Organisation(organisationsData);
      if (
        typeof organisation._id !== 'undefined' &&
        organisation._id !== null
      ) {
        await organisation.loadUnpopulated();
      }
      organisation.row = row.key;
      organisation.refId = value.refId;
      organisations.push(organisation);
    }
  }
  return organisations;
};

const parsePersons = async (value, rows = []) => {
  const persons = [];
  const { length } = rows;
  for (let i = 0; i < length; i += 1) {
    const data = [];
    const row = rows[i];
    const { columns } = value;
    const { length: cLength } = columns;
    for (let v = 0; v < cLength; v += 1) {
      const newValue = parseColumn(columns[v], row);
      if (newValue !== null) {
        data.push(newValue);
      } else if (columns[v].type === 'condition') {
        data.push({ condition: false });
      }
    }
    const personData = {};
    const { length: dataLength = 0 } = data;
    let hasConditions = false;
    let conditionsFullfilled = false;
    for (let j = 0; j < dataLength; j += 1) {
      const dataItem = data[j];
      const key = Object.keys(dataItem)[0];
      if (key === 'condition') {
        hasConditions = true;
      }
      if (key === 'condition' && dataItem[key]) {
        conditionsFullfilled = true;
      }
      personData[key] = dataItem[key];
    }
    if (
      (!hasConditions || (hasConditions && conditionsFullfilled)) &&
      ((typeof personData._id !== 'undefined' &&
        personData._id !== null &&
        personData._id !== '') ||
        (typeof personData.firstName !== 'undefined' &&
          personData.firstName !== null &&
          personData.firstName !== '') ||
        (typeof personData.lastName !== 'undefined' &&
          personData.lastName !== null &&
          personData.lastName !== '') ||
        (typeof personData.label !== 'undefined' &&
          personData.label !== null &&
          personData.label !== ''))
    ) {
      const person = new Person(personData);
      if (typeof person._id !== 'undefined' && person._id !== null) {
        await person.loadUnpopulated();
      }
      person.row = row.key;
      person.refId = value.refId;
      persons.push(person);
    }
  }
  return persons;
};

const parseResources = async (value, rows = []) => {
  const resources = [];
  const { length } = rows;
  for (let i = 0; i < length; i += 1) {
    const data = [];
    const row = rows[i];
    const { columns } = value;
    const { length: cLength } = columns;
    for (let v = 0; v < cLength; v += 1) {
      const newValue = parseColumn(columns[v], row);
      if (newValue !== null) {
        data.push(newValue);
      } else if (columns[v].type === 'condition') {
        data.push({ condition: false });
      }
    }
    const resourcesData = {};
    const { length: dataLength = 0 } = data;
    let hasConditions = false;
    let conditionsFullfilled = false;
    for (let j = 0; j < dataLength; j += 1) {
      const dataItem = data[j];
      const key = Object.keys(dataItem)[0];
      if (key === 'condition') {
        hasConditions = true;
      }
      if (key === 'condition' && dataItem[key]) {
        conditionsFullfilled = true;
      }
      resourcesData[key] = dataItem[key];
    }
    if (
      (!hasConditions || (hasConditions && conditionsFullfilled)) &&
      ((typeof resourcesData._id !== 'undefined' &&
        resourcesData._id !== null &&
        resourcesData._id !== '') ||
        (typeof resourcesData.label !== 'undefined' &&
          resourcesData.label !== null &&
          resourcesData.label !== ''))
    ) {
      const resource = new Resource(resourcesData);
      if (typeof resource._id !== 'undefined' && resource._id !== null) {
        await resource.loadUnpopulated();
      }
      resource.row = row.key;
      resource.refId = value.refId;
      resources.push(resource);
    }
  }
  return resources;
};

const parseSpatials = async (value, rows = []) => {
  const spatials = [];
  const length = rows.length;
  for (let i = 0; i < length; i += 1) {
    const data = [];
    const row = rows[i];
    const { columns } = value;
    const { length: cLength } = columns;
    for (let v = 0; v < cLength; v += 1) {
      const newValue = parseColumn(columns[v], row);
      if (newValue !== null) {
        data.push(newValue);
      } else if (columns[v].type === 'condition') {
        data.push({ condition: false });
      }
    }
    const spatialsData = {};
    const { length: dataLength = 0 } = data;
    let hasConditions = false;
    let conditionsFullfilled = false;
    for (let j = 0; j < dataLength; j += 1) {
      const dataItem = data[j];
      const key = Object.keys(dataItem)[0];
      if (key === 'condition') {
        hasConditions = true;
      }
      if (key === 'condition' && dataItem[key]) {
        conditionsFullfilled = true;
      }
      spatialsData[key] = dataItem[key];
    }
    if (
      (!hasConditions || (hasConditions && conditionsFullfilled)) &&
      ((typeof spatialsData._id !== 'undefined' &&
        spatialsData._id !== null &&
        spatialsData._id !== '') ||
        (typeof spatialsData.label !== 'undefined' &&
          spatialsData.label !== null &&
          spatialsData.label !== ''))
    ) {
      const spatial = new Spatial(spatialsData);
      if (typeof spatial._id !== 'undefined' && spatial._id !== null) {
        await spatial.loadUnpopulated();
      }
      spatial.row = row.key;
      spatial.refId = value.refId;
      spatials.push(spatial);
    }
  }
  return spatials;
};

const parseTemporals = async (value, rows = []) => {
  const temporals = [];
  const length = rows.length;
  for (let i = 0; i < length; i += 1) {
    const data = [];
    const row = rows[i];
    const { columns } = value;
    const { length: cLength } = columns;
    for (let v = 0; v < cLength; v += 1) {
      const newValue = parseColumn(columns[v], row, true);
      if (newValue !== null) {
        data.push(newValue);
      } else if (columns[v].type === 'condition') {
        data.push({ condition: false });
      }
    }
    const temporalsData = {};
    const { length: dataLength = 0 } = data;
    let hasConditions = false;
    let conditionsFullfilled = false;
    for (let j = 0; j < dataLength; j += 1) {
      const dataItem = data[j];
      const key = Object.keys(dataItem)[0];
      if (key === 'condition') {
        hasConditions = true;
      }
      if (key === 'condition' && dataItem[key]) {
        conditionsFullfilled = true;
      }
      if (typeof dataItem[key] === 'object') {
        Object.keys(dataItem[key]).forEach((val) => {
          temporalsData[val] = dataItem[key][val];
        });
      } else {
        temporalsData[key] = dataItem[key];
      }
    }
    if (
      (!hasConditions || (hasConditions && conditionsFullfilled)) &&
      ((typeof temporalsData._id !== 'undefined' &&
        temporalsData._id !== null &&
        temporalsData._id !== '') ||
        (typeof temporalsData.label !== 'undefined' &&
          temporalsData.label !== null &&
          temporalsData.label !== ''))
    ) {
      const temporal = new Temporal(temporalsData);
      if (typeof temporal._id !== 'undefined' && temporal._id !== null) {
        await temporal.loadUnpopulated();
      }
      temporal.row = row.key;
      temporal.refId = value.refId;
      temporals.push(temporal);
    }
  }
  return temporals;
};

/*
 * The parseRule function
 * output example: similar to parseRules
 */
const parseRule = async (value = null, rows = []) => {
  if (value !== null && typeof value.rule !== 'undefined') {
    const rule = JSON.parse(value.rule);
    rule.refId = value._id;
    let output = null;
    switch (rule.entityType) {
      case 'Event':
        output = { events: await parseEvents(rule, rows) };
        break;
      case 'Organisation':
        output = { organisations: await parseOrganisations(rule, rows) };
        break;
      case 'Person':
        output = { people: await parsePersons(rule, rows) };
        break;
      case 'Resource':
        output = { resources: await parseResources(rule, rows) };
        break;
      case 'Spatial':
        output = { spatials: await parseSpatials(rule, rows) };
        break;
      case 'Temporal':
        output = { temporals: await parseTemporals(rule, rows) };
        break;
    }
    return output;
  }
  return null;
};

/**
 * The parseRules function splits the rules to their entities and parse them separately by invoking the parseRule function
 * output example:
 * {
  events: [
    Event {
      label: 'Address',
      description: null,
      eventType: '72761',
      status: 'private',
      createdBy: null,
      createdAt: null,
      updatedBy: null,
      updatedAt: null,
      row: 0,
      refId: '98181'
    },
  ],
  organisations: [
    Organisation {
      _id: '97201',
      label: 'Ballyara',
      labelSoundex: 'B460',
      description: '',
      organisationType: 'Townland',
      status: 'public',
      alternateAppelations: [],
      createdBy: '532',
      createdAt: '2021-11-16T19:16:23.936Z',
      updatedBy: '532',
      updatedAt: '2021-11-16T19:16:23.936Z',
      row: 1,
      refId: '98182'
    },
  ],
  people: [
    Person {
      honorificPrefix: [],
      firstName: 'Walter',
      middleName: null,
      lastName: 'Nicholsan',
      label: 'Walter Nicholsan',
      fnameSoundex: null,
      lnameSoundex: null,
      description: null,
      personType: 'Clergy',
      status: 'private',
      alternateAppelations: [],
      createdBy: null,
      createdAt: null,
      updatedBy: null,
      updatedAt: null,
      row: 1,
      refId: '98180'
    },
  ],
  resources: [
    Resource {
      _id: '97498',
      label: "St. Kieran's College Kilkenny Student List, c.1782-1945",
      alternateLabels: [],
      description: '',
      fileName: null,
      metadata: {},
      originalLocation: '',
      paths: [],
      resourceType: null,
      systemType: '22853',
      uploadedFile: null,
      status: 'private',
      createdBy: '532',
      createdAt: '2021-11-22T16:49:38.016Z',
      updatedBy: '532',
      updatedAt: '2021-11-22T16:49:38.016Z',
      row: 1,
      refId: '98198'
    },
  ],
  spatials: [
    Spatial {
      _id: '54571',
      label: 'Kilkenny',
      streetAddress: '',
      locality: '',
      region: 'The Municipal District of Kilkenny City',
      postalCode: '',
      country: 'Ireland',
      latitude: '52.6510216',
      longitude: '-7.2484948',
      locationType: 'City',
      note: '',
      rawData: null,
      createdBy: '53930',
      createdAt: '2020-07-12T18:15:04.263Z',
      updatedBy: '532',
      updatedAt: '2021-01-14T21:19:54.596Z',
      row: 2,
      refId: '98196'
    },
  ],
  temporals: [
    Temporal {
      label: '1936',
      startDate: '01-01-1936',
      endDate: '31-12-1936',
      format: null,
      createdBy: null,
      createdAt: null,
      updatedBy: null,
      updatedAt: null,
      row: 16,
      refId: '98190'
    },
  ]
 */
const parseRules = async (rules, rows) => {
  const length = rules.length;
  const output = {
    events: [],
    organisations: [],
    people: [],
    resources: [],
    spatials: [],
    temporals: [],
  };
  for (let i = 0; i < length; i += 1) {
    const entities = await parseRule(rules[i], rows);
    if (entities !== null) {
      const key = Object.keys(entities);
      const entityLength = entities[key].length;
      if (entityLength > 0) {
        for (let j = 0; j < entityLength; j += 1) {
          output[key].push(entities[key][j]);
        }
      }
    }
  }
  return output;
};

const loadImportPlanRules = async (_id) => {
  const session = driver.session();
  const query = `MATCH (n:ImportRule {importPlanId:'${_id}'}) RETURN n ORDER BY n.createdAt`;
  const rules =
    (await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        return normalizeRecordsOutput(result.records);
      })
      .catch((error) => {
        console.log(error);
      })) || [];
  return rules;
};

/**
 * @api {get} /import-plan-preview-results Get import plan results preview
 * @apiName get import plan preview results
 * @apiGroup ImportPlans
 * @apiPermission admin
 *
 * @apiParam {string} _id The id of the import plan.
 * @apiParam {array} [rows] A list of rows from the data file to match against. If left blank it defaults to rows 1-10.
 **/
const getImportPreviewResults = async (req, resp) => {
  const { query: parameters } = req;
  const { _id = null } = parameters;
  let { rows = [] } = parameters;
  if (_id === null || _id === '') {
    return resp.status(400).json({
      status: false,
      data: [],
      error: true,
      msg: 'Please provide a valid id to continue.',
    });
  }
  if (rows.length === 0) {
    rows = [2];
  }
  rows = rows.map((r) => Number(r) - 1);

  // load import data to memory
  const importPlanData = new ImportPlan({ _id });
  await importPlanData.load();

  // load import rules
  importPlanData.rules = await loadImportPlanRules(_id);
  const parsePath =
    typeof importPlanData?.uploadedFileDetails?.paths[0] === 'string'
      ? JSON.parse(importPlanData?.uploadedFileDetails?.paths[0])
      : importPlanData?.uploadedFileDetails?.paths[0];
  const filepath = typeof parsePath !== 'undefined' ? parsePath : null;
  const { path = null } = filepath;
  const outputRows = [];
  if (path !== null) {
    const absPath =
      NODE_ENV === 'production' ? path.replace('archive/', ARCHIVEPATH) : path;
    const fileExists = fs.existsSync(absPath);
    if (fileExists) {
      const mtype = mimeType.lookup(absPath);
      const extension = mimeType.extension(mtype);
      const rowsData = await loadFileData(absPath, extension);
      const rowsLength = rows.length;
      for (let i = 0; i < rowsLength; i += 1) {
        outputRows.push({ key: rows[i] + 1, data: rowsData[rows[i]] });
      }
      importPlanData.rows = outputRows;
    }
  }
  importPlanData.parsedRules = await parseRules(
    importPlanData.rules,
    outputRows
  );
  delete importPlanData.columnsParsed;
  delete importPlanData.rules;
  delete importPlanData.uploadedFile;
  delete importPlanData.uploadedFileDetails;
  return resp.json({
    status: true,
    data: importPlanData,
    error: false,
    msg: 'Import plan preview loaded successfully',
  });
};

/**
 * @api {delete} /import-file-delete Delete import file
 * @apiName delete import file
 * @apiGroup ImportPlans
 * @apiPermission admin
 *
 * @apiParam {string} _id The id of the import file for deletion.
 **/
const deleteImportPlanFile = async (req, resp) => {
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
  const importData = new ImportPlan({ _id });
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
* @apiGroup ImportPlans
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
  const importData = new ImportPlan({ _id });
  await importData.load();
  if (importData.uploadedFile !== null) {
    await deleteUploadedFile(importData.uploadedFile);
    if (importData.columnsParsed) {
      importData.columnsParsed = false;
      const updatedImportPlan = new ImportPlan(importData);
      await updatedImportPlan.save(userId);
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
  const hashedName = `${hashFileName(uploadedFileDetails.name)}.${extension}`;

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
  const { _id: fileId } = output.data;
  importData.uploadedFile = fileId;
  await importData.save(userId);
  resp.json(output);
};

/**
 * @api {put} /import-plan-relation Put import plan relation
 * @apiName put import plan relation
 * @apiGroup ImportPlans
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
  const { importPlanId, index, relation } = postData;
  if (
    typeof importPlanId === 'undefined' ||
    importPlanId === '' ||
    typeof index === 'undefined' ||
    index === '' ||
    typeof relation === 'undefined'
  ) {
    let errorMsg = '';
    if (typeof importPlanId === 'undefined' || importPlanId === '') {
      errorMsg = 'The importPlanId must not be empty';
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
  const importData = new ImportPlan({ _id: importPlanId });
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
 * @apiGroup ImportPlans
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
  const { importPlanId, index } = postData;
  if (
    typeof importPlanId === 'undefined' ||
    importPlanId === '' ||
    typeof index === 'undefined' ||
    index === ''
  ) {
    let errorMsg = '';
    if (typeof importPlanId === 'undefined' || importPlanId === '') {
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
  const importData = new ImportPlan({ _id: importPlanId });
  await importData.load();
  const relations = importData.relations || [];
  relations.splice(index, 1);
  importData.relations = relations;
  const output = await importData.save(userId);
  resp.json(output);
};

const uniqueOrganisations = (organisations) => {
  const items = [];
  const length = organisations.length;
  for (let i = 0; i < length; i += 1) {
    const item = organisations[i];
    const { row, refId } = item;
    if (row === 0) {
      continue;
    }
    const ref = { row, refIds: [refId] };
    if (typeof item.refs === 'undefined') {
      item.refs = [ref];
    }
    const find =
      items.find(
        (o) =>
          o._id === item._id &&
          o.label === item.label &&
          o.organisationType === item.organisationType
      ) || null;
    if (find === null) {
      items.push(item);
    } else {
      const index = items.indexOf(find);
      const existing = items[index];
      const refIndex = existing.refs.findIndex((r) => r.row === row);
      if (refIndex === -1) {
        existing.refs.push(ref);
      } else {
        const refIdIndex =
          existing.refs[refIndex].refIds.find(
            (rid) => rid.indexOf(refId) > -1
          ) || false;
        if (!refIdIndex) {
          existing.refs[refIndex].refIds.push(refId);
        }
      }
    }
  }
  return items;
};

const uniqueResources = (recources) => {
  const items = [];
  const length = recources.length;
  for (let i = 0; i < length; i += 1) {
    const item = recources[i];
    const { row, refId } = item;
    if (row === 0) {
      continue;
    }
    const ref = { row, refIds: [refId] };
    if (typeof item.refs === 'undefined') {
      item.refs = [ref];
    }
    const find =
      items.find(
        (r) =>
          r._id === item._id &&
          r.label === item.label &&
          r.resourceType === item.resourceType
      ) || null;
    if (find === null) {
      items.push(item);
    } else {
      const index = items.indexOf(find);
      const existing = items[index];
      const refIndex = existing.refs.findIndex((r) => r.row === row);
      if (refIndex === -1) {
        existing.refs.push(ref);
      } else {
        const refIdIndex =
          existing.refs[refIndex].refIds.find(
            (rid) => rid.indexOf(refId) > -1
          ) || false;
        if (!refIdIndex) {
          existing.refs[refIndex].refIds.push(refId);
        }
      }
    }
  }
  return items;
};

const uniqueSpatials = (spatials) => {
  const items = [];
  const length = spatials.length;
  for (let i = 0; i < length; i += 1) {
    const item = spatials[i];
    const { row, refId } = item;
    if (row === 0) {
      continue;
    }
    const ref = { row, refIds: [refId] };
    if (typeof item.refs === 'undefined') {
      item.refs = [ref];
    }
    const find = items.find((s) => s.label === item.label) || null;
    if (find === null) {
      items.push(item);
    } else {
      const index = items.indexOf(find);
      const existing = items[index];
      const refIndex = existing.refs.findIndex((r) => r.row === row);
      if (refIndex === -1) {
        existing.refs.push(ref);
      } else {
        const refIdIndex =
          existing.refs[refIndex].refIds.find(
            (rid) => rid.indexOf(refId) > -1
          ) || false;
        if (!refIdIndex) {
          existing.refs[refIndex].refIds.push(refId);
        }
      }
    }
  }
  return items;
};

const uniqueTemporals = (temporals) => {
  const items = [];
  const length = temporals.length;
  for (let i = 0; i < length; i += 1) {
    const item = temporals[i];
    const { row, refId } = item;
    if (row === 0) {
      continue;
    }
    const ref = { row, refIds: [refId] };
    if (typeof item.refs === 'undefined') {
      item.refs = [ref];
    }
    const find = items.find((t) => t.label === item.label) || null;
    if (find === null) {
      items.push(item);
    } else {
      const index = items.indexOf(find);
      const existing = items[index];
      const refIndex = existing.refs.findIndex((r) => r.row === row);
      if (refIndex === -1) {
        existing.refs.push(ref);
      } else {
        const refIdIndex =
          existing.refs[refIndex].refIds.find(
            (rid) => rid.indexOf(refId) > -1
          ) || false;
        if (!refIdIndex) {
          existing.refs[refIndex].refIds.push(refId);
        }
      }
    }
  }
  return items;
};

const uniqueEvents = (events, spatials, temporals, relations) => {
  const items = [];
  const length = events.length;
  // loop through items to determine if they are unique or duplicates
  for (let i = 0; i < length; i += 1) {
    const item = events[i];
    const { row, refId } = item;
    if (row === 0) {
      continue;
    }
    const ref = { row, refIds: [refId] };
    if (typeof item.refs === 'undefined') {
      item.refs = [ref];
    }
    // load item refs in memory and select the refIds for the right row
    const rowRefs = item.refs.find((r) => r.row === row).refIds || [];
    const itemSpatialRefs = relations
      .filter(
        (r) =>
          (rowRefs.indexOf(r.srcId) > -1 && r.targetType === 'Spatial') ||
          (rowRefs.indexOf(r.targetId) > -1 && r.srcType === 'Spatial')
      )
      .map((s) => {
        if (s.srcType === 'Spatial') {
          return s.srcId;
        }
        if (s.targetType === 'Spatial') {
          return s.targetId;
        }
      });
    const itemTemporalRefs = relations
      .filter(
        (r) =>
          (rowRefs.indexOf(r.srcId) > -1 && r.targetType === 'Temporal') ||
          (rowRefs.indexOf(r.targetId) > -1 && r.srcType === 'Temporal')
      )
      .map((t) => {
        if (t.srcType === 'Temporal') {
          return t.srcId;
        }
        if (t.targetType === 'Temporal') {
          return t.targetId;
        }
      });
    // identify spatials from the same row
    const itemRowSpatials = spatials.filter((s) => {
      const findRow = s.refs.find((sr) => sr.row === row) || false;
      return findRow;
    });
    // identify temporals from the same row
    const itemRowTemporals = temporals.filter((t) => {
      const findRow = t.refs.find((tr) => tr.row === row) || false;
      return findRow;
    });

    const itemSpatials =
      itemSpatialRefs.length > 0 && itemRowSpatials.length > 0
        ? itemRowSpatials.filter((s) => {
            const refIds = s.refs.find((r) => r.row === row).refIds || [];
            if (refIds.length === 0) {
              return false;
            } else {
              const hasRef = arrayIntersect(itemSpatialRefs, refIds);
              return hasRef;
            }
          })
        : [];
    const itemTemporals =
      itemTemporalRefs.length > 0 && itemRowTemporals.length > 0
        ? itemRowTemporals.filter((t) => {
            const refIds = t.refs.find((r) => r.row === row).refIds || [];
            if (refIds.length === 0) {
              return false;
            } else {
              const hasRef = arrayIntersect(itemTemporalRefs, refIds);
              return hasRef;
            }
          })
        : [];

    item.itemSpatials = itemSpatials;
    item.itemTemporals = itemTemporals;

    const find =
      items.find((e) => {
        let match = false;
        let matchItem = false;
        let matchSpatial = false;
        let matchTemporal = false;
        if (e.label === item.label && e.eventType === item.eventType) {
          matchItem = true;
        }
        if (
          (itemSpatials.length === 0 && e.itemSpatials.length === 0) ||
          (itemSpatials.length > 0 &&
            e.itemSpatials.length > 0 &&
            e.itemSpatials[0].label === itemSpatials[0].label)
        ) {
          for (let is = 0; is < e.itemSpatials.length; is += 1) {
            const eItemSpatial = e.itemSpatials[is];
            const findSpatial =
              itemSpatials.find((fis) => fis.label === eItemSpatial.label) ||
              false;
            if (findSpatial) {
              matchSpatial = true;
            }
          }
        }
        if (
          (e.itemTemporals.length === 0 && itemTemporals.length === 0) ||
          (e.itemTemporals.length === 1 &&
            itemTemporals.length === 1 &&
            e.itemTemporals[0].label === itemTemporals[0].label)
        ) {
          matchTemporal = true;
        }
        if (matchItem && matchSpatial && matchTemporal) {
          match = true;
        }
        return match;
      }) || null;
    if (find === null) {
      items.push(item);
    } else {
      const index = items.indexOf(find);
      const existing = items[index];
      const refIndex = existing.refs.findIndex((r) => r.row === row);
      if (refIndex === -1) {
        existing.refs.push(ref);
      } else {
        const refIdIndex =
          existing.refs[refIndex].refIds.find(
            (rid) => rid.indexOf(refId) > -1
          ) || false;
        if (!refIdIndex) {
          existing.refs[refIndex].refIds.push(refId);
        }
      }
    }
  }
  return items;
};

const ingestItems = async (items, type, userId) => {
  const output = [];
  const length = items.length;
  for (let i = 0; i < length; i += 1) {
    const item = items[i];
    let newItemSave;
    switch (type) {
      case 'Event':
        newItemSave = new Event(item);
        break;
      case 'Organisation':
        newItemSave = new Organisation(item);
        break;
      case 'Person':
        newItemSave = new Person(item);
        break;
      case 'Resource':
        newItemSave = new Resource(item);
        break;
      case 'Spatial':
        newItemSave = new Spatial(item);
        break;
      case 'Temporal':
        newItemSave = new Temporal(item);
        break;
    }
    const newItemData = await newItemSave.save(userId);
    const newItem =
      typeof newItemData.data !== 'undefined' ? newItemData.data : newItemData;
    newItem.row = item.row;
    newItem.refId = item.refId;
    if (typeof item.refs !== 'undefined') {
      newItem.refs = item.refs;
    } else {
      const ref = { row: item.row, refIds: [item.refId] };
      newItem.refs = [ref];
    }
    newItem.itemType = type;
    output.push(newItem);
  }
  return output;
};

const updateIngestionStatus = async ({
  _id,
  progress = null,
  status = null,
  message = null,
  userId,
}) => {
  const data = { _id };
  const importPlan = new ImportPlan(data);
  await importPlan.load();
  if (progress !== null) {
    importPlan.ingestionProgress = progress * 100;
  }
  if (status !== null) {
    importPlan.ingestionStatus = status;
  }
  if (message !== null) {
    importPlan.ingestionCompleteMessage = message;
    importPlan.ingestionCompletedAt = new Date().toISOString();
  }
  await importPlan.save(userId);
};

const ingestEntities = async (entities, importPlanId, userId) => {
  const eventsLength = entities.events.length;
  const organisationsLength = entities.organisations.length;
  const peopleLength = entities.people.length;
  const resourcesLength = entities.resources.length;
  const spatialsLength = entities.spatials.length;
  const temporalsLength = entities.temporals.length;
  const totalLength =
    (eventsLength +
      organisationsLength +
      peopleLength +
      resourcesLength +
      spatialsLength +
      temporalsLength) *
    2;
  let progress = 0;
  const events = await ingestItems(entities.events, 'Event', userId);

  progress = eventsLength / totalLength;
  await updateIngestionStatus({
    _id: importPlanId,
    progress,
    userId,
  });

  const organisations = await ingestItems(
    entities.organisations,
    'Organisation',
    userId
  );

  progress = (eventsLength + organisationsLength) / totalLength;
  await updateIngestionStatus({
    _id: importPlanId,
    progress,
    userId,
  });

  const people = await ingestItems(entities.people, 'Person', userId);

  progress = (eventsLength + organisationsLength + peopleLength) / totalLength;
  await updateIngestionStatus({
    _id: importPlanId,
    progress,
    userId,
  });

  const resources = await ingestItems(entities.resources, 'Resource', userId);

  progress =
    (eventsLength + organisationsLength + peopleLength + resourcesLength) /
    totalLength;
  await updateIngestionStatus({
    _id: importPlanId,
    progress,
    userId,
  });

  const spatials = await ingestItems(entities.spatials, 'Spatial', userId);

  progress =
    (eventsLength +
      organisationsLength +
      peopleLength +
      resourcesLength +
      spatialsLength) /
    totalLength;
  await updateIngestionStatus({
    _id: importPlanId,
    progress,
    userId,
  });

  const temporals = await ingestItems(entities.temporals, 'Temporal', userId);

  progress =
    (eventsLength +
      organisationsLength +
      peopleLength +
      resourcesLength +
      spatialsLength +
      temporalsLength) /
    totalLength;

  console.log(`entities ingestion complete`);
  await updateIngestionStatus({
    _id: importPlanId,
    progress,
    userId,
  });

  return {
    events,
    organisations,
    people,
    resources,
    spatials,
    temporals,
  };
};

const addStoredEntitiesRelations = async (
  entities,
  relations,
  importPlanId,
  userId
) => {
  const importPlan = new ImportPlan({ _id: importPlanId });
  await importPlan.load();

  // first we flatten all entities into one array
  const flatEntities = [
    ...entities.events,
    ...entities.organisations,
    ...entities.people,
    ...entities.resources,
    ...entities.spatials,
    ...entities.temporals,
  ];
  const length = flatEntities.length;
  let ingestionProgress = length;
  const totalProgress = length * 2;
  const customSource = flatEntities.find((e) => e.refId === 'custom');

  // loop through the new entities array
  for (let i = 0; i < length; i += 1) {
    const entity = flatEntities[i];
    const { row, itemType } = entity;

    // load entity refs in memory and select the refIds for the right row
    const rowRefs = entity.refs.find((r) => r.row === row).refIds || [];
    const entityRels = relations.filter(
      (r) => rowRefs.indexOf(r.srcId) > -1 || rowRefs.indexOf(r.targetId) > -1
    );
    const entityRefs = entityRels.map((s) => {
      if (s.srcType === itemType) {
        return s.targetId;
      }
      if (s.targetType === itemType) {
        return s.srcId;
      }
    });

    const entityRowItems = flatEntities.filter((s) => {
      const findRow = s.refs.find((sr) => sr.row === row) || false;
      return findRow;
    });
    const entityItems =
      entityRefs.length > 0 && entityRowItems.length > 0
        ? entityRowItems.filter((s) => {
            const refIds = s.refs.find((r) => r.row === row).refIds || [];
            if (refIds.length === 0) {
              return false;
            } else {
              const hasRef = arrayIntersect(entityRefs, refIds);
              return hasRef;
            }
          })
        : [];
    // loop through the associated relations array
    const rLength = entityRels.length;
    for (let j = 0; j < rLength; j += 1) {
      const rel = entityRels[j];
      const {
        srcId,
        srcType,
        targetId,
        targetType,
        relationLabel,
        role = null,
      } = rel;
      // avoid circular relations
      if (srcId === targetId) {
        continue;
      }
      // check if entity is the source entity of the relation
      if (srcType === itemType) {
        const src = entity;

        // select target items from entities of the same row
        const targets = entityItems.filter((ei) => {
          const findRow =
            ei.refs.find(
              (rreref) => rreref.refIds.indexOf(targetId.toString()) > -1
            ) || false;
          return findRow;
        });
        // loop through target entities and add relation
        const tLength = targets.length;
        for (let k = 0; k < tLength; k += 1) {
          const target = targets[k];
          if (
            typeof src._id !== 'undefined' &&
            typeof target._id !== 'undefined' &&
            src._id !== target._id
          ) {
            const ref = {
              items: [
                {
                  _id: src._id,
                  type: srcType,
                },
                {
                  _id: target._id,
                  type: targetType,
                },
              ],
              taxonomyTermLabel: relationLabel,
            };
            if (
              role !== null &&
              typeof role.value !== 'undefined' &&
              role.value !== ''
            ) {
              ref.items[0].role = role.value;
            }
            await updateReference(ref);
          }
        }
      } else if (targetType === itemType) {
        const target = entity;
        // select source items from entities of the same row
        const sources = entityItems.filter((ei) => {
          const findRow =
            ei.refs.find(
              (rreref) => rreref.refIds.indexOf(srcId.toString()) > -1
            ) || false;
          return findRow;
        });

        const sLength = sources.length;
        // loop through source entities and add relation
        for (let k = 0; k < sLength; k += 1) {
          const src = sources[k];
          if (
            typeof src._id !== 'undefined' &&
            typeof target._id !== 'undefined' &&
            src._id !== target._id
          ) {
            const ref = {
              items: [
                {
                  _id: src._id,
                  type: srcType,
                },
                {
                  _id: target._id,
                  type: targetType,
                },
              ],
              taxonomyTermLabel: relationLabel,
            };
            if (
              role !== null &&
              typeof role.value !== 'undefined' &&
              role.value !== ''
            ) {
              ref.items[1].role = role.value;
            }
            await updateReference(ref);
          }
        }
      }
    }
    if (
      typeof customSource._id !== 'undefined' &&
      typeof entity._id !== 'undefined'
    ) {
      const ref = {
        items: [
          {
            _id: customSource._id,
            type: 'Resource',
          },
          {
            _id: entity._id,
            type: itemType,
          },
        ],
        taxonomyTermLabel: 'isRelatedTo',
      };
      await updateReference(ref);
    }

    if (i % 100 === 0) {
      ingestionProgress += 100;
      const progressPerc = ingestionProgress / totalProgress;
      // console.log(`${ingestionProgress} / ${totalProgress} = ${progressPerc}`);
      await updateIngestionStatus({
        _id: importPlanId,
        progress: progressPerc,
        userId,
      });
    }
  }
  // set ingestion progress 100% complete
  await updateIngestionStatus({
    _id: importPlanId,
    progress: 1,
    status: 2,
    message: 'The ingestion completed successfully',
    userId,
  });
  console.log('completed');
};

/*
 * The ingestImportPlanData function handles all the ingestion of an import plan
 */
const ingestImportPlanData = async (importPlanId, userId) => {
  // load import data to memory
  const importPlanData = new ImportPlan({ _id: importPlanId });
  await importPlanData.load();
  // set import plan ingestion status to started
  importPlanData.ingestionStatus = 1;
  importPlanData.ingestionStartedAt = new Date().toISOString();
  const copy = importPlanData;
  await copy.save(userId);
  await importPlanData.load();

  // load import plan rules and add them to the object
  importPlanData.rules = await loadImportPlanRules(importPlanId);
  const filepath = JSON.parse(importPlanData?.uploadedFileDetails?.paths[0]);
  const { path = null } = filepath;
  let parsedRules = {};
  let rowsNum = 0;
  // check to see if there is an excel/csv file attached to the import plan
  if (path !== null) {
    const fileExists = await fs.existsSync(path);
    if (fileExists) {
      const mtype = mimeType.lookup(path);
      const extension = mimeType.extension(mtype);
      const rowsData = await loadFileData(path, extension);
      const outputRows = [];
      const { length: rowsLength } = rowsData;
      for (let i = 0; i < rowsLength; i += 1) {
        const r = rowsData[i];
        if (i > 0) {
          outputRows.push({ key: i, data: r });
        }
      }
      rowsNum = outputRows.length;
      // prepare the rules
      parsedRules = await parseRules(importPlanData.rules, outputRows);
    }
  }
  // create a relation reference to this ingestion for each entity
  const importResourceRows = [];
  for (let i = 0; i < rowsNum; i += 1) {
    importResourceRows.push(i);
  }
  const documentSystemTypeRef = new TaxonomyTerm({ labelId: 'Document' });
  await documentSystemTypeRef.load();
  const importResource = {
    _id: null,
    label: `${importPlanData.label} import`,
    alternateLabels: [],
    description: null,
    fileName: null,
    metadata: {},
    originalLocation: '',
    paths: [],
    resourceType: 'Document',
    systemType: documentSystemTypeRef._id,
    uploadedFile: null,
    status: 'private',
    row: 1,
    refId: 'custom',
    rows: importResourceRows,
  };

  // create entities list with deduplicated values for events, organisations, resources, temporals, spatials
  const relations = importPlanData.relations.map((r) => JSON.parse(r));
  const entities = {};
  const organisations = uniqueOrganisations(parsedRules.organisations);
  const resources = uniqueResources(parsedRules.resources);
  resources.push(importResource);
  const spatials = uniqueSpatials(parsedRules.spatials);
  const temporals = uniqueTemporals(parsedRules.temporals);
  const eventsRelations =
    relations.filter(
      (r) => r.srcType === 'Event' || r.targetType === 'Event'
    ) || [];
  const events = uniqueEvents(
    parsedRules.events,
    spatials,
    temporals,
    eventsRelations
  );

  entities.events = events;
  entities.organisations = organisations;
  entities.people = parsedRules.people;
  entities.resources = resources;
  entities.spatials = spatials;
  entities.temporals = temporals;
  importPlanData.entities = entities;
  console.log('entities de-duplicated and prepared for ingestion');

  parsedRules = null;
  importPlanData.columns = null;
  importPlanData.relations = null;
  importPlanData.columnsParsed = null;
  importPlanData.rules = null;
  importPlanData.uploadedFile = null;
  importPlanData.uploadedFileDetails = null;
  delete importPlanData.columns;
  delete importPlanData.relations;
  delete importPlanData.columnsParsed;
  delete importPlanData.rules;
  delete importPlanData.uploadedFile;
  delete importPlanData.uploadedFileDetails;

  // store entities to database
  const storedEntities = await ingestEntities(
    entities,
    importPlanData._id,
    userId
  );

  // add entities relations
  await addStoredEntitiesRelations(
    storedEntities,
    relations,
    importPlanData._id,
    userId
  );
  return true;
};

/**
 * @api {put} /import-plan-ingest Start ingestion according to import plan
 * @apiName put import plan ingest
 * @apiGroup ImportPlans
 * @apiPermission admin
 *
 * @apiParam {string} _id The id of the import plan.
 **/
const putImportPlanIngest = async (req, resp) => {
  const parameters = req.body;
  const { _id = null } = parameters;
  if (_id === null || _id === '') {
    return resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please provide a valid id to continue.',
    });
  }
  const userId = req.decoded.id;
  const importPlanData = new ImportPlan({ _id: _id });
  await importPlanData.load();
  let status = true;
  // check if ingestion has already started and prevent execution
  if (
    typeof importPlanData.ingestionStatus !== 'undefined' &&
    Number(importPlanData.ingestionStatus) > 0
  ) {
    status = false;
  }
  if (status) {
    // execute ingestion
    ingestImportPlanData(_id, userId);
    return resp.json({
      status: status,
      data: [],
      error: false,
      msg: 'Ingestion started successfully',
    });
  } else {
    let msg = '';
    if (importPlanData.ingestionStatus === 1) {
      msg = 'The ingestion process has already started.';
    }
    if (importPlanData.ingestionStatus === 2) {
      msg =
        'The Ingestion process has already completed and cannot be executed again.';
    }
    if (importPlanData.ingestionStatus === 3) {
      msg =
        'The Ingestion process has already completed with an error and cannot be executed again.';
    }
    return resp.json({
      status: status,
      data: [],
      error: true,
      msg,
    });
  }
};

/**
 * @api {get} /import-plan-status Get import plan ingestion status
 * @apiName get import plan ingestion status
 * @apiGroup ImportPlans
 * @apiPermission admin
 *
 * @apiParam {string} _id The id of the import plan.
 **/
const getImportPlanStatus = async (req, resp) => {
  const parameters = req.query;
  const { _id = null } = parameters;
  if (_id === null || _id === '') {
    return resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please provide a valid id to continue.',
    });
  }
  const data = new ImportPlan({ _id });
  await data.loadStatus();
  delete data.columns;
  delete data.columnsParsed;
  delete data.createdAt;
  delete data.createdBy;
  delete data.ingestionCompleteMessage;
  delete data.ingestionProgress;
  delete data.ingestionStatus;
  delete data.relations;
  delete data.updatedAt;
  delete data.updatedBy;
  return resp.json({
    status: true,
    data,
    error: false,
    msg: 'Ingestion started successfully',
  });
};

const importPlanFileDownload = async (req, resp) => {
  const { params } = req;
  const { _id = null } = params;
  if (_id === null) {
    return resp.status(500).json({
      data: [],
      errors: [],
      msg: 'Please provide a valid import plan id to continue',
    });
  }
  const plan = new ImportPlan({ _id });
  await plan.load();
  const file = new UploadedFile({ _id: plan.uploadedFile });
  await file.load();
  const { filename } = file;
  const mtype = mimeType.lookup(filename);
  const { paths } = file;
  const { path } =
    typeof paths[0] === 'string' ? JSON.parse(paths[0]) : paths[0];
  if (path !== '') {
    const targetPath = path.replace('/archive/', ARCHIVEPATH);
    const data = fs.readFileSync(targetPath);
    resp.setHeader('Content-disposition', `attachment; filename=${filename}`);
    resp.setHeader('Content-type', mtype);
    resp.send(Buffer.from(data));
  }
};

const importPlanBackupDownload = async (req, resp) => {
  const { params } = req;
  const { _id = null } = params;
  if (_id === null) {
    return resp.status(500).json({
      data: [],
      errors: [],
      msg: 'Please provide a valid import plan id to continue',
    });
  }
  const plan = new ImportPlan({ _id });
  await plan.load();
  const file = new UploadedFile({ _id: plan.uploadedFile });
  await file.load();
  const { filename } = file;
  const mtype = mimeType.lookup(filename);
  const { paths } = file;
  const { path } = JSON.parse(paths[0]) || '';
  if (path !== '') {
    const data = fs.readFileSync(path);
    resp.setHeader('Content-disposition', `attachment; filename=${filename}`);
    resp.setHeader('Content-type', mtype);
    resp.send(Buffer.from(data));
  }
};

const parseFormDataPromise = (req) => {
  return new Promise((resolve) => {
    new formidable.IncomingForm().parse(req, (err, fields, files) => {
      if (err) {
        console.error('Error', err);
        throw err;
      }
      let output = {};
      output.fields = fields;
      output.file = files;
      resolve(output);
    });
  });
};

/* const saveImportPlanFromFileUploadedFile = async () => {

}; */

const addImportPlanFromFile = async (directory = '', label, userId) => {
  try {
    if (directory === '') {
      throw new Error('The directory path cannot be empty');
    }
    const files = fs.readdirSync(directory);
    let jsonFile = null;
    const jsonMimeTypes = ['application/json'];
    const spreadsheetMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    let spreadsheet = null;
    for (const file of files) {
      const mtype = mimeType.lookup(file);
      if (jsonMimeTypes.indexOf(mtype) > -1) {
        jsonFile = file;
      } else if (spreadsheetMimeTypes.indexOf(mtype) > -1) {
        spreadsheet = file;
      }
    }

    if (jsonFile === null) {
      throw new Error(
        `The provided directory doesn't contain a configuration json file`
      );
    }
    const jsonData = await readJSONFile(`${directory}/${jsonFile}`);
    const { data } = jsonData;
    const { plan, rules, dataCleaning } = data;
    const planCopy = { ...plan };
    const { relations } = plan;
    const existingRelations = relations.map((r) => JSON.parse(r));
    const { length: existingRelationsLength } = existingRelations;
    // save uploaded file
    let uploadedFile = null;
    if (spreadsheet !== null) {
      const { uploadedFileDetails: originalUploadedFile } = planCopy;
      const copyUploadedFile = { ...originalUploadedFile };
      const date = new Date();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const spreadsheetAbsPath = `${directory}${spreadsheet}`;
      const spreadsheetPath = spreadsheetAbsPath.replace(
        ARCHIVEPATH,
        '/archive/'
      );

      copyUploadedFile.year = year;
      copyUploadedFile.month = month;
      copyUploadedFile.paths = [JSON.stringify({ path: spreadsheetPath })];
      delete copyUploadedFile._id;
      delete copyUploadedFile.createdBy;
      delete copyUploadedFile.createdAt;
      delete copyUploadedFile.updatedBy;
      delete copyUploadedFile.updatedAt;
      const newUploadedFile = new UploadedFile(copyUploadedFile);
      const newFile = await newUploadedFile.save(userId);
      ({ _id: uploadedFile } = newFile.data);
    }

    // prepare and save plan
    planCopy.label = label;
    planCopy.uploadedFile = uploadedFile;
    planCopy.ingestionStatus = 0;
    planCopy.ingestionProgress = 0;
    planCopy.ingestionCompleteMessage = '';
    delete planCopy._id;
    delete planCopy.createdBy;
    delete planCopy.createdAt;
    delete planCopy.updatedBy;
    delete planCopy.updatedAt;
    delete planCopy.uploadedFileDetails;

    const importPlan = new ImportPlan(planCopy);
    const importPlanSaved = await importPlan.save(userId);
    const { status: importPlanSaveStatus, data: importPlanSaveData } =
      importPlanSaved;
    // the new plan was created successfully add the rules and data cleaning instances
    if (importPlanSaveStatus) {
      const { _id: planId } = importPlanSaveData;
      // save rules
      const { length: rulesLength } = rules;
      for (let i = 0; i < rulesLength; i += 1) {
        const rule = rules[i];
        rule.importPlanId = planId;
        const { _id: oldRuleId } = rule;
        rule.rule = JSON.parse(rule.rule);

        delete rule.createdAt;
        delete rule.createdBy;
        delete rule.updatedAt;
        delete rule.updatedBy;
        delete rule._id;

        const newRule = new ImportRule(rule);
        const savedRule = await newRule.save(userId);

        // fix relations
        const { _id: newRuleId } = savedRule.data;
        // replace oldIds with newIds
        for (let j = 0; j < existingRelationsLength; j += 1) {
          const existingRelation = existingRelations[j];
          const { srcId, targetId } = existingRelation;
          if (srcId === oldRuleId) {
            existingRelation.srcId = newRuleId;
          }
          if (targetId === oldRuleId) {
            existingRelation.targetId = newRuleId;
          }
        }
      }
      const updatedRelations = existingRelations.map((e) => JSON.stringify(e));
      importPlanSaveData.relations = updatedRelations;
      const updatedImportPlan = new ImportPlan(importPlanSaveData);
      await updatedImportPlan.save(userId);

      // save data cleaning
      const { length: dataCleaningLength } = dataCleaning;
      for (let i = 0; i < dataCleaningLength; i += 1) {
        const dataCleaningItem = dataCleaning[i];

        dataCleaningItem.completed = false;
        dataCleaningItem.importPlanId = planId;

        delete dataCleaningItem.createdAt;
        delete dataCleaningItem.createdBy;
        delete dataCleaningItem.updatedAt;
        delete dataCleaningItem.updatedBy;
        delete dataCleaningItem._id;
        delete dataCleaningItem.output;

        const newDataCleaningItem = new DataCleaning(dataCleaningItem);
        await newDataCleaningItem.save(userId);
      }
    }
    return importPlanSaveData;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const uploadFileAndExpand = async (uploadedFile = null, label = '', userId) => {
  if (uploadedFile === null) {
    return;
  }
  const { name, path } = uploadedFile;
  const tempDir = `${ARCHIVEPATH}temp`;
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true }, (err) => {
      console.log(err);
    });
  }
  const tempPath = `${tempDir}/${name}`;
  fs.copyFileSync(path, tempPath);

  const dirName = hashFileName(label);
  const newDir = uploadFilePath(dirName);
  const targetPath = `${newDir}${name}`;
  uploadedFile.path = targetPath;
  if (!fs.existsSync(newDir)) {
    fs.mkdirSync(newDir, { recursive: true }, (err) => {
      console.log(err);
    });
  }
  // move the file to its target directory
  await new Promise((resolve) => {
    fs.rename(tempPath, targetPath, function (error) {
      const output = {};
      if (error) {
        output.status = false;
        output.msg = error;
      } else {
        output.status = true;
        output.msg = `File "${name}" uploaded successfully`;
        output.path = targetPath;
      }
      resolve(output);
    });
  });

  // unzip file
  await expandDirectory(targetPath);

  // delete zipped file
  fs.unlinkSync(targetPath);

  // create import plan from JSON Data
  const newImportPlan = await addImportPlanFromFile(newDir, label, userId);
  return newImportPlan;
};

const importPlanFileUpload = async (req, resp) => {
  const data = await parseFormDataPromise(req);
  const { fields, file } = data;
  const { label } = fields;
  const { id: userId } = req.decoded;
  const { file: uploadedFile } = file;
  if (Object.keys(uploadedFile).length === 0) {
    resp.status(400).json({
      errors: ['The uploaded file must not be empty.'],
    });
  } else {
    const allowedFileTypes = ['application/x-gzip', 'application/gzip'];
    const { type } = uploadedFile;
    if (allowedFileTypes.indexOf(type) === -1) {
      return resp.status(400).json({
        errors: [`The uploaded file type "${type}" is not allowed.`],
      });
    } else {
      const result = await uploadFileAndExpand(uploadedFile, label, userId);
      return resp.status(200).json({
        status: true,
        data: result,
        errors: [],
        msg: '',
      });
    }
  }
  resp.status(500).json({
    errors: [`Internal server error`],
  });
};

module.exports = {
  ImportPlan: ImportPlan,
  exportImportPlan,
  getImportPlans,
  getImportPlan,
  putImportPlan,
  deleteImportPlan,
  getImportPreviewResults,
  deleteImportPlanFile,
  uploadedFile,
  putImportPlanRelation,
  deleteImportPlanRelation,
  putImportPlanIngest,
  getImportPlanStatus,
  importPlanFileDownload,
  importPlanFileUpload,
  importPlanBackupDownload,
};
