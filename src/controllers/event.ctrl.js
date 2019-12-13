const driver = require("../config/db-driver");
const helpers = require("../helpers");
const updateReference = require("./references.ctrl").updateReference;
const TaxonomyTerm = require("./taxonomyTerm.ctrl").TaxonomyTerm;

class Event {
  constructor({_id=null,label=null,description=null,eventType=null,createdBy=null,createdAt=null,updatedBy=null,updatedAt=null}) {
    if (_id!==null) {
      this._id = _id;
    }
    this.label = label;
    this.description = description;
    this.eventType = eventType;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedBy = updatedBy;
    this.updatedAt = updatedAt;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.label==="") {
      status = false;
      errors.push({field: "label", msg: "The label must not be empty"});
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
    let query = "MATCH (n:Event) WHERE id(n)="+this._id+" RETURN n";
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

    // relations
    let events = await helpers.loadRelations(this._id, "Event", "Event");
    let organisations = await helpers.loadRelations(this._id, "Event", "Organisation");
    let people = await helpers.loadRelations(this._id, "Event", "Person");
    let resources = await helpers.loadRelations(this._id, "Event", "Resource");
    this.events = events;
    this.organisations = organisations;
    this.people = people;
    this.resources = resources;
  }

  async save() {
    let validateEvent = this.validate();
    if (!validateEvent.status) {
      return validateEvent;
    }
    else {
      let session = driver.session();
      let nodeProperties = helpers.prepareNodeProperties(this);
      let params = helpers.prepareParams(this);

      let query = "";
      if (typeof this._id==="undefined" || this._id===null) {
        query = "CREATE (n:Event "+nodeProperties+") RETURN n";
      }
      else {
        query = "MATCH (n:Event) WHERE id(n)="+this._id+" SET n="+nodeProperties+" RETURN n";
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
            let record = records[0];
            let key = record.keys[0];
            let resultRecord = record.toObject()[key];
            resultRecord = helpers.outputRecord(resultRecord);
            output = {error: [], status: true, data: resultRecord};
          }
          return output;
        });
      return updateResult;
    }
  }

  async delete() {
    let session = driver.session()
    let queryRel = "MATCH (n:Event)-[r]->() WHERE id(n)="+this._id+" AND n.locked=false DELETE r";
    let queryNode = "MATCH (n:Event) WHERE id(n)="+this._id+"  AND n.locked=false DELETE n"
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

const getEvents = async (req, resp) => {
  let parameters = req.query;
  let label = "";
  let page = 0;
  let queryPage = 0;
  let limit = 25;

  let query = "";
  let queryParams = "";

  if (typeof parameters.label!=="undefined") {
    label = parameters.label;
    if (label!=="") {
      queryParams = "LOWER(n.label) =~ LOWER('.*"+label+".*') ";
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
    queryParams = "WHERE "+queryParams;
  }
  query = "MATCH (n:Event) "+queryParams+" RETURN n ORDER BY n.label";
  let data = await getEventsQuery(query, queryParams, limit);
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
    _id: relation.idevent,
    term: {
      label: relation.type,
    },
    eventRef: {
      _id: targetItem._id,
      label: targetItem.label
    }
  }
  return newProperty;
}

const getEventsQuery = async (query, queryParams, limit) => {
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
    tx.run("MATCH (n:Event) "+queryParams+" RETURN count(*)")
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

const getEvent = async(req, resp) => {
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
  let event = null;
    if (typeof parameters._id!=="undefined" && parameters._id!=="") {
      let _id = parameters._id;
      event = new Event({_id:_id});
      await event.load();
    }
    else if (typeof parameters.labelId!=="undefined" && parameters.labelId!=="") {
      let labelId = parameters.labelId;
      event = new Event({labelId:labelId});
      await event.loadByLabelId();
    }
  resp.json({
    status: true,
    data: event,
    error: [],
    msg: "Query results",
  });
}

const putEvent = async(req, resp) => {
  let postData = req.body;
  let now = new Date().toISOString();
  let userId = req.decoded.id;
  if (typeof postData._id==="undefined" || postData._id===null) {
    postData.createdBy = userId;
    postData.createdAt = now;
  }
  postData.updatedBy = userId;
  postData.updatedAt = now;
  let event = new Event(postData);
  let output = await event.save();
  resp.json({
    status: output.status,
    data: output.data,
    error: output.error,
    msg: "Query results",
  });
}

const deleteEvent = async(req, resp) => {
  let parameters = req.query;
  console.log(parameters._id)
  let event = new Event({_id: parameters._id});
  let data = await event.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

module.exports = {
  Event: Event,
  getEvents: getEvents,
  getEvent: getEvent,
  putEvent: putEvent,
  deleteEvent: deleteEvent,
};
