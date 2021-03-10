const driver = require('../config/db-driver');
const helpers = require('../helpers');
const Canvas = require('canvas');
const fs = require('fs');
const mimeType = require('mime-types');
const formidable = require('formidable');

class UploadedFile {
  constructor({
    _id = null,
    filename = null,
    year = 0,
    month = 0,
    hashedName,
    paths = [],
    createdBy = null,
    createdAt = null,
    updatedBy = null,
    updatedAt = null,
  }) {
    this._id = null;
    if (_id !== null) {
      this._id = _id;
    }
    this.filename = filename;
    this.year = year;
    this.month = month;
    this.hashedName = hashedName;
    this.paths = paths;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedBy = updatedBy;
    this.updatedAt = updatedAt;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.filename === '') {
      status = false;
      errors.push({ field: 'filename', msg: 'The filename must not be empty' });
    }
    let msg = 'The record is valid';
    if (!status) {
      msg = 'The record is not valid';
    }
    let output = {
      status: status,
      msg: msg,
      errors: errors,
    };
    return output;
  }

  async load() {
    if (this._id === null) {
      return false;
    }
    let query = 'MATCH (n:UploadedFile) WHERE id(n)=' + this._id + ' return n';
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
    // assign results to class values
    for (let key in node) {
      this[key] = node[key];
    }
    let paths = [
      {
        path: `${process.env.SERVERURL}uploads/${this.year}/${this.month}/images/${this.hashedName}`,
        pathType: 'source',
      },
      {
        path: `${process.env.SERVERURL}uploads/${this.year}/${this.month}/thumbnails/${this.hashedName}`,
        pathType: 'thumbnail',
      },
    ];
    this.paths = paths;
  }

  async save(userId) {
    let validateFile = this.validate();
    if (!validateFile.status) {
      return validateFile;
    } else {
      let session = driver.session();

      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
      } else {
        let original = new UploadedFile({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      let nodeProperties = helpers.prepareNodeProperties(this);
      let params = helpers.prepareParams(this);
      let query = '';
      if (typeof this._id === 'undefined' || this._id === null) {
        query = 'CREATE (n:UploadedFile ' + nodeProperties + ') RETURN n';
      } else {
        query =
          'MATCH (n:UploadedFile) WHERE id(n)=' +
          this._id +
          ' SET n=' +
          nodeProperties +
          ' RETURN n';
      }
      let resultPromise = await session.run(query, params).then((result) => {
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

          let paths = [
            {
              path: `${process.env.SERVERURL}uploads/${resultRecord.year}/${resultRecord.month}/images/${resultRecord.hashedName}`,
              pathType: 'source',
            },
            {
              path: `${process.env.SERVERURL}uploads/${resultRecord.year}/${resultRecord.month}/thumbnails/${resultRecord.hashedName}`,
              pathType: 'thumbnail',
            },
          ];
          resultRecord.paths = paths;
          output = { error: [], status: true, data: resultRecord };
        }
        return output;
      });
      return resultPromise;
    }
  }

  async countRelations() {
    if (this._id === null) {
      return false;
    }
    let session = driver.session();
    let query =
      'MATCH (n)-[r]->() WHERE id(n)=' + this._id + ' RETURN count(*) AS c';
    let count = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        let records = result.records;
        if (records.length > 0) {
          let record = records[0];
          let key = record.keys[0];
          let output = record.toObject();
          helpers.prepareOutput(output);
          output = output[key];
          return output;
        }
      });
    this.count = count;
  }

  async delete() {
    let session = driver.session();
    await this.countRelations();
    if (parseInt(this.count, 10) > 0) {
      let output = {
        error: ["You must remove the record's relations before deleting"],
        status: false,
        data: [],
      };
      return output;
    }
    // 1. load file to get details
    let file = new UploadedFile({ _id: this._id });
    await file.load();

    // 2. delete files from disk
    let fullsize = `${process.env.UPLOADSPATH}uploads/${file.year}/${file.month}/images/${file.hashedName}`;
    let thumbnail = `${process.env.UPLOADSPATH}uploads/${file.year}/${file.month}/thumbnails/${file.hashedName}`;
    this.unlinkFile(fullsize);
    this.unlinkFile(thumbnail);

    let query = `MATCH (n:UploadedFile) WHERE id(n)=${this._id} DELETE n`;
    let deleteRecord = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        return result;
      });
    return deleteRecord;
  }

  unlinkFile(path) {
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
  }
}
/**
* @api {get} /uploaded-files Get uploaded files
* @apiName get uploaded files
* @apiGroup Uploaded Files
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"data":[{"createdAt":"2020-01-27T15:55:23.499Z","templatePosition":"","label":"Top Article","_id":"2822","updatedAt":"2020-01-27T17:55:15.742Z","systemLabels":["Article"]},{"createdAt":"2020-01-27T17:43:44.578Z","label":"Bottom Article","templatePosition":"bottom","updatedAt":"2020-01-27T17:43:44.578Z","_id":"2683","systemLabels":["Article"]}]},"error":[],"msg":"Query results"}
*/
const getUploadedFiles = async (req, resp) => {
  let parameters = req.query;
  let filename = '';
  let page = 0;
  let orderField = 'filename';
  let queryPage = 0;
  let queryOrder = '';
  let limit = 25;

  let query = '';
  let queryParams = '';
  if (typeof parameters.filename !== 'undefined') {
    filename = parameters.filename;
    if (filename !== '') {
      queryParams += "toLower(n.filename) =~ toLower('.*" + filename + ".*') ";
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
    'MATCH (n:UploadedFile) ' +
    queryParams +
    ' RETURN n ' +
    queryOrder +
    ' SKIP ' +
    skip +
    ' LIMIT ' +
    limit;
  let data = await getUploadedFilesQuery(query, queryParams, limit);
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

const getUploadedFilesQuery = async (query, queryParams, limit) => {
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
      tx.run('MATCH (n:UploadedFile) ' + queryParams + ' RETURN count(*)')
    )
    .then((result) => {
      session.close();
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['count(*)'];
      return parseInt(output, 10);
    });

  let nodesOutput = nodes.map((node) => {
    let paths = [
      {
        path: `${process.env.SERVERURL}uploads/${node.year}/${node.month}/images/${node.hashedName}`,
        pathType: 'source',
      },
      {
        path: `${process.env.SERVERURL}uploads/${node.year}/${node.month}/thumbnails/${node.hashedName}`,
        pathType: 'thumbnail',
      },
    ];
    node.paths = paths;
    return node;
  });
  let totalPages = Math.ceil(count / limit);
  let result = {
    nodes: nodesOutput,
    count: count,
    totalPages: totalPages,
  };
  return result;
};

/**
* @api {get} /uploaded-file Get uploaded-file
* @apiName get uploaded-file
* @apiGroup Uploaded Files
*
* @apiParam {string} _id The _id of the requested uploaded-file.

*/
const getUploadedFile = async (req, resp) => {
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
  let query = { _id: _id };
  let content = new UploadedFile(query);
  await content.load();
  resp.json({
    status: true,
    data: content,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {post} /uploaded-file Put uploaded-file
* @apiName post uploaded-file
* @apiGroup Uploaded Files
* @apiPermission admin
*
* @apiParam {formData} [file] A form data object with the name "file" containing the filename and the file blob.
* @apiExample {formData} Example:
* Content-Disposition: form-data; name="file"; filename="some-file.jpg"
Content-Type: image/jpeg
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"image":"http://localhost:5100/2020/2/images/fac02fb4bfcaabccd3653dc5a5e68e0b.jpg","thumbnail":"http://localhost:5100/2020/2/thumbnails/fac02fb4bfcaabccd3653dc5a5e68e0b.jpg"},"error":false,"msg":""}
*/
const postUploadedFile = async (req, resp) => {
  let data = await parseFormDataPromise(req);
  if (Object.keys(data.file).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The uploaded file must not be empty',
    });
    return false;
  }
  let uploadedFile = data.file.file;
  const allowedExtensions = ['jpg', 'jpeg', 'gif', 'png'];
  let extension = mimeType.extension(uploadedFile.type);
  if (extension === 'jpeg') {
    extension = 'jpg';
  }
  if (allowedExtensions.indexOf(extension) === -1) {
    let output = {
      status: false,
      data: [],
      error: true,
      msg: `The file extension "${extension}" is not allowed. Please provide a valid image file.`,
    };
    return resp.json(output);
  }
  let hashedName = helpers.hashFileName(uploadedFile.name) + '.' + extension;
  let newDimensions = null;
  if (typeof data.dimensions !== 'undefined') {
    newDimensions = data.dimensions;
  }

  // 1. upload file
  let newUploadFile = await uploadFile(uploadedFile, hashedName);
  let srcPath = newUploadFile.path;
  let thumbnailPath = '';

  let date = new Date();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();
  // 2. if image create thumbnail
  let fileType = uploadedFile.type.split('/')[0];
  if (fileType === 'image' && newUploadFile.status) {
    let newWidth = null;
    let newHeight = null;
    if (newDimensions !== null) {
      if (
        typeof newDimensions.width !== 'undefined' &&
        newDimensions.width !== ''
      ) {
        newWidth = newDimensions.width;
      }
      if (
        typeof newDimensions.height !== 'undefined' &&
        newDimensions.height !== ''
      ) {
        newHeight = newDimensions.height;
      }
    }

    let thumbnailsDir = `${process.env.UPLOADSPATH}/uploads/${year}/${month}/thumbnails/`;
    thumbnailPath = `${thumbnailsDir}${hashedName}`;

    await createThumbnail(
      srcPath,
      thumbnailPath,
      hashedName,
      newWidth,
      newHeight
    );
  }

  // 3. store file reference to the db
  let userId = req.decoded.id;
  let postData = {
    filename: uploadedFile.name,
    year: year,
    month: month,
    hashedName: hashedName,
  };
  let newFile = new UploadedFile(postData);
  let output = await newFile.save(userId);
  resp.json(output);
};

/**
* @api {delete} /uploaded-file Delete uploaded-file
* @apiName delete uploaded-file
* @apiGroup Uploaded Files
* @apiPermission admin
*
* @apiParam {string} _id The id of the article for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Article) WHERE id(n)=2880 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":3,"high":0}}},"error":[],"msg":"Query results"}
 */
const deleteUploadedFile = async (req, resp) => {
  let postData = req.body;
  let content = new UploadedFile(postData);
  let data = await content.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: 'Query results',
  });
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

const uploadFile = async (uploadedFile = null, hashedName = '') => {
  if (uploadedFile === null || hashedName === '') {
    return false;
  }
  // patch for the case when the archive path is in a different drive
  let tempPath = process.env.ARCHIVEPATH + 'temp/' + hashedName;
  await fs.copyFileSync(uploadedFile.path, tempPath);
  uploadedFile.path = tempPath;

  let date = new Date();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  let sourcePath = uploadedFile.path;
  let imagesDir = `${process.env.UPLOADSPATH}/uploads/${year}/${month}/images/`;
  let thumbnailsDir = `${process.env.UPLOADSPATH}/uploads/${year}/${month}/thumbnails/`;
  let targetPath = `${imagesDir}${hashedName}`;
  uploadedFile.path = targetPath;

  if (!fs.existsSync(imagesDir)) {
    await fs.mkdirSync(imagesDir, { recursive: true }, (err) => {
      console.log(err);
    });
  }
  if (!fs.existsSync(thumbnailsDir)) {
    await fs.mkdirSync(thumbnailsDir, (err) => {
      console.log(err);
    });
  }
  let uploadFilePromise = await new Promise((resolve) => {
    fs.copyFile(sourcePath, targetPath, (error) => {
      let output = {};
      if (error) {
        output.status = false;
        output.msg = error;
      } else {
        output.status = true;
        output.msg = 'File ' + uploadedFile.name + ' uploaded successfully';
        output.path = targetPath;
        output.fileName = hashedName;
      }
      if (output.status) {
        // unlink file
        fs.unlinkSync(sourcePath);
      }
      resolve(output);
    });
  });
  return uploadFilePromise;
};

const createThumbnail = async (
  srcPath = null,
  targetPath = null,
  fileName = null,
  customWidth = null,
  customHeight = null
) => {
  if (srcPath === null || targetPath === null) {
    return false;
  }
  const imageSrc = await fs.readFileSync(srcPath);
  const newThumbnail = new Promise((resolve) => {
    const Image = Canvas.Image;
    const img = new Image();
    let output = {};
    let errors = [];
    img.src = imageSrc;

    img.onerror = function (err) {
      errors.push(err);
    };
    // calculate new dimensions
    let oldWidth = img.width;
    let oldHeight = img.height;
    let aspectRatio = oldWidth / oldHeight;
    let newWidth = 400;
    let newHeight = 400;
    if (oldWidth > oldHeight) {
      newHeight = newWidth / aspectRatio;
    } else {
      newWidth = newHeight * aspectRatio;
    }

    if (customWidth !== null) {
      newWidth = customWidth;
      newHeight = newWidth / aspectRatio;
    } else if (customHeight !== null) {
      newHeight = customHeight;
      newWidth = newHeight * aspectRatio;
    }

    newWidth = parseInt(newWidth, 10);
    newHeight = parseInt(newHeight, 10);

    if (newWidth > 0 && newHeight > 0) {
      var canvas = Canvas.createCanvas(newWidth, newHeight);
      var ctx = canvas.getContext('2d');
      // ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      var out = fs.createWriteStream(targetPath);
      var stream = canvas.createJPEGStream({
        bufsize: 2048,
        quality: 20,
      });

      stream.pipe(out);
      out.on('finish', function () {
        output.status = true;
        output.msg = fileName + ' resized successfully';
        output.errors = errors;

        resolve(output);
      });
    } else {
      output.status = false;
      output.msg = fileName + ' failed to resize';
      output.errors = errors;
      resolve(output);
    }
  });
  return newThumbnail;
};

module.exports = {
  UploadedFile: UploadedFile,
  getUploadedFiles: getUploadedFiles,
  getUploadedFile: getUploadedFile,
  postUploadedFile: postUploadedFile,
  deleteUploadedFile: deleteUploadedFile,
};
