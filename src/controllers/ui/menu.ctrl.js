const driver = require("../../config/db-driver");
const helpers = require("../../helpers");

class Menu {
  constructor({_id=null,label=null,templatePosition=null,items=[]}) {
    this._id = _id;
    this.label = label;
    this.templatePosition = templatePosition;
    this.items = items;
  }

  async load() {
    if (this.templatePosition===null) {
      return false;
    }
    let query = `MATCH (n:Menu) WHERE n.templatePosition="${this.templatePosition}" return n`;
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
  }
};

/**
* @api {get} /menu Get menu
* @apiName get menu
* @apiGroup Menus
*
* @apiParam {string} _id The _id of the requested menu. Either the _id or the systemType should be provided.

*/
const getMenu = async(req, resp) => {
  let parameters = req.query;
  if (typeof parameters.templatePosition==="undefined" || parameters.templatePosition==="") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid position to continue.",
    });
    return false;
  }
  let templatePosition=null;
  if (typeof parameters.templatePosition!=="undefined" && parameters.templatePosition!=="") {
    templatePosition = parameters.templatePosition;
  }
  let query = {templatePosition: templatePosition};
  let menu = new Menu(query);
  await menu.load();
  menu.items = await getMenuItems(menu._id);
  resp.json({
    status: true,
    data: menu,
    error: [],
    msg: "Query results",
  });
}

const getMenuItems = async(_id) =>{
  let session = driver.session();
  let query = `MATCH (n:MenuItem) WHERE n.menuId="${_id}" AND n.parentId=0 AND n.status="public" RETURN n ORDER BY n.order, n._id`;
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    return result.records;
  })
  let items = helpers.normalizeRecordsOutput(nodesPromise, "n");
  let menuItems = [];
  for (let i=0; i<items.length; i++) {
    let item = items[i];
    item.children = await getMenuItemChildren(parseInt(item._id,10));
    menuItems.push(item);
  }
  return menuItems;
}

const getMenuItemChildren = async(_id) =>{
  let session = driver.session();
  let query = `MATCH (n:MenuItem) WHERE n.parentId=${_id} AND n.status="public" RETURN n ORDER BY n.order, n._id`;
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    return result.records;
  })
  let items = helpers.normalizeRecordsOutput(nodesPromise, "n");
  let menuItems = [];
  for (let i=0; i<items.length; i++) {
    let item = items[i];
    item.children = await getMenuItemChildren(parseInt(item._id,10));
    menuItems.push(item);
  }
  return menuItems;
}

module.exports = {
  getMenu: getMenu
};
