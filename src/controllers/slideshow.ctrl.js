const driver = require('../config/db-driver');
const helpers = require('../helpers');
const UploadedFile = require('./uploadedFile.ctrl').UploadedFile;

class Slideshow {
  constructor({
    _id = null,
    label = null,
    caption = 0,
    order = null,
    url = null,
    status = 'private',
    image = null,
    imageDetails = null,
    createdBy = null,
    createdAt = null,
    updatedBy = null,
    updatedAt = null,
  }) {
    this._id = null;
    if (_id !== null) {
      this._id = _id;
    }
    this.label = label !== null ? label.toString() : label;
    this.caption = caption;
    this.order = order;
    this.url = url;
    this.status = status;
    this.image = image;
    this.imageDetails = imageDetails;
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
    if (this._id === null) {
      return false;
    }
    let query = `MATCH (n:Slideshow) WHERE id(n)=${this._id} return n`;
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
      this.image !== null &&
      typeof this.image !== 'undefined' &&
      this.image !== ''
    ) {
      let imageDetails = new UploadedFile({ _id: this.image });
      await imageDetails.load();
      this.imageDetails = imageDetails;
    } else this.imageDetails = null;
  }

  async save(userId) {
    let validateSlideshow = this.validate();
    if (!validateSlideshow.status) {
      return validateSlideshow;
    } else {
      let session = driver.session();

      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
      } else {
        let original = new Slideshow({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      this.order = parseInt(this.order, 10);
      let nodeProperties = helpers.prepareNodeProperties(this);
      let params = helpers.prepareParams(this);
      let query = '';
      if (typeof this._id === 'undefined' || this._id === null) {
        query = `CREATE (n:Slideshow ${nodeProperties}) RETURN n`;
      } else {
        query = `MATCH (n:Slideshow) WHERE id(n)=${this._id} SET n=${nodeProperties} RETURN n;`;
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
    let query = `MATCH (n)-[r]->() WHERE id(n)=${this._id} RETURN count(*) AS c`;
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

    let query = `MATCH (n:Slideshow) WHERE id(n)=${this._id} DELETE n`;
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
* @api {get} /slideshow-items Get slideshow items
* @apiName get slideshow items
* @apiGroup Slideshow
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"data":[{"createdAt":"2020-02-19T12:11:02.733Z","image":"3079","updatedBy":"437","createdBy":"437","caption":"caption 2","_id":"3046","label":"test 2","url":"http://google.com","updatedAt":"2020-02-26T12:27:15.260Z","status":"private","order":"1","systemLabels":["Slideshow"],"imageDetails":{"_id":"3079","filename":"slideshow.jpg","year":2020,"month":2,"hashedName":"5889d821aae8cf508f1b12b030dc62fd.jpg","paths":[{"path":"http://localhost:5100/uploads/2020/2/images/5889d821aae8cf508f1b12b030dc62fd.jpg","pathType":"source"},{"path":"http://localhost:5100/uploads/2020/2/thumbnails/5889d821aae8cf508f1b12b030dc62fd.jpg","pathType":"thumbnail"}],"createdBy":"437","createdAt":"2020-02-26T12:27:09.950Z","updatedBy":"437","updatedAt":"2020-02-26T12:27:09.950Z"}},{"createdAt":"2020-02-19T12:10:43.691Z","image":"2942","updatedBy":"437","createdBy":"437","caption":"test caption","label":"test","url":"http://www.google.gr","updatedAt":"2020-02-19T12:10:43.691Z","order":0,"status":"private","_id":"2876","systemLabels":["Slideshow"],"imageDetails":{"_id":"2942","filename":"IMG_20200218_145701.jpg","year":2020,"month":2,"hashedName":"64fead2233879c89f47d8358530d1d41.jpg","paths":[{"path":"http://localhost:5100/uploads/2020/2/images/64fead2233879c89f47d8358530d1d41.jpg","pathType":"source"},{"path":"http://localhost:5100/uploads/2020/2/thumbnails/64fead2233879c89f47d8358530d1d41.jpg","pathType":"thumbnail"}],"createdBy":"437","createdAt":"2020-02-18T16:01:16.685Z","updatedBy":"437","updatedAt":"2020-02-18T16:01:16.685Z"}}],"totalItems":2},"error":[],"msg":"Query results"}
*/
const getSlideshowItems = async (req, resp) => {
  let parameters = req.query;
  let label = '';
  let status = '';

  let query = '';
  let queryParams = '';
  if (typeof parameters.label !== 'undefined') {
    label = parameters.label;
    if (label !== '') {
      queryParams += "toLower(n.label) =~ toLower('.*" + label + ".*') ";
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
  if (queryParams !== '') {
    queryParams = 'WHERE ' + queryParams;
  }

  query = `MATCH (n:Slideshow) ${queryParams} RETURN n ORDER BY n.order`;
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
  let length = nodes.length;
  for (let n = 0; n < length; n++) {
    let node = nodes[n];
    // populate featured image
    node.imageDetails = null;
    if (typeof node.image !== 'undefined' && node.image !== '') {
      let imageDetails = new UploadedFile({ _id: node.image });
      await imageDetails.load();
      node.imageDetails = imageDetails;
    }
  }
  resp.json({
    status: true,
    data: {
      data: nodes,
      totalItems: nodes.length,
    },
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {get} /slideshow-item Get slideshow item
* @apiName get slideshow item
* @apiGroup Slideshow
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"3046","label":"test 2","caption":"caption 2","order":"1","url":"http://google.com","status":"private","image":"3079","imageDetails":{"_id":"3079","filename":"slideshow.jpg","year":2020,"month":2,"hashedName":"5889d821aae8cf508f1b12b030dc62fd.jpg","paths":[{"path":"http://localhost:5100/uploads/2020/2/images/5889d821aae8cf508f1b12b030dc62fd.jpg","pathType":"source"},{"path":"http://localhost:5100/uploads/2020/2/thumbnails/5889d821aae8cf508f1b12b030dc62fd.jpg","pathType":"thumbnail"}],"createdBy":"437","createdAt":"2020-02-26T12:27:09.950Z","updatedBy":"437","updatedAt":"2020-02-26T12:27:09.950Z"},"createdBy":"437","createdAt":"2020-02-19T12:11:02.733Z","updatedBy":"437","updatedAt":"2020-02-26T12:27:15.260Z"},"error":[],"msg":"Query results"}
*
* @apiParam {string} _id The _id of the requested slideshow item.

*/
const getSlideshowItem = async (req, resp) => {
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
  let item = new Slideshow(query);
  await item.load();
  resp.json({
    status: true,
    data: item,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /slideshow-item Put slideshow item
* @apiName put slideshow item
* @apiGroup Slideshow
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the slideshow item. This should be undefined|null|blank in the creation of a new slideshow item.
* @apiParam {string} label The slideshow item's label.
* @apiParam {string} [caption] The slideshow item's caption.
* @apiParam {string} [url] The slideshow item's url.
* @apiParam {number} [order] The slideshow item's order.
* @apiParam {string} [status='private'] The slideshow item's status.
* @apiParam {number} [image] The slideshow item's image id.
* @apiExample {json} Example:
*{"_id":"3046","label":"test 2","caption":"caption 2","order":"1","url":"http://google.com","status":"private","image":"3079"}
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"3046","label":"test 2","caption":"caption 2","order":"1","url":"http://google.com","status":"private","image":"3079","imageDetails":{"_id":"3079","filename":"slideshow.jpg","year":2020,"month":2,"hashedName":"5889d821aae8cf508f1b12b030dc62fd.jpg","paths":[{"path":"http://localhost:5100/uploads/2020/2/images/5889d821aae8cf508f1b12b030dc62fd.jpg","pathType":"source"},{"path":"http://localhost:5100/uploads/2020/2/thumbnails/5889d821aae8cf508f1b12b030dc62fd.jpg","pathType":"thumbnail"}],"createdBy":"437","createdAt":"2020-02-26T12:27:09.950Z","updatedBy":"437","updatedAt":"2020-02-26T12:27:09.950Z"},"createdBy":"437","createdAt":"2020-02-19T12:11:02.733Z","updatedBy":"437","updatedAt":"2020-03-03T11:07:37.507Z"},"error":[],"msg":"Query results"}
*/
const putSlideshowItem = async (req, resp) => {
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
  let item = new Slideshow(postData);
  let output = await item.save(userId);
  resp.json({
    status: output.status,
    data: output.data,
    error: output.error,
    msg: 'Query results',
  });
};

/**
* @api {delete} /slideshow-item Delete slideshow item
* @apiName delete slideshow item
* @apiGroup Slideshow
* @apiPermission admin
*
* @apiParam {string} _id The id of the slideshow item for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Slideshow) WHERE id(n)=3193 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":50,"high":0}}},"error":[],"msg":"Query results"}
 */
const deleteSlideshowItem = async (req, resp) => {
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
  let item = new Slideshow({ _id });
  const { data = null, error = [], status = true } = await item.delete();
  return resp.status(200).json({
    status,
    data,
    error,
    msg: '',
  });
};

module.exports = {
  Slideshow,
  getSlideshowItems,
  getSlideshowItem,
  putSlideshowItem,
  deleteSlideshowItem,
};
