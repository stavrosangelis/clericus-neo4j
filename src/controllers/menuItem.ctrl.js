const driver = require('../config/db-driver');
const helpers = require('../helpers');

class MenuItem {
  constructor({
    _id = null,
    menuId = null,
    label = null,
    order = 0,
    parentId = 0,
    type = null,
    objectId = null,
    link = null,
    target = null,
    accessGroup = [],
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
    this.menuId = menuId;
    this.label = label !== null ? label.toString() : label;
    this.order = parseInt(order, 10);
    this.parentId = parseInt(parentId, 10);
    this.type = type;
    this.objectId = objectId;
    this.link = link;
    this.target = target;
    this.accessGroup = accessGroup;
    this.status = status;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedBy = updatedBy;
    this.updatedAt = updatedAt;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.menuId === null) {
      status = false;
      errors.push({ field: 'menuId', msg: 'The menuId must not be empty' });
    }
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
    let query = 'MATCH (n:MenuItem) WHERE id(n)=' + this._id + ' return n';
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

  async save(userId) {
    let validateMenuItem = this.validate();
    if (!validateMenuItem.status) {
      return validateMenuItem;
    } else {
      let session = driver.session();

      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
      } else {
        let original = new MenuItem({ _id: this._id });
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
        query = 'CREATE (n:MenuItem ' + nodeProperties + ') RETURN n';
      } else {
        query =
          'MATCH (n:MenuItem) WHERE id(n)=' +
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
    let query =
      'MATCH (n:MenuItem) WHERE n.parentId=' +
      this._id +
      ' RETURN count(*) AS c';
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
    await this.countChildren();
    if (parseInt(this.count, 10) > 0) {
      let output = {
        error: true,
        msg: ["You must remove the menu item's children before deleting"],
        status: false,
        data: [],
      };
      return output;
    }
    let query = 'MATCH (n:MenuItem) WHERE id(n)=' + this._id + ' DELETE n';
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
* @api {get} /menuItems Get menuItems
* @apiName get menuItems
* @apiGroup MenuItems
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":[{"link":"/","menuId":"2822","label":"Home","_id":"2855","type":"link","objectId":0,"parentId":0,"updatedAt":"2020-01-28T15:51:33.266Z","order":0,"target":"","status":"private","systemLabels":["MenuItem"]},{"link":"","menuId":"2822","_id":"2877","label":"Test","type":"link","objectId":0,"parentId":2837,"updatedAt":"2020-01-29T14:23:21.702Z","order":0,"target":"","status":"private","systemLabels":["MenuItem"]},{"link":"","menuId":"2822","_id":"2897","label":"Research","type":"link","objectId":0,"parentId":0,"updatedAt":"2020-01-29T14:23:37.715Z","order":0,"target":"","status":"private","systemLabels":["MenuItem"]},{"createdAt":"2020-01-29T11:39:59.209Z","link":"","menuId":"2822","label":"test 2","type":"link","objectId":0,"parentId":2877,"updatedAt":"2020-01-29T11:39:59.209Z","order":0,"target":"","status":"private","_id":"2935","systemLabels":["MenuItem"]},{"link":"","menuId":"2822","_id":"2837","label":"About","type":"link","objectId":0,"parentId":2855,"updatedAt":"2020-01-29T12:40:10.551Z","order":1,"target":"","status":"private","systemLabels":["MenuItem"]}],"error":[],"msg":"Query results"}
*/
const getMenuItems = async (req, resp) => {
  let session = driver.session();
  let query = 'MATCH (n:MenuItem) RETURN n ORDER BY n.order, n._id';
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    });
  let data = helpers.normalizeRecordsOutput(nodesPromise);
  if (nodesPromise.error) {
    resp.json({
      status: false,
      data: [],
      error: nodesPromise.error,
      msg: nodesPromise.error.message,
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
* @api {get} /menuItem Get menuItem
* @apiName get menuItem
* @apiGroup MenuItems
*
* @apiParam {string} _id The _id of the requested menuItem. Either the _id or the systemType should be provided.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"2855","menuId":"2822","label":"Home","order":0,"parentId":0,"type":"link","objectId":0,"link":"/","target":"","status":"private","createdBy":null,"createdAt":null,"updatedBy":null,"updatedAt":"2020-01-28T15:51:33.266Z"},"error":[],"msg":"Query results"}
*/
const getMenuItem = async (req, resp) => {
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
  let menuItem = new MenuItem(query);
  await menuItem.load();
  resp.json({
    status: true,
    data: menuItem,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /menuItem Put menuItem
* @apiName put menuItem
* @apiGroup MenuItems
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the menu item. This should be undefined|null|blank in the creation of a new menu item.
* @apiParam {string} [menuId] The _id of the menu this menu item belongs to.
* @apiParam {string} label The menuItem's label.
* @apiParam {number} [order=0] The order of the menu item.
* @apiParam {number} [parentId=0] The hierarchical parent menu item of this menu item.
* @apiParam {string} [type=article|category|link] The type of the menu item.
* @apiParam {string} [objectId] If the type of the menu item is article or category, the article or category id.
* @apiParam {string} [link] If the type of the menu item is link the link URL.
* @apiParam {string} [target] If the type of the menu item is link and the link is an external link target should be set to "_blank".
* @apiParam {array} [accessGroup] If the menu item is only visible to certain access groups.
* @apiParam {string} [status='private'] The status of the  menu item.
* @apiExample {json} Example:
* {
  "label":"Test",
  "description":"test description"
}
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"createdAt":"2020-01-15T12:56:39.387Z","updatedBy":"260","labelId":"Test","createdBy":"260","systemType":"test","description":"","label":"Test","locked":false,"updatedAt":"2020-01-15T12:56:39.387Z","_id":"2480"},"error":[],"msg":"Query results"}*/
const putMenuItem = async (req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The menuItem must not be empty',
    });
    return false;
  }
  let userId = req.decoded.id;
  let menuItem = new MenuItem(postData);
  let output = await menuItem.save(userId);
  resp.json({
    status: output.status,
    data: output.data,
    error: output.error,
    msg: 'Query results',
  });
};

/**
* @api {delete} /menuItem Delete menuItem
* @apiName delete menuItem
* @apiGroup MenuItems
* @apiPermission admin
*
* @apiParam {string} _id The id of the menuItem for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:MenuItem) WHERE id(n)=2480 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":1,"high":0}}},"error":[],"msg":"Query results"}*/
const deleteMenuItem = async (req, resp) => {
  let postData = req.body;
  let menuItem = new MenuItem(postData);
  let output = await menuItem.delete();
  resp.json(output);
};
module.exports = {
  MenuItem: MenuItem,
  getMenuItems: getMenuItems,
  getMenuItem: getMenuItem,
  putMenuItem: putMenuItem,
  deleteMenuItem: deleteMenuItem,
};
