const driver = require("../../config/db-driver");
const helpers = require("../../helpers");
const sanitizeHtml = require('sanitize-html');
const Canvas = require('canvas');
const fs = require('fs');
const mimeType = require('mime-types')
const formidable = require('formidable');
const path = require('path');
const UploadedFile = require('../uploadedFile.ctrl').UploadedFile;
const ArticleCategory = require('../articleCategory.ctrl').ArticleCategory;
const User = require('../user.ctrl').User;

class Article {
  constructor({_id=null,label=null,permalink=null,category=0,content=null,teaser=null,status='public',featuredImage=null,featuredImageDetails=null,author=null,createdBy=null,createdAt=null,updatedBy=null,updatedAt=null}) {
    this._id = null;
    if (_id!==null) {
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
    this.author = author;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedBy = updatedBy;
    this.updatedAt = updatedAt;
  }

  async load() {
    if (this._id===null && this.permalink===null) {
      return false;
    }
    let query = "";
    if (this._id!==null) {
      query = `MATCH (n:Article) WHERE id(n)=${this._id} AND n.status="public" return n`;
    }
    if (this.permalink!==null) {
      query = `MATCH (n:Article) WHERE n.permalink="${this.permalink}" AND n.status="public" return n`;
    }
    let session = driver.session()
    let node = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      session.close();
      let records = result.records;
      if (records.length>0) {
        let record = records[0];
        let key = record.keys[0];
        let output = record.toObject()[key];
        output = helpers.outputRecord(output);
        return output;
      }
    })
    // assign results to class values
    for (let key in node) {
      this[key] = node[key];
    }
    // populate featured image
    if (typeof this.featuredImage!=="undefined" && this.featuredImage!==null && this.featuredImage!=="") {
      let featuredImageDetails = new UploadedFile({_id:this.featuredImage});
      await featuredImageDetails.load();
      this.featuredImageDetails = featuredImageDetails;
    }
    let author = new User({_id: this.updatedBy});
    await author.load();
    let authorLabel = "";
    if (author.firstName!=="") {
      authorLabel = author.firstName;
    }
    if (author.firstName!=="" && author.lastName!=="") {
      authorLabel += ` ${author.lastName}`;
    }
    this.author = authorLabel;
  }
};

/**
* @api {get} /content-articles Get articles
* @apiName get content articles
* @apiGroup Content Articles
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"currentPage":1,"data":[{"createdAt":"2020-02-26T16:35:27.079Z","updatedBy":"437","featuredImage":"3138","createdBy":"437","_id":"3137","label":"News item 1","category":"3157","permalink":"news-item-1","content":"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>","updatedAt":"2020-02-27T14:29:13.915Z","teaser":"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>","status":"public","systemLabels":["Article"],"featuredImageDetails":{"_id":"3138","filename":"3.jpg","year":2020,"month":2,"hashedName":"27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","paths":[{"path":"http://localhost:5100/uploads/2020/2/images/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","pathType":"source"},{"path":"http://localhost:5100/uploads/2020/2/thumbnails/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","pathType":"thumbnail"}],"createdBy":"437","createdAt":"2020-02-26T16:35:36.685Z","updatedBy":"437","updatedAt":"2020-02-26T16:35:36.685Z"}},{"createdAt":"2020-02-26T16:36:18.249Z","updatedBy":"437","featuredImage":"3138","createdBy":"437","_id":"3139","label":"News item 2","permalink":"news-item-2","category":"3157","content":"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>","updatedAt":"2020-02-27T14:29:49.518Z","teaser":"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>","status":"public","systemLabels":["Article"],"featuredImageDetails":{"_id":"3138","filename":"3.jpg","year":2020,"month":2,"hashedName":"27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","paths":[{"path":"http://localhost:5100/uploads/2020/2/images/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","pathType":"source"},{"path":"http://localhost:5100/uploads/2020/2/thumbnails/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","pathType":"thumbnail"}],"createdBy":"437","createdAt":"2020-02-26T16:35:36.685Z","updatedBy":"437","updatedAt":"2020-02-26T16:35:36.685Z"}},{"createdAt":"2020-02-26T16:36:32.206Z","updatedBy":"437","featuredImage":"3138","createdBy":"437","_id":"3158","label":"News item 3","permalink":"news-item-3","category":"3157","content":"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>","updatedAt":"2020-02-27T14:29:56.433Z","teaser":"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>","status":"public","systemLabels":["Article"],"featuredImageDetails":{"_id":"3138","filename":"3.jpg","year":2020,"month":2,"hashedName":"27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","paths":[{"path":"http://localhost:5100/uploads/2020/2/images/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","pathType":"source"},{"path":"http://localhost:5100/uploads/2020/2/thumbnails/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","pathType":"thumbnail"}],"createdBy":"437","createdAt":"2020-02-26T16:35:36.685Z","updatedBy":"437","updatedAt":"2020-02-26T16:35:36.685Z"}},{"createdAt":"2020-02-26T16:36:53.153Z","updatedBy":"437","featuredImage":"3138","createdBy":"437","_id":"3159","label":"News item 4","category":"3157","permalink":"news-item-4","content":"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>","updatedAt":"2020-02-27T14:30:05.642Z","teaser":"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>","status":"public","systemLabels":["Article"],"featuredImageDetails":{"_id":"3138","filename":"3.jpg","year":2020,"month":2,"hashedName":"27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","paths":[{"path":"http://localhost:5100/uploads/2020/2/images/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","pathType":"source"},{"path":"http://localhost:5100/uploads/2020/2/thumbnails/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","pathType":"thumbnail"}],"createdBy":"437","createdAt":"2020-02-26T16:35:36.685Z","updatedBy":"437","updatedAt":"2020-02-26T16:35:36.685Z"}},{"createdAt":"2020-02-26T16:37:12.836Z","updatedBy":"437","featuredImage":"3138","createdBy":"437","_id":"3160","label":"News item 5","permalink":"news-item-5","category":"3157","content":"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>","updatedAt":"2020-02-27T14:30:11.697Z","teaser":"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>","status":"public","systemLabels":["Article"],"featuredImageDetails":{"_id":"3138","filename":"3.jpg","year":2020,"month":2,"hashedName":"27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","paths":[{"path":"http://localhost:5100/uploads/2020/2/images/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","pathType":"source"},{"path":"http://localhost:5100/uploads/2020/2/thumbnails/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","pathType":"thumbnail"}],"createdBy":"437","createdAt":"2020-02-26T16:35:36.685Z","updatedBy":"437","updatedAt":"2020-02-26T16:35:36.685Z"}},{"createdAt":"2020-02-26T16:37:29.104Z","updatedBy":"437","featuredImage":"3138","createdBy":"437","_id":"3140","label":"News item 6","permalink":"news-item-6","category":"3157","content":"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>","updatedAt":"2020-02-27T14:30:17.972Z","teaser":"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>","status":"public","systemLabels":["Article"],"featuredImageDetails":{"_id":"3138","filename":"3.jpg","year":2020,"month":2,"hashedName":"27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","paths":[{"path":"http://localhost:5100/uploads/2020/2/images/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","pathType":"source"},{"path":"http://localhost:5100/uploads/2020/2/thumbnails/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg","pathType":"thumbnail"}],"createdBy":"437","createdAt":"2020-02-26T16:35:36.685Z","updatedBy":"437","updatedAt":"2020-02-26T16:35:36.685Z"}}],"totalItems":6,"totalPages":1},"error":[],"msg":"Query results"}
*/
const getArticles = async (req, resp) => {
  let parameters = req.query;
  let label = "";
  let categoryId = "";
  let categoryName = "";
  let page = 0;
  let orderField = "label";
  let queryPage = 0;
  let queryOrder = "";
  let limit = 25;

  let query = "";
  let queryParams = "";
  if (typeof parameters.label!=="undefined") {
    label = parameters.label;
    if (label!=="") {
      queryParams +="LOWER(n.label) =~ LOWER('.*"+label+".*') ";
    }
  }
  if (typeof parameters.categoryId!=="undefined") {
    categoryId = parameters.categoryId;
    if (categoryId!=="") {
      queryParams +=`n.category=${categoryId} ` ;
    }
  }
  if (typeof parameters.categoryName!=="undefined") {
    categoryName = parameters.categoryName;
    if (categoryName!=="") {
      let category = new ArticleCategory({label:categoryName});
      await category.load();
      categoryId = category._id;
      queryParams +=`n.category="${categoryId}" ` ;
    }
  }
  if (typeof parameters.orderField!=="undefined") {
    orderField = parameters.orderField;
  }
  if (orderField!=="") {
    queryOrder = "ORDER BY n."+orderField;
    if (typeof parameters.orderDesc!=="undefined" && parameters.orderDesc==="true") {
      queryOrder += " DESC";
    }
  }
  if (typeof parameters.page!=="undefined") {
    page = parseInt(parameters.page,10);
    queryPage = parseInt(parameters.page,10)-1;
  }
  if (typeof parameters.limit!=="undefined") {
    limit = parseInt(parameters.limit,10);
  }
  let currentPage = page;
  if (page===0) {
    currentPage = 1;
  }
  let skip = limit*queryPage;
  if (queryParams!=="") {
    queryParams = "WHERE n.status='public' AND "+queryParams;
  }

  query = "MATCH (n:Article) "+queryParams+" RETURN n "+queryOrder+" SKIP "+skip+" LIMIT "+limit;
  let data = await getArticlesQuery(query, queryParams, limit);
  if (data.error) {
    resp.json({
      status: false,
      data: [],
      error: data.error,
      msg: data.error.message,
    })
  }
  else {
    let responseData = {
      currentPage: currentPage,
      data: data.nodes,
      totalItems: data.count,
      totalPages: data.totalPages,
    }
    resp.json({
      status: true,
      data: responseData,
      error: [],
      msg: "Query results",
    })
  }
}

const getArticlesQuery = async (query, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  }).catch((error) => {
    console.log(error)
  });

  let nodes = helpers.normalizeRecordsOutput(nodesPromise);

  for (let i=0;i<nodes.length; i++) {
    let node = nodes[i];
    if (typeof node.featuredImage!=="undefined" && node.featuredImage!=="") {
      let featuredImageDetails = new UploadedFile({_id:node.featuredImage});
      await featuredImageDetails.load();
      node.featuredImageDetails = featuredImageDetails;
    }
    else node.featuredImageDetails = null;

    let author = new User({_id: node.updatedBy});
    await author.load();
    let authorLabel = "";
    if (author.firstName!=="") {
      authorLabel = author.firstName;
    }
    if (author.firstName!=="" && author.lastName!=="") {
      authorLabel += ` ${author.lastName}`;
    }
    node.author = authorLabel;
  }


  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Article) "+queryParams+" RETURN count(*)")
  )
  .then(result=> {
    session.close();
    let resultRecord = result.records[0];
    let countObj = resultRecord.toObject();
    helpers.prepareOutput(countObj);
    let output = countObj['count(*)'];
    return parseInt(output,10);
  });
  let totalPages = Math.ceil(count/limit)
  let result = {
    nodes: nodes,
    count: count,
    totalPages: totalPages
  }
  return result;
}

/**
* @api {get} /content-article Get article
* @apiName get content article
* @apiGroup Content Articles
*
* @apiParam {string} [_id] The _id of the requested article.
* @apiParam {string} [permalink] The permalink of the requested article.

*/
const getArticle = async(req, resp) => {
  let parameters = req.query;
  if ((typeof parameters._id==="undefined" || parameters._id==="") && (typeof parameters.permalink==="undefined" || parameters.permalink==="")) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id to continue.",
    });
    return false;
  }
  let _id=null;
  let permalink=null;
  let query = null;
  if (typeof parameters._id!=="undefined" && parameters._id!=="") {
    _id = parameters._id;
    query = {_id: _id};
  }
  if (typeof parameters.permalink!=="undefined" && parameters.permalink!=="") {
    permalink = parameters.permalink;
    query = {permalink: permalink};
  }
  let content = new Article(query);
  await content.load();
  if (content._id!==null) {
    let categories = await getArticleCategoryTree(content.category);
    categories.reverse();
    content.categories = categories;
    resp.json({
      status: true,
      data: content,
      error: [],
      msg: "Query results",
    });
  }
  else {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "This article is not available",
    });
  }
}

async function getArticleCategoryTree(_id) {
  if (_id===0) {
    return [];
  }
  let tree = [];
  let category = new ArticleCategory({_id:_id});
  await category.load();
  tree.push(category);
  if (category.parentId>0) {
    let parent = await getArticleCategoryTree(category.parentId);
    tree = [...tree, ...parent];
  }
  return tree;
}

async function getArticleCategoryChildrenTree(_id) {
  let children = [];
  let query = `MATCH (n:ArticleCategory) WHERE n.parentId="${_id}" return n`;
  let session = driver.session()
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    return result.records;
  })
  let nodes = helpers.normalizeRecordsOutput(nodesPromise, "n");
  for (let i=0;i<nodes.length; i++) {
    let node = nodes[i];
    let nodeChildren = await getArticleCategoryChildrenTree(node._id);
    node.children_categories = nodeChildren;
  }
  children = [...nodes, ...children];
  return children;
}

const getArticleCategory = async(req, resp)  => {
  let parameters = req.query;
  let label = "";
  let categoryId = "";
  let permalink = "";
  let page = 0;
  let orderField = "label";
  let queryPage = 0;
  let queryOrder = "";
  let limit = 25;

  let query = "";
  let queryParams = "";
  if (typeof parameters.label!=="undefined") {
    label = parameters.label;
    if (label!=="") {
      queryParams +="LOWER(n.label) =~ LOWER('.*"+label+".*') ";
    }
  }
  if (typeof parameters.categoryId!=="undefined") {
    categoryId = parameters.categoryId;
    if (categoryId!=="") {
      queryParams +=`n.category=${categoryId} ` ;
    }
  }
  if (typeof parameters.permalink!=="undefined") {
    permalink = parameters.permalink;
  }
  // 1. load category details
  let categoryQuery = {_id: categoryId};
  if (permalink!=="") {
    categoryQuery = {permalink: permalink};
  }
  let category = new ArticleCategory(categoryQuery);
  await category.load();
  let categories = await getArticleCategoryTree(category._id);
  categories.reverse();
  category.categories = categories;
  category.children_categories = await getArticleCategoryChildrenTree(category._id);
  categoryId = category._id;
  queryParams +=`n.category="${categoryId}" ` ;

  if (typeof parameters.orderField!=="undefined") {
    orderField = parameters.orderField;
  }
  if (orderField!=="") {
    queryOrder = "ORDER BY n."+orderField;
    if (typeof parameters.orderDesc!=="undefined" && parameters.orderDesc==="true") {
      queryOrder += " DESC";
    }
  }
  if (typeof parameters.page!=="undefined") {
    page = parseInt(parameters.page,10);
    queryPage = parseInt(parameters.page,10)-1;
  }
  if (typeof parameters.limit!=="undefined") {
    limit = parseInt(parameters.limit,10);
  }
  let currentPage = page;
  if (page===0) {
    currentPage = 1;
  }
  let skip = limit*queryPage;
  if (queryParams!=="") {
    queryParams = "WHERE n.status='public' AND "+queryParams;
  }

  query = "MATCH (n:Article) "+queryParams+" RETURN n "+queryOrder+" SKIP "+skip+" LIMIT "+limit;
  let data = await getArticlesQuery(query, queryParams, limit);
  if (data.error) {
    resp.json({
      status: false,
      data: [],
      error: data.error,
      msg: data.error.message,
    })
  }
  else if (category.status!=="public") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "This content category is private.",
    })
  }
  else {
    let responseData = {
      currentPage: currentPage,
      data: {
        category: category,
        articles: data.nodes
      },
      totalItems: data.count,
      totalPages: data.totalPages,
    }
    resp.json({
      status: true,
      data: responseData,
      error: [],
      msg: "Query results",
    })
  }
}

const getHighlights = async(req, resp) => {
  let parameters = req.query;
  let page = 0;
  let limit = 25;
  let queryPage = 0;
  if (typeof parameters.page!=="undefined") {
    page = parseInt(parameters.page,10);
    queryPage = parseInt(parameters.page,10)-1;
    if (queryPage===-1) queryPage = 0;
  }
  if (typeof parameters.limit!=="undefined") {
    limit = parseInt(parameters.limit,10);
  }
  let currentPage = page;
  if (page===0) {
    currentPage = 1;
  }
  let skip = limit*queryPage;
  let query = `MATCH (n:Article) WHERE n.status='public' AND n.highlight=true RETURN n ORDER BY n.highlightOrder SKIP ${skip} LIMIT ${limit}`
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    return result.records;
  }).catch((error) => {
    console.log(error)
  });
  let nodes = helpers.normalizeRecordsOutput(nodesPromise);
  for (let i=0;i<nodes.length; i++) {
    let node = nodes[i];
    if (typeof node.featuredImage!=="undefined" && node.featuredImage!=="") {
      let featuredImageDetails = new UploadedFile({_id:node.featuredImage});
      await featuredImageDetails.load();
      node.featuredImageDetails = featuredImageDetails;
    }
    else node.featuredImageDetails = null;

    let author = new User({_id: node.updatedBy});
    await author.load();
    let authorLabel = "";
    if (author.firstName!=="") {
      authorLabel = author.firstName;
    }
    if (author.firstName!=="" && author.lastName!=="") {
      authorLabel += ` ${author.lastName}`;
    }
    node.author = authorLabel;
  }
  resp.json({
    status: true,
    data: nodes,
    error: [],
    msg: "Query results",
  });
}

module.exports = {
  Article: Article,
  getArticles: getArticles,
  getArticle: getArticle,
  getArticleCategory: getArticleCategory,
  getHighlights: getHighlights,
};
