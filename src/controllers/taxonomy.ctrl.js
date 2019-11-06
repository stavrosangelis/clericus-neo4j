const driver = require("../config/db-driver");
const helpers = require("../helpers");

class Taxonomy {
  constructor({_id=null,label=null,locked=false,description=null,systemType=null}) {
    this._id = null;
    if (_id!==null) {
      this._id = _id;
    }
    this.label = label;
    this.locked = locked;
    this.description = description;
    this.systemType = systemType;
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
    if (this._id===null && this.systemType==="") {
      return false;
    }
    let query = "";
    if (this._id!==null) {
      query = "MATCH (n:Taxonomy) WHERE id(n)="+this._id+" return n";
    }
    else if (this.systemType!==null) {
      query = "MATCH (n:Taxonomy {systemType: '"+this.systemType+"'}) return n";
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
  }

  async countRelations() {
    if (this._id===null || this.label==="") {
      return false;
    }
    let session = driver.session();
    let query = "MATCH (n)-[r]->() WHERE id(n)="+this._id+" RETURN count(*) AS c";
    let count = await session.writeTransaction(tx=>
      tx.run(query, {})
    )
    .then(result=> {
      session.close()
      let records = result.records;
      if (records.length>0) {
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

  async save() {
    let validateTaxonomy = this.validate();
    if (!validateTaxonomy.status) {
      return validateTaxonomy;
    }
    else {
      let session = driver.session();
      let newData = this;
      // normalize label id
      if (typeof this._id==="undefined" || this._id===null) {
        this.labelId = helpers.normalizeLabelId(this.label);
      }
      else {
        await this.load();
      }
      if (this.locked) {
        let output = {error: ["This taxonomy is locked and cannot be updated"], status: false, data: []};
        return output;
      }
      let nodeProperties = helpers.prepareNodeProperties(newData);
      let params = helpers.prepareParams(newData);

      let query = "";
      if (typeof this._id==="undefined" || this._id===null) {
        query = "CREATE (n:Taxonomy "+nodeProperties+") RETURN n";
      }
      else {
        query = "MATCH (n:Taxonomy) WHERE id(n)="+this._id+" AND n.locked=false SET n="+nodeProperties+" RETURN n";
      }
      let resultPromise = await session.run(
        query,
        params
      ).then(result => {
        session.close();
        let records = result.records;
        let output = {error: ["The record cannot be updated"], status: false, data: []};
        if (records.length>0) {
          let record = records[0];
          let key = record.keys[0]
          let outputRecord = record.toObject()[key];
          helpers.prepareOutput(outputRecord);
          output = {error: [], status: true, data: outputRecord};
        }
        return output;
      });
      return resultPromise;
    }
  }

  async delete() {
    let session = driver.session();
    await this.countRelations();
    if (parseInt(this.count,10)>0) {
      let output = {error: ["You must remove the record's relations before deleting"], status: false, data: []};
      return output;
    }
    let query = "MATCH (n:Taxonomy) WHERE id(n)="+this._id+" DELETE n";
    let deleteRecord = await session.writeTransaction(tx=>
      tx.run(query,{})
    ).then(result => {
      session.close();
      return result;
    });
    return deleteRecord;
  }
};

const getTaxonomies = async (req, resp) => {
  let parameters = req.query;
  let page = 0;
  let queryPage = 0;
  let limit = 25;
  let queryParams = {};

  let systemType = null;
  if (typeof parameters.systemType!=="undefined") {
    systemType = parameters.systemType;
    queryParams.systemType = systemType;
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

  let skip = limit*page;
  let nodeProperties = helpers.prepareNodeProperties(queryParams);
  let params = helpers.prepareParams(queryParams);

  let query = "MATCH (n:Taxonomy "+nodeProperties+")";
  let data = await getTaxonomiesQuery(query, params, skip, limit);
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

const getTaxonomiesQuery = async (query, params, skip, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query+" RETURN n SKIP "+skip+" LIMIT "+limit,params)
  )
  .then(result=> {
    session.close();
    return result.records;
  })
  let nodes = helpers.normalizeRecordsOutput(nodesPromise);
  let nodesOutput = [];
  for (let key in nodes) {
    let node = nodes[key];
    //let nodeOutput = node;
    //nodeOutput.taxonomyterms = await getTaxonomyTerms(node._id);
    nodesOutput.push(node);
  }
  let count = await session.writeTransaction(tx=>
    tx.run(query+"RETURN count(*)", params)
  )
  .then(result=> {
    session.close();
    let resultRecord = result.records[0];
    let countObj = resultRecord.toObject();
    helpers.prepareOutput(countObj);
    let output = countObj['count(*)'];
    return output;
  });
  let totalPages = Math.ceil(count/limit)
  let result = {
    nodes: nodesOutput,
    count: count,
    totalPages: totalPages
  }
  return result;
}

const getTaxonomy = async(req, resp) => {
  let parameters = req.query;
  if (
      (typeof parameters._id==="undefined" && parameters._id==="") ||
      (typeof parameters.systemType==="undefined" && parameters.systemType==="")
    ) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id to continue.",
    });
  }
  let _id=null, systemType=null;
  if (typeof parameters._id!=="undefined" && parameters._id!=="") {
    _id = parameters._id;
  }
  if (typeof parameters.systemType!=="undefined" && parameters.systemType!=="") {
    systemType = parameters.systemType;
  }
  let query = {};
  if (_id!==null) {
    query._id = _id;
  }
  if (systemType!==null) {
    query.systemType = systemType;
  }
  let taxonomy = new Taxonomy(query);
  await taxonomy.load();
  taxonomy.taxonomyterms = await getTaxonomyTerms(taxonomy._id);
  resp.json({
    status: true,
    data: taxonomy,
    error: [],
    msg: "Query results",
  });
}

const putTaxonomy = async(req, resp) => {
  let parameters = req.body;
  let taxonomy = new Taxonomy(parameters);
  let output = await taxonomy.save();
  resp.json({
    status: output.status,
    data: output.data,
    error: output.error,
    msg: "Query results",
  });
}

const deleteTaxonomy = async(req, resp) => {
  let postData = req.body;
  let taxonomy = new Taxonomy(postData);
  let data = await taxonomy.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

const getTaxonomyTerms = async(_id) =>{
  let session = driver.session();
  let query = "MATCH (t:Taxonomy) WHERE id(t)="+_id+" MATCH (n:TaxonomyTerm)-[r:isChildOf]->(t) RETURN n";
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    return result.records;
  })
  let taxonomyTerms = helpers.normalizeRecordsOutput(nodesPromise, "n");
  return taxonomyTerms;
}

module.exports = {
  Taxonomy: Taxonomy,
  getTaxonomies: getTaxonomies,
  getTaxonomy: getTaxonomy,
  getTaxonomyTerms: getTaxonomyTerms,
  putTaxonomy: putTaxonomy,
  deleteTaxonomy: deleteTaxonomy,
};
