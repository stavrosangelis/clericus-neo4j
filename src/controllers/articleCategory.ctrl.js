const driver = require('../config/db-driver');
const helpers = require('../helpers');

class ArticleCategory {
  constructor({
    _id = null,
    label = null,
    permalink = null,
    parentId = 0,
    status = 'private',
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
    this.parentId = Number(parentId);
    this.status = status;
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
    if (this._id === null && this.label === null && this.permalink === null) {
      return false;
    }
    let query = '';
    if (this._id !== null) {
      query = `MATCH (n:ArticleCategory) WHERE id(n)=${this._id} return n`;
    }
    if (this.label !== null) {
      query = `MATCH (n:ArticleCategory) WHERE n.label="${this.label}" return n`;
    }
    if (this.permalink !== null) {
      query = `MATCH (n:ArticleCategory) WHERE n.permalink="${this.permalink}" return n`;
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
  }

  async makePermalink(label) {
    let permalink = label
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    let category = new ArticleCategory({ permalink: permalink });
    await category.load();
    if (category._id === null) {
      return permalink;
    } else {
      await this.makePermalink(permalink + '-2');
    }
  }

  async save(userId) {
    let validateArticleCategory = this.validate();
    if (!validateArticleCategory.status) {
      return validateArticleCategory;
    } else {
      let session = driver.session();

      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
        this.permalink = await this.makePermalink(this.label);
      } else {
        let original = new ArticleCategory({ _id: this._id });
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
        query = 'CREATE (n:ArticleCategory ' + nodeProperties + ') RETURN n';
      } else {
        query =
          'MATCH (n:ArticleCategory) WHERE id(n)=' +
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

  async countChildren() {
    if (this._id === null) {
      return false;
    }
    let session = driver.session();
    let query = `MATCH (n) WHERE n.parentId="${this._id}" RETURN count(*) AS c`;
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
    this.count = parseInt(count, 10);
  }

  async delete() {
    let session = driver.session();
    await this.countChildren();
    if (parseInt(this.count, 10) > 0) {
      let output = {
        error: true,
        msg: ["You must remove the category's children before deleting"],
        status: false,
        data: [],
      };
      return output;
    }

    let query = `MATCH (n:ArticleCategory) WHERE id(n)=${this._id} DELETE n`;
    let deleteRecord = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        return result;
      });
    let output = {
      error: false,
      msg: ['Item deleted successfully'],
      status: true,
      data: deleteRecord.summary.counters._stats,
    };
    return output;
  }
}
/**
* @api {get} /article-categories Get article categories
* @apiName get article categories
* @apiGroup Article Categories
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"data":[{"createdAt":"2020-01-27T15:55:23.499Z","templatePosition":"","label":"Top Article","_id":"2822","updatedAt":"2020-01-27T17:55:15.742Z","systemLabels":["Article"]},{"createdAt":"2020-01-27T17:43:44.578Z","label":"Bottom Article","templatePosition":"bottom","updatedAt":"2020-01-27T17:43:44.578Z","_id":"2683","systemLabels":["Article"]}]},"error":[],"msg":"Query results"}
*/
const getArticleCategories = async (req, resp) => {
  let session = driver.session();
  let query =
    'MATCH (n:ArticleCategory) WHERE n.parentId=0 RETURN n ORDER BY n.label';
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    });
  let items = helpers.normalizeRecordsOutput(nodesPromise, 'n');
  let data = [];
  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    item.children = await getArticleCategoriesChildren(parseInt(item._id, 10));
    data.push(item);
  }
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

const getArticleCategoriesChildren = async (_id) => {
  let session = driver.session();
  let query = `MATCH (n:ArticleCategory) WHERE n.parentId="${_id}" RETURN n ORDER BY n.label`;
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    });
  let items = helpers.normalizeRecordsOutput(nodesPromise, 'n');
  let data = [];
  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    item.children = await getArticleCategoriesChildren(parseInt(item._id, 10));
    data.push(item);
  }
  return data;
};

/**
* @api {get} /article-category Get article category
* @apiName get article category
* @apiGroup Article Categories
*
* @apiParam {string} _id The _id of the requested article.category

*/
const getArticleCategory = async (req, resp) => {
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
  let label = null;
  let query = null;
  if (typeof parameters._id !== 'undefined' && parameters._id !== '') {
    _id = parameters._id;
    query = { _id: _id };
  }
  if (typeof parameters.label !== 'undefined' && parameters.label !== '') {
    label = parameters.label;
    query = { label: label };
  }
  let content = new ArticleCategory(query);
  await content.load();
  resp.json({
    status: true,
    data: content,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /article-category Put article category
* @apiName put article category
* @apiGroup Articles Categories
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the article category. This should be undefined|null|blank in the creation of a new article category.
* @apiParam {string} label The article category's label.
* @apiParam {number} [parentId] The article category's parentId.
* @apiParam {number} [status] The article category's status.
* @apiExample {json} Example:
* {"createdAt":"2020-01-27T15:55:23.499Z","templatePosition":"","label":"Top Article","_id":"2822","updatedAt":"2020-01-27T17:55:15.742Z"}
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"createdAt":"2020-01-30T14:56:30.780Z","updatedBy":"437","createdBy":"437","label":"test","_id":"2880","category":0,"content":"<p>test content</p>","status":"private","teaser":"<p>test teaser</p>","updatedAt":"2020-01-30T15:00:44.721Z"},"error":[],"msg":"Query results"}
*/
const putArticleCategory = async (req, resp) => {
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
  let articleCategory = new ArticleCategory(postData);
  let output = await articleCategory.save(userId);
  resp.json({
    status: output.status,
    data: output.data,
    error: output.error,
    msg: 'Query results',
  });
};

/**
* @api {delete} /article-category Delete article category
* @apiName delete article category
* @apiGroup Articles Categories
* @apiPermission admin
*
* @apiParam {string} _id The id of the article for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Article) WHERE id(n)=2880 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":3,"high":0}}},"error":[],"msg":"Query results"}
 */
const deleteArticleCategory = async (req, resp) => {
  let postData = req.body;
  let content = new ArticleCategory(postData);
  let output = await content.delete();
  resp.json(output);
};

module.exports = {
  ArticleCategory: ArticleCategory,
  getArticleCategories: getArticleCategories,
  getArticleCategoriesChildren: getArticleCategoriesChildren,
  getArticleCategory: getArticleCategory,
  putArticleCategory: putArticleCategory,
  deleteArticleCategory: deleteArticleCategory,
};
