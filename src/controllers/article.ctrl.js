const driver = require('../config/db-driver');
const helpers = require('../helpers');
const sanitizeHtml = require('sanitize-html');
const Canvas = require('canvas');
const fs = require('fs');
const mimeType = require('mime-types');
const formidable = require('formidable');
const UploadedFile = require('./uploadedFile.ctrl').UploadedFile;
const ArticleCategory = require('./articleCategory.ctrl').ArticleCategory;
const getArticleCategoriesChildren = require('./articleCategory.ctrl')
  .getArticleCategoriesChildren;

class Article {
  constructor({
    _id = null,
    label = null,
    permalink = null,
    category = 0,
    content = null,
    teaser = null,
    status = 'public',
    featuredImage = null,
    featuredImageDetails = null,
    highlight = false,
    highlightOrder = 0,
    createdBy = null,
    createdAt = null,
    updatedBy = null,
    updatedAt = null,
  }) {
    this._id = null;
    if (_id !== null) {
      this._id = _id;
    }
    this.label = label;
    this.permalink = permalink;
    this.category = category;
    this.content = content;
    this.teaser = teaser;
    this.status = status;
    this.featuredImage = featuredImage;
    this.featuredImageDetails = featuredImageDetails;
    this.highlight = highlight;
    this.highlightOrder = highlightOrder;
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
      errors.push({ field: 'label', msg: 'The label must not be empty' });
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
    if (this._id === null && this.permalink === null) {
      return false;
    }
    let query = '';
    if (this._id !== null) {
      query = `MATCH (n:Article) WHERE id(n)=${this._id} return n`;
    }
    if (this.permalink !== null) {
      query = `MATCH (n:Article) WHERE n.permalink="${this.permalink}" return n`;
    }
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
    // populate featured image
    if (
      typeof this.featuredImage !== 'undefined' &&
      this.featuredImage !== ''
    ) {
      let featuredImageDetails = new UploadedFile({ _id: this.featuredImage });
      await featuredImageDetails.load();
      this.featuredImageDetails = featuredImageDetails;
    }
  }

  async makePermalink(label) {
    let permalink = label
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    let article = new Article({ permalink: permalink });
    await article.load();
    if (article._id === null) {
      return permalink;
    } else {
      await this.makePermalink(permalink + '-2');
    }
  }

  async save(userId) {
    let validateArticle = this.validate();
    if (!validateArticle.status) {
      return validateArticle;
    } else {
      let session = driver.session();

      for (let key in this) {
        if (key === 'content' || key === 'teaser') {
          let clean = sanitizeHtml(this[key], {
            allowedTags: [
              'h1',
              'h2',
              'h3',
              'h4',
              'h5',
              'h6',
              'blockquote',
              'p',
              'a',
              'ul',
              'ol',
              'li',
              'b',
              'i',
              'strong',
              'em',
              'strike',
              'hr',
              'br',
              'div',
              'table',
              'thead',
              'caption',
              'tbody',
              'tr',
              'th',
              'td',
              'pre',
              'iframe',
              'img',
            ],
            allowedAttributes: {
              a: ['href', 'name', 'target'],
              img: ['src', 'width', 'height'],
            },
          });
          this[key] = clean;
        }
      }

      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
        this.permalink = await this.makePermalink(this.label);
      } else {
        let original = new Article({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
        this.permalink = original.permalink;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      let nodeProperties = helpers.prepareNodeProperties(this);
      let params = helpers.prepareParams(this);
      let query = '';
      if (typeof this._id === 'undefined' || this._id === null) {
        query = 'CREATE (n:Article ' + nodeProperties + ') RETURN n';
      } else {
        query =
          'MATCH (n:Article) WHERE id(n)=' +
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

    let query = `MATCH (n:Article) WHERE id(n)=${this._id} DELETE n`;
    let deleteRecord = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        return result;
      });
    return deleteRecord;
  }
}
/**
* @api {get} /articles Get articles
* @apiName get articles
* @apiGroup Articles
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"data":[{"createdAt":"2020-01-27T15:55:23.499Z","templatePosition":"","label":"Top Article","_id":"2822","updatedAt":"2020-01-27T17:55:15.742Z","systemLabels":["Article"]},{"createdAt":"2020-01-27T17:43:44.578Z","label":"Bottom Article","templatePosition":"bottom","updatedAt":"2020-01-27T17:43:44.578Z","_id":"2683","systemLabels":["Article"]}]},"error":[],"msg":"Query results"}
*/
const getArticles = async (req, resp) => {
  let parameters = req.query;
  let label = '';
  let categoryId = '';
  let categoryName = '';
  let status = '';
  let page = 0;
  let orderField = 'label';
  let queryPage = 0;
  let queryOrder = '';
  let limit = 25;

  let query = '';
  let queryParams = '';
  if (typeof parameters.label !== 'undefined') {
    label = parameters.label;
    if (label !== '') {
      queryParams += "toLower(n.label) =~ toLower('.*" + label + ".*') ";
    }
  }
  if (typeof parameters.categoryId !== 'undefined') {
    categoryId = parameters.categoryId;
    if (categoryId !== '') {
      let categories = await getArticleCategoriesChildren(categoryId);
      let childrenCategoriesIds = categories.map((c) => `"${c._id}"`);
      let categoryIds = [`"${categoryId}"`, ...childrenCategoriesIds];
      queryParams += ` ANY (category IN n.category WHERE category IN [${categoryIds}]) `;
    }
  }
  if (typeof parameters.categoryName !== 'undefined') {
    categoryName = parameters.categoryName;
    if (categoryName !== '') {
      let category = new ArticleCategory({ label: categoryName });
      await category.load();
      categoryId = category._id;
      let categories = await getArticleCategoriesChildren(categoryId);
      let childrenCategoriesIds = categories.map((c) => `"${c._id}"`);
      let categoryIds = [`${categoryId}`, ...childrenCategoriesIds];
      queryParams += ` ANY (category IN n.category WHERE category IN [${categoryIds}]) `;
    }
  }
  if (typeof parameters.status !== 'undefined') {
    status = parameters.status;
    if (status !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += "toLower(n.status) =~ toLower('.*" + status + ".*') ";
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
    'MATCH (n:Article) ' +
    queryParams +
    ' RETURN n ' +
    queryOrder +
    ' SKIP ' +
    skip +
    ' LIMIT ' +
    limit;
  let data = await getArticlesQuery(query, queryParams, limit);
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

const getArticlesQuery = async (query, queryParams, limit) => {
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

  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (
      typeof node.featuredImage !== 'undefined' &&
      node.featuredImage !== ''
    ) {
      let featuredImageDetails = new UploadedFile({ _id: node.featuredImage });
      await featuredImageDetails.load();
      node.featuredImageDetails = featuredImageDetails;
    } else node.featuredImageDetails = null;
  }

  let count = await session
    .writeTransaction((tx) =>
      tx.run('MATCH (n:Article) ' + queryParams + ' RETURN count(*)')
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

const getArticlesList = async (req, resp) => {
  let parameters = req.query;
  let label = '';
  let queryParams = '';
  if (typeof parameters.label !== 'undefined') {
    label = parameters.label;
    if (label !== '') {
      queryParams += "toLower(n.label) =~ toLower('.*" + label + ".*') ";
    }
  }
  if (queryParams !== '') {
    queryParams = 'WHERE ' + queryParams;
  }
  let session = driver.session();
  let query =
    'MATCH (n:Article) ' +
    queryParams +
    " WHERE n.status='public' RETURN n ORDER BY n.label";
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  let data = helpers.normalizeRecordsOutput(nodesPromise);
  data = data.map((i) => {
    delete i.content;
    delete i.teaser;
    return i;
  });
  if (data.error) {
    resp.json({
      status: false,
      data: [],
      error: data.error,
      msg: data.error.message,
    });
  } else {
    resp.json({
      status: true,
      data: data,
      error: [],
      msg: 'Query results',
    });
  }
};

/**
* @api {get} /article Get article
* @apiName get article
* @apiGroup Articles
*
* @apiParam {string} [_id] The _id of the requested article.
* @apiParam {string} [permalink] The permalink of the requested article.

*/
const getArticle = async (req, resp) => {
  let parameters = req.query;
  if (
    (typeof parameters._id === 'undefined' || parameters._id === '') &&
    (typeof parameters.permalink === 'undefined' || parameters.permalink === '')
  ) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
    return false;
  }
  let _id = null;
  let permalink = null;
  let query = null;
  if (typeof parameters._id !== 'undefined' && parameters._id !== '') {
    _id = parameters._id;
    query = { _id: _id };
  }
  if (
    typeof parameters.permalink !== 'undefined' &&
    parameters.permalink !== ''
  ) {
    permalink = parameters.permalink;
    query = { permalink: permalink };
  }
  let content = new Article(query);
  await content.load();
  resp.json({
    status: true,
    data: content,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /article Put article
* @apiName put article
* @apiGroup Articles
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the article. This should be undefined|null|blank in the creation of a new article.
* @apiParam {string} label The article's label.
* @apiParam {number} [category] The article's category.
* @apiParam {number} [teaser] The article's teaser.
* @apiParam {number} [status] The article's status.
* @apiParam {number} [featuredImage] The article's featuredImage.
* @apiExample {json} Example:
* {"createdAt":"2020-01-27T15:55:23.499Z","templatePosition":"","label":"Top Article","_id":"2822","updatedAt":"2020-01-27T17:55:15.742Z"}
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"createdAt":"2020-01-30T14:56:30.780Z","updatedBy":"437","createdBy":"437","label":"test","_id":"2880","category":0,"content":"<p>test content</p>","status":"private","teaser":"<p>test teaser</p>","updatedAt":"2020-01-30T15:00:44.721Z"},"error":[],"msg":"Query results"}
*/
const putArticle = async (req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The content must not be empty',
    });
    return false;
  }
  let userId = req.decoded.id;
  let article = new Article(postData);
  let output = await article.save(userId);
  resp.json({
    status: output.status,
    data: output.data,
    error: output.error,
    msg: 'Query results',
  });
};

/**
* @api {delete} /article Delete article
* @apiName delete article
* @apiGroup Articles
* @apiPermission admin
*
* @apiParam {string} _id The id of the article for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Article) WHERE id(n)=2880 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":3,"high":0}}},"error":[],"msg":"Query results"}
 */
const deleteArticle = async (req, resp) => {
  let postData = req.body;
  let content = new Article(postData);
  let data = await content.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: 'Query results',
  });
};

const uploadImage = async (req, resp) => {
  let data = await parseFormDataPromise(req);
  if (Object.keys(data.file).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The uploaded image must not be empty',
    });
    return false;
  }
  let uploadedFile = data.file.file;
  let extension = mimeType.extension(uploadedFile.type);
  if (extension === 'jpeg') {
    extension = 'jpg';
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
  let status = true;
  let error = false;
  let output = {
    status: status,
    data: {
      image: `${process.env.SERVERURL}${year}/${month}/images/${hashedName}`,
      thumbnail: `${process.env.SERVERURL}${year}/${month}/thumbnails/${hashedName}`,
    },
    error: error,
    msg: '',
  };
  resp.json(output);
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
    fs.rename(sourcePath, targetPath, function (error) {
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
        quality: 80,
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

/**
* @api {get} /images-browser Browse images
* @apiName images browser
* @apiGroup Articles
* @apiPermission admin
*
* @apiParam {string} dir=uploads The directory to browse.
*
* @apiSuccessExample {json} Success-Response:
{} */
const imagesBrowser = async (req, resp) => {
  let root = process.env.UPLOADSPATH;
  let dir = '';
  if (typeof req.query.dir !== 'undefined') {
    dir = req.query.dir;
  }
  let directory = root + dir;
  let files = await fs.readdirSync(directory);
  let results = [];
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let stat = await fs.lstatSync(directory + file);
    let type = '';
    let itemPath = '';
    let cleanRoot = directory.replace(root, '');
    if (cleanRoot === 'undefined') {
      cleanRoot = '';
    }
    if (stat.isFile()) {
      type = 'file';
      itemPath = process.env.SERVERURL + cleanRoot + file;
    }
    if (stat.isDirectory()) {
      type = 'directory';
      itemPath = cleanRoot + file;
    }
    results.push({ file: file, type: type, path: itemPath });
  }
  resp.json({
    status: true,
    data: results,
    error: false,
    msg: 'Results',
  });
};

/**
* @api {get} /highlights Get highlights
* @apiName get highlights
* @apiGroup Articles
*
* @apiParam {number} [page] The page of the requested highlights.
* @apiParam {number} [limit] The number of the requested highlights.

*/
const getHighlights = async (req, resp) => {
  let parameters = req.query;
  let limit = 25;
  let queryPage = 0;
  if (typeof parameters.page !== 'undefined') {
    queryPage = parseInt(parameters.page, 10) - 1;
    if (queryPage === -1) queryPage = 0;
  }
  if (typeof parameters.limit !== 'undefined') {
    limit = parseInt(parameters.limit, 10);
  }
  let skip = limit * queryPage;
  let query = `MATCH (n:Article) WHERE n.highlight=true RETURN n ORDER BY n.highlightOrder SKIP ${skip} LIMIT ${limit}`;
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  let nodes = helpers.normalizeRecordsOutput(nodesPromise);
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (
      typeof node.featuredImage !== 'undefined' &&
      node.featuredImage !== ''
    ) {
      let featuredImageDetails = new UploadedFile({ _id: node.featuredImage });
      await featuredImageDetails.load();
      node.featuredImageDetails = featuredImageDetails;
    } else node.featuredImageDetails = null;
  }
  resp.json({
    status: true,
    data: nodes,
    error: [],
    msg: 'Query results',
  });
};

const updateHighlights = async (req, resp) => {
  let parameters = req.body;
  if (
    typeof parameters.item === 'undefined' ||
    typeof parameters.otherItem === 'undefined'
  ) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please provide two valid items to continue',
    });
    return false;
  }
  let item = parameters.item;
  let otherItem = parameters.otherItem;

  let userId = req.decoded.id;
  let now = new Date().toISOString();
  let results = {
    status: false,
    data: [],
    error: true,
    msg: '',
  };
  let queryItem = `MATCH (n:Article) WHERE id(n)=${item._id} SET n.highlight=true, n.highlightOrder=${item.order}, n.updatedBy=${userId}, n.updatedAt="${now}" RETURN n`;
  let session = driver.session();
  await session.run(queryItem, {}).then((result) => {
    let records = result.records;
    if (records.length > 0) {
      let record = records[0];
      let key = record.keys[0];
      let resultRecord = record.toObject()[key];
      resultRecord = helpers.outputRecord(resultRecord);
      results.status = true;
      results.error = false;
      results.data.push(resultRecord);
    }
    return records;
  });
  let queryOtherItem = `MATCH (n:Article) WHERE id(n)=${otherItem._id} SET n.highlight=true, n.highlightOrder=${otherItem.order}, n.updatedBy=${userId}, n.updatedAt="${now}" RETURN n`;
  await session.run(queryOtherItem, {}).then((result) => {
    session.close();
    let records = result.records;
    if (records.length > 0) {
      let record = records[0];
      let key = record.keys[0];
      let resultRecord = record.toObject()[key];
      resultRecord = helpers.outputRecord(resultRecord);
      results.data.push(resultRecord);
    }
    return records;
  });
  await normalizeHighlightsOrder(userId);
  resp.json(results);
};

const addHighlight = async (req, resp) => {
  let parameters = req.body;
  if (typeof parameters._id === 'undefined') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please provide a valid article id to continue',
    });
    return false;
  }
  let _id = parameters._id;
  let order = Number(parameters.order);

  let userId = req.decoded.id;
  let now = new Date().toISOString();
  let query = `MATCH (n:Article) WHERE id(n)=${_id} SET n.highlight=true, n.highlightOrder=${order}, n.updatedBy=${userId}, n.updatedAt="${now}" RETURN n`;
  let session = driver.session();
  let resultPromise = await session.run(query, {}).then((result) => {
    session.close();
    let records = result.records;
    let output = {
      error: true,
      msg: ['The record cannot be updated'],
      status: false,
      data: [],
    };
    if (records.length > 0) {
      let record = records[0];
      let key = record.keys[0];
      let resultRecord = record.toObject()[key];
      resultRecord = helpers.outputRecord(resultRecord);
      output = { error: [], status: true, data: resultRecord, msg: '' };
    }
    return output;
  });
  await normalizeHighlightsOrder(userId);
  resp.json(resultPromise);
};

const removeHighlight = async (req, resp) => {
  let parameters = req.body;
  if (typeof parameters._id === 'undefined') {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please provide a valid article id to continue',
    });
    return false;
  }
  let _id = parameters._id;

  let userId = req.decoded.id;
  let now = new Date().toISOString();
  let query = `MATCH (n:Article) WHERE id(n)=${_id} SET n.highlight=false, n.updatedBy=${userId}, n.updatedAt="${now}" RETURN n`;
  let session = driver.session();
  let resultPromise = await session.run(query, {}).then((result) => {
    session.close();
    let records = result.records;
    let output = {
      error: true,
      msg: ['The record cannot be updated'],
      status: false,
      data: [],
    };
    if (records.length > 0) {
      let record = records[0];
      let key = record.keys[0];
      let resultRecord = record.toObject()[key];
      resultRecord = helpers.outputRecord(resultRecord);
      output = { error: [], status: true, data: resultRecord, msg: '' };
    }
    return output;
  });
  await normalizeHighlightsOrder(userId);
  resp.json(resultPromise);
};

const normalizeHighlightsOrder = async (userId) => {
  let query =
    'MATCH (n:Article) WHERE n.highlight=true RETURN n ORDER BY n.highlightOrder';
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
  for (let i = 0; i < nodes.length; i++) {
    let n = nodes[i];
    let order = i + 1;
    let now = new Date().toISOString();
    let query = `MATCH (n:Article) WHERE id(n)=${n._id} SET n.highlightOrder=${order}, n.updatedBy=${userId}, n.updatedAt="${now}" RETURN n`;
    await session.run(query, {}).then((result) => {
      let records = result.records;
      return records;
    });
  }
  session.close();
};

module.exports = {
  Article: Article,
  getArticles: getArticles,
  getArticlesList: getArticlesList,
  getArticle: getArticle,
  putArticle: putArticle,
  deleteArticle: deleteArticle,
  uploadArticleImage: uploadImage,
  imagesBrowser: imagesBrowser,
  getHighlights: getHighlights,
  updateHighlights: updateHighlights,
  addHighlight: addHighlight,
  removeHighlight: removeHighlight,
};
