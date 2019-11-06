const driver = require("../config/db-driver");
const helpers = require("../helpers");

class TaxonomyTerm {
  constructor({_id=null,label=null,labelId=null,locked=false,inverseLabel=null,inverseLabelId=null,scopeNote=null,count=0}) {
    this._id = null;
    if (_id!==null) {
      this._id = _id;
    }
    this.label = label;
    this.labelId = labelId;
    this.locked = locked;
    this.inverseLabel = inverseLabel;
    this.inverseLabelId = inverseLabelId;
    this.scopeNote = scopeNote;
    this.count = count;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.label==="") {
      status = false;
      errors.push({field: "label", msg: "The label must not be empty"});
    }
    if (this.inverseLabel==="") {
      status = false;
      errors.push({field: "inverseLabel", msg: "The inverseLabel must not be empty"});
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
    if (this._id===null && this.labelId==="") {
      return false;
    }
    let session = driver.session()
    let query = "";
    if (this._id!==null) {
      query = "MATCH (n:TaxonomyTerm) WHERE id(n)="+this._id+" return n";
    }
    else if (this.labelId!==null) {
      query = "MATCH (n:TaxonomyTerm {labelId: '"+this.labelId+"'}) return n";
    }
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
    await this.countRelations();
  }

  async countRelations() {
    if (this._id===null || this.label==="") {
      return false;
    }
    let session = driver.session();
    let query = "MATCH ()-[r:"+this.labelId+"]->() RETURN count(*) AS c";
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
    let validateTaxonomyTerm = this.validate();
    if (!validateTaxonomyTerm.status) {
      return validateTaxonomyTerm;
    }
    else {
      let session = driver.session();
      let newData = this;
      if (typeof this._id==="undefined" || this._id===null) {
        this.labelId = helpers.normalizeLabelId(this.label);
        this.inverseLabelId = helpers.normalizeLabelId(this.inverseLabel);
      }
      else {
        await this.load();
        newData.labelId = this.labelId;
        newData.inverseLabelId = this.inverseLabelId;
      }

      if (parseInt(this.count,10)>0) {
        let output = {error: ["You must remove the record's relations before updating"], status: false, data: []};
        return output;
      }
      let nodeProperties = helpers.prepareNodeProperties(newData);
      let params = helpers.prepareParams(newData);

      let query = "";
      if (typeof this._id==="undefined" || this._id===null) {
        query = "CREATE (n:TaxonomyTerm "+nodeProperties+") RETURN n";
      }
      else {
        query = "MATCH (n:TaxonomyTerm) WHERE id(n)="+this._id+" SET n="+nodeProperties+" RETURN n";
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
          let key = record.keys[0];
          let resultRecord = record.toObject()[key];
          resultRecord = helpers.outputRecord(resultRecord);
          output = {error: [], status: true, data: resultRecord};
        }
        return output;
      });
      return resultPromise;
    }
  }

  async delete() {
    let session = driver.session()
    await this.load();
    if (parseInt(this.count,10)>0) {
      let output = {error: ["You must remove the record's relations before deleting"], status: false, data: []};
      return output;
    }
    // 1. disassociate with the taxonomy
    let query1 = "MATCH (n:TaxonomyTerm)-[r]-(l:Taxonomy) WHERE id(n)="+this._id+" DELETE r";
    let deleteRel = await session.writeTransaction(tx=>
      tx.run(query1,{})
    )
    .then(result => {
      session.close();
      return result;
    })
    .catch((error) => {
      console.log(error)
    });
    // 2. delete term
    let query = "MATCH (n:TaxonomyTerm) WHERE id(n)="+this._id+" DELETE n";
    let deleteRecord = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result => {
      session.close();
      return result;
    })
    .catch((error) => {
      console.log(error)
    });
    return deleteRecord;
  }

};

const getTaxonomyTerms = async (req, resp) => {
  let parameters = req.query;
  let label = "";
  let firstName = "";
  let lastName = "";
  let fnameSoundex = "";
  let lnameSoundex = "";
  let _id = "";
  let description = "";
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
  query = "MATCH (n:TaxonomyTerm) RETURN n SKIP "+skip+" LIMIT "+limit;
  let data = await getTaxonomyTermsQuery(query, limit);
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

const getTaxonomyTermsQuery = async (query, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  })

  let nodes = helpers.normalizeRecordsOutput(nodesPromise);

  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:TaxonomyTerm) RETURN count(*)")
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

const getTaxonomyTerm = async(req, resp) => {
  let parameters = req.query;
  if ((typeof parameters._id==="undefined" && parameters._id==="") || (typeof parameters.labelId==="undefined" && parameters.labelId==="")) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id to continue.",
    });
  }
  let _id=null, labelId=null;
  if (typeof parameters._id!=="undefined" && parameters._id!=="") {
    _id = parameters._id;
  }
  if (typeof parameters.labelId!=="undefined" && parameters.labelId!=="") {
    labelId = parameters.labelId;
  }
  let query = {};
  if (_id!==null) {
    query._id = _id;
  }
  if (labelId!==null) {
    query.labelId = labelId;
  }
  let term = new TaxonomyTerm(query);
  await term.load();
  resp.json({
    status: true,
    data: term,
    error: [],
    msg: "Query results",
  });
}

const putTaxonomyTerm = async(req, resp) => {
  let postData = req.body;
  let term = new TaxonomyTerm(postData);
  let data = await term.save();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

const deleteTaxonomyTerm = async(req, resp) => {
  let postData = req.body;
  let term = new TaxonomyTerm(postData);
  let data = await term.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

module.exports = {
  TaxonomyTerm: TaxonomyTerm,
  getTaxonomyTerms: getTaxonomyTerms,
  getTaxonomyTerm: getTaxonomyTerm,
  putTaxonomyTerm: putTaxonomyTerm,
  deleteTaxonomyTerm: deleteTaxonomyTerm,
};
