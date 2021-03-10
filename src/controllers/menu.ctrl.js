const driver = require('../config/db-driver');
const helpers = require('../helpers');

class Menu {
  constructor({
    _id = null,
    label = null,
    templatePosition = null,
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
    this.templatePosition = templatePosition;
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
    let query = 'MATCH (n:Menu) WHERE id(n)=' + this._id + ' return n';
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
    let validateMenu = this.validate();
    if (!validateMenu.status) {
      return validateMenu;
    } else {
      let session = driver.session();

      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
      } else {
        let original = new Menu({ _id: this._id });
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
        query = 'CREATE (n:Menu ' + nodeProperties + ') RETURN n';
      } else {
        query =
          'MATCH (n:Menu) WHERE id(n)=' +
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

  async countMenuItems() {
    if (this._id === null) {
      return false;
    }
    let session = driver.session();
    let query = `MATCH (n:MenuItem) WHERE n.menuId="${this._id}" RETURN count(*) AS c`;
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
    await this.countMenuItems();
    if (this.count > 0) {
      let output = {
        error: true,
        msg: ["You must remove the menu's items before deleting"],
        status: false,
        data: [],
      };
      return output;
    }
    let query = `MATCH (n:Menu) WHERE id(n)=${this._id} DELETE n`;
    let deleteRecord = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        return result;
      });
    let output = {
      error: false,
      msg: ['Menu deleted successfully'],
      status: true,
      data: deleteRecord.summary.counters._stats,
    };
    return output;
  }
}
/**
* @api {get} /menus Get menus
* @apiName get menus
* @apiGroup Menus
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"data":[{"createdAt":"2020-01-27T15:55:23.499Z","templatePosition":"","label":"Top Menu","_id":"2822","updatedAt":"2020-01-27T17:55:15.742Z","systemLabels":["Menu"]},{"createdAt":"2020-01-27T17:43:44.578Z","label":"Bottom Menu","templatePosition":"bottom","updatedAt":"2020-01-27T17:43:44.578Z","_id":"2683","systemLabels":["Menu"]}]},"error":[],"msg":"Query results"}
*/
const getMenus = async (req, resp) => {
  let session = driver.session();
  let query = 'MATCH (n:Menu) RETURN n ORDER BY n._id';
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
      data: {
        data: data,
      },
      error: [],
      msg: 'Query results',
    });
  }
};

/**
* @api {get} /menu Get menu
* @apiName get menu
* @apiGroup Menus
*
* @apiParam {string} _id The _id of the requested menu. Either the _id or the systemType should be provided.

*/
const getMenu = async (req, resp) => {
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
  let menu = new Menu(query);
  await menu.load();
  menu.menuItems = await getMenuItems(menu._id);
  resp.json({
    status: true,
    data: menu,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /menu Put menu
* @apiName put menu
* @apiGroup Menus
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the menu. This should be undefined|null|blank in the creation of a new menu.
* @apiParam {string} label The menu's label.
* @apiParam {string} [templatePosition] The name of the position in the UI template that will hold the menu.
* @apiExample {json} Example:
* {"createdAt":"2020-01-27T15:55:23.499Z","templatePosition":"","label":"Top Menu","_id":"2822","updatedAt":"2020-01-27T17:55:15.742Z"}
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"createdAt":"2020-01-27T15:55:23.499Z","label":"Top Menu","_id":"2822","templatePosition":"","updatedAt":"2020-01-28T09:39:20.981Z"},"error":[],"msg":"Query results"}
*/
const putMenu = async (req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The menu must not be empty',
    });
    return false;
  }
  let userId = req.decoded.id;
  let menu = new Menu(postData);
  let output = await menu.save(userId);
  resp.json({
    status: output.status,
    data: output.data,
    error: output.error,
    msg: 'Query results',
  });
};

/**
* @api {delete} /menu Delete menu
* @apiName delete menu
* @apiGroup Menus
* @apiPermission admin
*
* @apiParam {string} _id The id of the menu for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Menu) WHERE id(n)=2480 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":1,"high":0}}},"error":[],"msg":"Query results"}*/
const deleteMenu = async (req, resp) => {
  let postData = req.body;
  let menu = new Menu(postData);
  let output = await menu.delete();
  resp.json(output);
};

const getMenuItems = async (_id) => {
  let session = driver.session();
  let query = `MATCH (n:MenuItem) WHERE n.menuId="${_id}" AND n.parentId=0 RETURN n ORDER BY n.order, n._id`;
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    });
  let items = helpers.normalizeRecordsOutput(nodesPromise, 'n');
  let menuItems = [];
  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    item.children = await getMenuItemChildren(parseInt(item._id, 10));
    menuItems.push(item);
  }
  return menuItems;
};

const getMenuItemChildren = async (_id) => {
  let session = driver.session();
  let query = `MATCH (n:MenuItem) WHERE n.parentId=${_id} RETURN n ORDER BY n.order, n._id`;
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    });
  let items = helpers.normalizeRecordsOutput(nodesPromise, 'n');
  let menuItems = [];
  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    item.children = await getMenuItemChildren(parseInt(item._id, 10));
    menuItems.push(item);
  }
  return menuItems;
};

module.exports = {
  Menu: Menu,
  getMenus: getMenus,
  getMenu: getMenu,
  getMenuItems: getMenuItems,
  putMenu: putMenu,
  deleteMenu: deleteMenu,
};
