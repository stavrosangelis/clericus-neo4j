const driver = require("../config/db-driver");
const helpers = require("../helpers");

class Entity {
  constructor({_id=null,label=null,labelId=null,locked=false,definition=null,example=null, parent=null}) {
    if (_id!==null) {
      this._id = _id;
    }
    this.label = label;
    this.labelId = labelId;
    this.locked = locked;
    this.definition = definition;
    this.example = example;
    this.parent = parent;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.label==="") {
      status = false;
      errors.push({field: "label", msg: "The label must not be empty"});
    }
    if (this.labelId==="") {
      status = false;
      errors.push({field: "labelId", msg: "The labelId must not be empty"});
    }
    if (this.labelId==="") {
      status = false;
      errors.push({field: "labelId", msg: "The labelId must not be empty"});
    }
    if (this.definition==="") {
      status = false;
      errors.push({field: "definition", msg: "The definition must not be empty"});
    }

    let msg = "The record is valid";
    if (!status) {
      msg = "The record is not valid";
    }
    let output = {
      status: status,
      msg: msg,
      errors: errors
    }
    return output;
  }

  async load() {
    if (this._id===null) {
      return false;
    }
    let session = driver.session()
    let query = "MATCH (n:Entity) WHERE id(n)="+this._id+" RETURN n";
    let node = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      session.close();
      let records = result.records;
      if (records.length>0) {
        let record = records[0].toObject();
        let outputRecord = helpers.outputRecord(record.n);
        return outputRecord;
      }
    });
    // assign results to class values
    for (let key in node) {
      this[key] = node[key];
    }
    // load properties
    this.properties = await this.loadProperties();
  }

  async loadByLabelId() {
    if (this.labelId===null) {
      return false;
    }
    let session = driver.session();
    let query = "MATCH (n:Entity {labelId: '"+this.labelId+"'}) return n";
    let node = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      session.close();
      let records = result.records;
      if (records.length>0) {
        let record = records[0].toObject();
        let outputRecord = helpers.outputRecord(record.n);
        return outputRecord;
      }
    });
    // assign results to class values
    for (let key in node) {
      this[key] = node[key];
    }
    // load properties
    this.properties = await this.loadProperties();
  }

  async loadProperties() {
    let session = driver.session()
    let query = "MATCH (n:Entity)-[r]->(re:Entity) WHERE id(n)="+this._id+" RETURN n,r,re";
    let relations = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      session.close();
      let records = result.records;
      if (records.length>0) {
        let properties = prepareRelations(records)
        return properties;
      }
      else return [];
    })
    return relations;
  }

  async save() {
    let validateEntity = this.validate();
    if (!validateEntity.status) {
      return validateEntity;
    }
    else {
      let session = driver.session();
      // normalize label id
      if (typeof this._id==="undefined" || this._id===null && this.labelId===null) {
        this.labelId = helpers.normalizeLabelId(this.label);
      }
      let nodeProperties = helpers.prepareNodeProperties(this);
      let params = helpers.prepareParams(this);

      let query = "";
      if (typeof this._id==="undefined" || this._id===null) {
        query = "CREATE (n:Entity "+nodeProperties+") RETURN n";
      }
      else {
        query = "MATCH (n:Entity) WHERE id(n)="+this._id+" AND n.locked=false SET n="+nodeProperties+" RETURN n";
      }
      let updateResult = await session.run(
          query,
          params
        )
        .then(result => {
          session.close();
          let output = {error: ["The record cannot be updated"], status: false, data: []};
          let records = result.records;
          if (records.length>0) {
            let outputRecord = records[0].toObject();
            helpers.prepareOutput(outputRecord);
            let output = {error: [], status: true, data: outputRecord};
          }
          return output;
        });
      return updateResult;
    }
  }

  async delete() {
    let session = driver.session()
    let queryRel = "MATCH (n:Entity)-[r]->() WHERE id(n)="+this._id+" AND n.locked=false DELETE r";
    let queryNode = "MATCH (n:Entity) WHERE id(n)="+this._id+"  AND n.locked=false DELETE n"
    let deleteRel = await session.writeTransaction(tx=>
      tx.run(queryRel,{})
    )
    .then(async result=> {
      session.close();
      return result;
    });
    let deleteNode = await session.writeTransaction(tx=>
      tx.run(queryNode,{})
    )
    .then(async result=> {
      session.close();
      return result;
    });
    return {relations: deleteRel.summary.counters._stats, node: deleteNode.summary.counters._stats};
  }

};

const getEntities = async (req, resp) => {
  let parameters = req.query;
  let page = 0;
  let queryPage = 0;
  let limit = 25;

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

  let skip = limit*page;
  let query = "MATCH (n:Entity) RETURN n ORDER BY n.label";
  let data = await getEntitiesQuery(query, limit);
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

const prepareRelations = (records) => {
  let relations = [];
  for (let key in records) {
    let record = records[key].toObject();
    let sourceItem = helpers.outputRecord(record.n);
    let relation = record.r;
    helpers.prepareOutput(relation);
    let targetItem = helpers.outputRecord(record.re);
    let newRelation = prepareRelation(sourceItem, relation, targetItem);
    relations.push(newRelation);
  }
  return relations;
}
const prepareRelation = (sourceItem, relation, targetItem) => {
  let newProperty = {
    _id: relation.identity,
    term: {
      label: relation.type,
    },
    entityRef: {
      _id: targetItem._id,
      label: targetItem.label
    }
  }
  return newProperty;
}

const getEntitiesQuery = async (query, limit) => {
  let session = driver.session();
  let nodes = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    let records = result.records;
    let outputRecords = helpers.normalizeRecordsOutput(records);
    return outputRecords;
  });

  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Entity) RETURN count(*)")
  )
  .then(result=> {
    session.close()
    let resultRecord = result.records[0];
    let countObj = resultRecord.toObject();
    helpers.prepareOutput(countObj);
    let output = countObj['count(*)'];
    return output;
  });
  let totalPages = Math.ceil(count/limit)
  let result = {
    nodes: nodes,
    count: count,
    totalPages: totalPages
  }
  return result;
}

const getEntity = async(req, resp) => {
  let parameters = req.query;
  if (
    (typeof parameters._id==="undefined" || parameters._id==="") &&
    (typeof parameters.labelId==="undefined" || parameters.labelId==="")
  ) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id or a valid label to continue.",
    });
  }
  let _id = parameters._id;
  let entity = null;
    if (typeof parameters._id!=="undefined" && parameters._id!=="") {
      let _id = parameters._id;
      entity = new Entity({_id:_id});
      await entity.load();
    }
    else if (typeof parameters.labelId!=="undefined" && parameters.labelId!=="") {
      let labelId = parameters.labelId;
      entity = new Entity({labelId:labelId});
      await entity.loadByLabelId();
    }
  resp.json({
    status: true,
    data: entity,
    error: [],
    msg: "Query results",
  });
}

const putEntity = async(req, resp) => {
  let parameters = req.body;
  let entity = new Entity(parameters);
  let output = await entity.save();
  resp.json({
    status: output.status,
    data: output.data,
    error: output.error,
    msg: "Query results",
  });
}

const deleteEntity = async(req, resp) => {
  let parameters = req.query;
  console.log(parameters._id)
  let entity = new Entity({_id: parameters._id});
  let data = await entity.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

module.exports = {
  Entity: Entity,
  getEntities: getEntities,
  getEntity: getEntity,
  putEntity: putEntity,
  deleteEntity: deleteEntity,
};
