const sanitizeHtml = require('sanitize-html');
const fs = require('fs');
const driver = require('../config/db-driver');
const {
  normalizeRecordsOutput,
  outputRecord,
  prepareNodeProperties,
  prepareOutput,
  prepareParams,
} = require('../helpers');

const { UploadedFile } = require('./uploadedFile.ctrl');
const {
  ArticleCategory,
  getArticleCategoriesChildren,
} = require('./articleCategory.ctrl');

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
    const errors = [];
    if (this.label === '') {
      status = false;
      errors.push({ field: 'label', msg: 'The label must not be empty' });
    }
    let msg = 'The record is valid';
    if (!status) {
      msg = 'The record is not valid';
    }
    const output = {
      status,
      msg,
      errors,
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
    const session = driver.session();
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result;
        if (records.length > 0) {
          const record = records[0];
          const key = record.keys[0];
          let output = record.toObject()[key];
          output = outputRecord(output);
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
      const featuredImageDetails = new UploadedFile({
        _id: this.featuredImage,
      });
      await featuredImageDetails.load();
      this.featuredImageDetails = featuredImageDetails;
    }
  }

  async makePermalink(label) {
    const permalink = label
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    const article = new Article({ permalink });
    await article.load();
    if (article._id === null) {
      return permalink;
    } else {
      await this.makePermalink(permalink + '-2');
    }
  }

  async save(userId) {
    const validateArticle = this.validate();
    if (!validateArticle.status) {
      return validateArticle;
    } else {
      const session = driver.session();
      for (let key in this) {
        if (key === 'content' || key === 'teaser') {
          const clean = sanitizeHtml(this[key], {
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
      const now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
        this.permalink = await this.makePermalink(this.label);
      } else {
        const original = new Article({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
        this.permalink = original.permalink;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      const nodeProperties = prepareNodeProperties(this);
      const params = prepareParams(this);
      let query = '';
      if (typeof this._id === 'undefined' || this._id === null) {
        query = `CREATE (n:Article ${nodeProperties}) RETURN n`;
      } else {
        query = `MATCH (n:Article) WHERE id(n)=${this._id} SET n=${nodeProperties} RETURN n`;
      }
      const resultPromise = await session.run(query, params).then((result) => {
        session.close();
        const { records } = result;
        let output = {
          errors: ['The record cannot be updated'],
          status: false,
          data: [],
        };
        if (records.length > 0) {
          const record = records[0];
          const key = record.keys[0];
          let resultRecord = record.toObject()[key];
          resultRecord = outputRecord(resultRecord);
          output = { errors: [], status: true, data: resultRecord };
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
    const session = driver.session();
    const query = `MATCH (n)-[r]->() WHERE id(n)=${this._id} RETURN count(*) AS c`;
    const count = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result;
        if (records.length > 0) {
          const record = records[0];
          const key = record.keys[0];
          let output = record.toObject();
          prepareOutput(output);
          output = output[key];
          return output;
        }
      });
    this.count = count;
  }

  async delete() {
    const session = driver.session();
    await this.countRelations();
    if (Number(this.count) > 0) {
      return {
        errors: ["You must remove the record's relations before deleting"],
        status: false,
        data: [],
      };
    }

    const query = `MATCH (n:Article) WHERE id(n)=${this._id} DELETE n`;
    const deleteRecord = await session
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
*
* @apiParam {string} [label] A string to match against articles' labels.
* @apiParam {string} [categoryId] A category id to match against articles' categories.
* @apiParam {string} [categoryName] A string to match against articles' categories.
* @apiParam {number} [limit=25] The number of results per page
* @apiParam {string} [orderField=label] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {string} [status] The status of the articles
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"data":[{"createdAt":"2020-01-27T15:55:23.499Z","templatePosition":"","label":"Top Article","_id":"2822","updatedAt":"2020-01-27T17:55:15.742Z","systemLabels":["Article"]},{"createdAt":"2020-01-27T17:43:44.578Z","label":"Bottom Article","templatePosition":"bottom","updatedAt":"2020-01-27T17:43:44.578Z","_id":"2683","systemLabels":["Article"]}]},"errors":[]}
*/
const getArticles = async (req, resp) => {
  const { query: parameters } = req;
  const {
    label = '',
    categoryName = '',
    status = '',
    orderField = 'label',
    orderDesc = '',
  } = parameters;
  let { categoryId = '', limit = 25, page = 0 } = parameters;
  let queryPage = 0;
  let queryOrder = '';
  page = Number(page);
  limit = Number(limit);

  let query = '';
  let queryParams = '';

  if (label !== '') {
    queryParams += `toLower(n.label) =~ toLower('.*${label}.*') `;
  }

  if (categoryId !== '') {
    const categories = await getArticleCategoriesChildren(categoryId);
    const childrenCategoriesIds = categories.map((c) => `"${c._id}"`);
    const categoryIds = [`${categoryId}`, ...childrenCategoriesIds];
    queryParams += ` ANY (category IN n.category WHERE category IN [${categoryIds}]) `;
  }

  if (categoryName !== '') {
    const category = new ArticleCategory({ label: categoryName });
    await category.load();
    categoryId = category._id;
    const categories = await getArticleCategoriesChildren(categoryId);
    const childrenCategoriesIds = categories.map((c) => `"${c._id}"`);
    const categoryIds = [`${categoryId}`, ...childrenCategoriesIds];
    queryParams += ` ANY (category IN n.category WHERE category IN [${categoryIds}]) `;
  }

  if (status !== '') {
    if (queryParams !== '') {
      queryParams += ' AND ';
    }
    queryParams += `n.status='${status}' `;
  }

  if (orderField !== '') {
    queryOrder = `ORDER BY n.${orderField}`;
    if (orderDesc === 'true') {
      queryOrder += ' DESC';
    }
  }

  if (page > 0) {
    queryPage = page - 1;
  }

  let currentPage = page;
  if (page === 0) {
    currentPage = 1;
  }
  const skip = limit * queryPage;
  if (queryParams !== '') {
    queryParams = `WHERE ${queryParams}`;
  }

  query = `MATCH (n:Article) ${queryParams} RETURN n ${queryOrder} SKIP ${skip} LIMIT ${limit}`;
  const data = await getArticlesQuery(query, queryParams, limit);
  if (data.error) {
    return resp.status(200).json({
      status: false,
      data: [],
      errors: [data.error],
    });
  } else {
    const responseData = {
      currentPage,
      data: data.nodes,
      totalItems: data.count,
      totalPages: data.totalPages,
    };
    return resp.status(200).json({
      status: true,
      data: responseData,
      errors: [],
    });
  }
};

const getArticlesQuery = async (query, queryParams, limit) => {
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
  const { length } = nodes;
  for (let i = 0; i < length; i += 1) {
    const node = nodes[i];
    if (
      typeof node.featuredImage !== 'undefined' &&
      node.featuredImage !== ''
    ) {
      const featuredImageDetails = new UploadedFile({
        _id: node.featuredImage,
      });
      await featuredImageDetails.load();
      node.featuredImageDetails = featuredImageDetails;
    } else node.featuredImageDetails = null;
    const categories = [];
    if (typeof node.category !== 'undefined') {
      if (
        typeof node.category === 'object' &&
        node.category.length !== 'undefined'
      ) {
        const { length: cLength } = node.category;
        for (let j = 0; j < cLength; j += 1) {
          const ac = node.category[j];
          const category = new ArticleCategory({ _id: ac });
          await category.load();
          categories.push(category);
        }
      } else if (node.category !== 0) {
        const category = new ArticleCategory({ _id: node.category });
        await category.load();
        categories.push(category);
      }
    }
    node.categories = categories;
  }

  const count = await session
    .writeTransaction((tx) =>
      tx.run(`MATCH (n:Article) ${queryParams} RETURN count(*)`)
    )
    .then((result) => {
      session.close();
      const resultRecord = result.records[0];
      const countObj = resultRecord.toObject();
      prepareOutput(countObj);
      const output = countObj['count(*)'];
      return Number(output);
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
 * @api {get} /articles-list Get articles list
 * @apiName get articles list
 * @apiGroup Articles
 *
 * @apiParam {string} [label] A string to match against articles' labels.
 */
const getArticlesList = async (req, resp) => {
  const { query: parameters } = req;
  const { label = '' } = parameters;
  let queryParams = '';

  if (label !== '') {
    queryParams += `toLower(n.label) =~ toLower('.*${label}.*') `;
  }

  if (queryParams !== '') {
    queryParams = `WHERE ${queryParams}`;
  }

  const session = driver.session();
  const query = `MATCH (n:Article) ${queryParams} WHERE n.status='public' RETURN n ORDER BY n.label`;
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  let data = normalizeRecordsOutput(nodesPromise);
  data = data.map((i) => {
    delete i.content;
    delete i.teaser;
    return i;
  });
  if (data.error) {
    resp.status(200).json({
      status: false,
      data: [],
      errors: [data.error],
    });
  } else {
    resp.status(200).json({
      status: true,
      data: data,
      errors: [],
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
  const { query: parameters } = req;
  const { _id = '', permalink = '' } = parameters;
  if (_id === '' && permalink === '') {
    resp.status(400).json({
      status: false,
      data: [],
      errors: ['Please select a valid id to continue.'],
    });
    return false;
  }
  let query = null;
  if (_id !== '') {
    query = { _id };
  }
  if (permalink !== '') {
    query = { permalink };
  }
  const content = new Article(query);
  await content.load();
  resp.status(200).json({
    status: true,
    data: content,
    errors: [],
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
{"status":true,"data":{"createdAt":"2020-01-30T14:56:30.780Z","updatedBy":"437","createdBy":"437","label":"test","_id":"2880","category":0,"content":"<p>test content</p>","status":"private","teaser":"<p>test teaser</p>","updatedAt":"2020-01-30T15:00:44.721Z"},"errors":[]}
*/
const putArticle = async (req, resp) => {
  const { body: postData } = req;
  if (Object.keys(postData).length === 0) {
    return resp.status(400).json({
      status: false,
      data: [],
      errors: ['The article content must not be empty'],
    });
  }
  const { id: userId } = req.decoded;
  const article = new Article(postData);
  const output = await article.save(userId);
  return resp.status(201).json({
    status: output.status,
    data: output.data,
    errors: [output.error],
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
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Article) WHERE id(n)=2880 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":3,"high":0}}},"errors":[]}
 */
const deleteArticle = async (req, resp) => {
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
  const content = new Article({ _id });
  const { data = null, error = [], status = true } = await content.delete();
  return resp.status(200).json({
    status,
    data,
    error,
    msg: '',
  });
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
  const { UPLOADSPATH: root = '' } = process.env;
  if (root === '') {
    return resp.status(400).json({
      status: false,
      data: [],
      errors: ['The upload directory path is not defined'],
    });
  }
  const dir = typeof req.query.dir !== 'undefined' ? req.query.dir : '';
  const directory = root + dir;
  const files = await fs.readdirSync(directory);
  const results = [];
  const { length } = files;
  for (let i = 0; i < length; i += 1) {
    const file = files[i];
    const stat = await fs.lstatSync(directory + file);
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
    results.push({ file, type, path: itemPath });
  }
  return resp.status(200).json({
    status: true,
    data: results,
    errors: [],
  });
};

/**
* @api {get} /highlights Get articles highlights
* @apiName get articles highlights
* @apiGroup Articles
*
* @apiParam {number} [page] The page of the requested highlights.
* @apiParam {number} [limit] The number of the requested highlights.

*/
const getHighlights = async (req, resp) => {
  const { query: parameters } = req;
  const { limit: limitParam = 25, page: pageParam = 0 } = parameters;
  let page = Number(pageParam);
  let limit = Number(limitParam);
  let queryPage = 0;
  if (page > 0) {
    queryPage = Number(page) - 1;
  }
  const skip = limit * queryPage;
  const query = `MATCH (n:Article) WHERE n.highlight=true RETURN n ORDER BY n.highlightOrder SKIP ${skip} LIMIT ${limit}`;
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
  const { length } = nodes;
  for (let i = 0; i < length; i += 1) {
    const node = nodes[i];
    if (
      typeof node.featuredImage !== 'undefined' &&
      node.featuredImage !== ''
    ) {
      const featuredImageDetails = new UploadedFile({
        _id: node.featuredImage,
      });
      await featuredImageDetails.load();
      node.featuredImageDetails = featuredImageDetails;
    } else node.featuredImageDetails = null;
  }
  session.close();
  return resp.status(200).json({
    status: true,
    data: nodes,
    errors: [],
  });
};

/**
* @api {put} /highlights Put articles highlights
* @apiName put articles highlights
* @apiGroup Articles
*
* @apiParam {number} [page] The page of the requested highlights.
* @apiParam {number} [limit] The number of the requested highlights.

*/
const updateHighlights = async (req, resp) => {
  const { body: parameters } = req;
  const { item = null, otherItem = null } = parameters;
  if (item === null || otherItem === null) {
    return resp.status(400).json({
      status: false,
      data: [],
      errors: ['Please provide two valid items to continue'],
    });
  }
  const results = {
    status: false,
    data: [],
    errors: [],
  };
  const queryItem = `MATCH (n:Article) WHERE id(n)=${
    item._id
  } SET n.highlight=true, n.highlightOrder=${Number(item.order)} RETURN n`;
  const session = driver.session();
  await session.run(queryItem, {}).then((result) => {
    const { records } = result;
    if (records.length > 0) {
      const record = records[0];
      const key = record.keys[0];
      let resultRecord = record.toObject()[key];
      resultRecord = outputRecord(resultRecord);
      results.status = true;
      results.data.push(resultRecord);
    }
    return records;
  });
  const queryOtherItem = `MATCH (n:Article) WHERE id(n)=${
    otherItem._id
  } SET n.highlight=true, n.highlightOrder=${Number(otherItem.order)} RETURN n`;
  await session.run(queryOtherItem, {}).then((result) => {
    const { records } = result;
    if (records.length > 0) {
      const record = records[0];
      const key = record.keys[0];
      let resultRecord = record.toObject()[key];
      resultRecord = outputRecord(resultRecord);
      results.data.push(resultRecord);
    }
    return records;
  });
  await normalizeHighlightsOrder();
  session.close();
  return resp.status(200).json(results);
};
/**
 * @api {put} /highlight Put article highlight
 * @apiName put article highlight
 * @apiGroup Articles
 *
 * @apiParam {string} [_id] The article id.
 * @apiParam {number} [order] The article highlight order.
 */
const addHighlight = async (req, resp) => {
  const { body: parameters } = req;
  const { _id = '', order: orderParam = 0 } = parameters;
  if (_id === '') {
    return resp.status(400).json({
      status: false,
      data: [],
      errors: ['Please provide a valid article id to continue'],
    });
  }
  const order = Number(orderParam);
  const query = `MATCH (n:Article) WHERE id(n)=${_id} SET n.highlight=true, n.highlightOrder=${order} RETURN n`;
  const session = driver.session();
  const resultPromise = await session.run(query, {}).then((result) => {
    session.close();
    const { records } = result;
    const output = {
      status: false,
      data: [],
      errors: ['The record cannot be updated'],
    };
    if (records.length > 0) {
      const record = records[0];
      const key = record.keys[0];
      let resultRecord = record.toObject()[key];
      resultRecord = outputRecord(resultRecord);
      output.errors = [];
      output.status = true;
      output.data = resultRecord;
    }
    return output;
  });
  await normalizeHighlightsOrder();
  return resp.status(200).json(resultPromise);
};

/**
 * @api {delete} /highlight Delete article highlight
 * @apiName delete article highlight
 * @apiGroup Articles
 *
 * @apiParam {string} [_id] The article id.
 */
const removeHighlight = async (req, resp) => {
  const { body: parameters } = req;
  const { _id = '' } = parameters;
  if (_id === '') {
    return resp.status(400).json({
      status: false,
      data: [],
      errors: ['Please provide a valid article id to continue'],
    });
  }

  const { id: userId } = req.decoded;
  const now = new Date().toISOString();
  const query = `MATCH (n:Article) WHERE id(n)=${_id} SET n.highlight=false, n.updatedBy=${userId}, n.updatedAt="${now}" RETURN n`;
  const session = driver.session();
  const resultPromise = await session.run(query, {}).then((result) => {
    session.close();
    const { records } = result;
    const output = {
      status: false,
      data: [],
      errors: ['The record cannot be updated'],
    };
    if (records.length > 0) {
      const record = records[0];
      const key = record.keys[0];
      let resultRecord = record.toObject()[key];
      resultRecord = outputRecord(resultRecord);
      output.status = true;
      output.data = resultRecord;
      output.errors = [];
    }
    return output;
  });
  await normalizeHighlightsOrder();
  return resp.status(200).json(resultPromise);
};

const normalizeHighlightsOrder = async () => {
  const query =
    'MATCH (n:Article) WHERE n.highlight=true RETURN n ORDER BY n.highlightOrder';
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
  const { length } = nodes;
  for (let i = 0; i < length; i += 1) {
    const n = nodes[i];
    const order = i + 1;
    const query = `MATCH (n:Article) WHERE id(n)=${n._id} SET n.highlightOrder=${order} RETURN n`;
    await session.run(query, {}).then((result) => {
      const { records } = result;
      return records;
    });
  }
  session.close();
};

module.exports = {
  Article,
  getArticles,
  getArticlesList,
  getArticle,
  putArticle,
  deleteArticle,
  imagesBrowser,
  getHighlights,
  updateHighlights,
  addHighlight,
  removeHighlight,
};
