const driver = require("../config/db-driver");
const helpers = require("../helpers");
const sanitizeHtml = require('sanitize-html');
const Canvas = require('canvas');
const fs = require('fs');
const mimeType = require('mime-types')
const formidable = require('formidable');
const path = require('path');
const UploadedFile = require('./uploadedFile.ctrl').UploadedFile;

class Slideshow {
  constructor({_id=null,label=null,caption=0,order=null,url=null,status='private',image=null,imageDetails=null,createdBy=null,createdAt=null,updatedBy=null,updatedAt=null}) {
    this._id = null;
    if (_id!==null) {
      this._id = _id;
    }
    this.label = label;
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
    let query = `MATCH (n:Slideshow) WHERE id(n)=${this._id} return n`;
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
    if (typeof this.image!=="undefined" && this.image!=="") {
      let imageDetails = new UploadedFile({_id:this.image});
      await imageDetails.load();
      this.imageDetails = imageDetails;
    }
  }

  async save(userId) {
    let validateSlideshow = this.validate();
    if (!validateSlideshow.status) {
      return validateSlideshow;
    }
    else {
      let session = driver.session();

      // timestamps
      let now = new Date().toISOString();
      if (typeof this._id==="undefined" || this._id===null) {
        this.createdBy = userId;
        this.createdAt = now;
      }
      else {
        let original = new Slideshow({_id:this._id});
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      let nodeProperties = helpers.prepareNodeProperties(this);
      let params = helpers.prepareParams(this);
      let query = "";
      if (typeof this._id==="undefined" || this._id===null) {
        query = `CREATE (n:Slideshow ${nodeProperties}) RETURN n`;
      }
      else {
        query = `MATCH (n:Slideshow) WHERE id(n)=${this._id} SET n=${nodeProperties} RETURN n;`
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

  async countRelations() {
    if (this._id===null) {
      return false;
    }
    let session = driver.session();
    let query = `MATCH (n)-[r]->() WHERE id(n)=${this._id} RETURN count(*) AS c`;
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

  async delete() {
    let session = driver.session();
    await this.countRelations();
    if (parseInt(this.count,10)>0) {
      let output = {error: ["You must remove the record's relations before deleting"], status: false, data: []};
      return output;
    }

    let query = `MATCH (n:Slideshow) WHERE id(n)=${this._id} DELETE n`;
    let deleteRecord = await session.writeTransaction(tx=>
      tx.run(query,{})
    ).then(result => {
      session.close();
      return result;
    });
    return deleteRecord;
  }
};
/**
* @api {get} /slideshow-items Get slideshow items
* @apiName get slideshow items
* @apiGroup Slideshow
* @apiSuccessExample {json} Success-Response:
*/
const getSlideshowItems = async (req, resp) => {
  let parameters = req.query;
  let label = "";
  let status = "";

  let query = "";
  let queryParams = "";
  if (typeof parameters.label!=="undefined") {
    label = parameters.label;
    if (label!=="") {
      queryParams +="LOWER(n.label) =~ LOWER('.*"+label+".*') ";
    }
  }
  if (typeof parameters.status!=="undefined") {
    status = parameters.status;
    if (status!=="") {
      if (queryParams !=="") {
        queryParams += " AND ";
      }
      queryParams += "LOWER(n.status) =~ LOWER('.*"+status+".*') ";
    }
  }
  if (queryParams!=="") {
    queryParams = "WHERE "+queryParams;
  }

  query = `MATCH (n:Slideshow) ${queryParams} RETURN n ORDER BY n.order`;
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
  let length = nodes.length;
  for (let n=0;n<length; n++) {
    let node = nodes[n];
    // populate featured image
    node.imageDetails = null;
    if (typeof node.image!=="undefined" && node.image!=="") {
      let imageDetails = new UploadedFile({_id:node.image});
      await imageDetails.load();
      node.imageDetails = imageDetails;
    }
  }
  resp.json({
    status: true,
    data: {
      data: nodes,
      totalItems: nodes.length
    },
    error: [],
    msg: "Query results",
  })

}

/**
* @api {get} /slideshow-item Get slideshow item
* @apiName get slideshow item
* @apiGroup Slideshow
*
* @apiParam {string} _id The _id of the requested slideshow item.

*/
const getSlideshowItem = async(req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id==="undefined" || parameters._id==="") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id to continue.",
    });
    return false;
  }
  let _id=null;
  if (typeof parameters._id!=="undefined" && parameters._id!=="") {
    _id = parameters._id;
  }
  let query = {_id: _id};
  let item = new Slideshow(query);
  await item.load();
  resp.json({
    status: true,
    data: item,
    error: [],
    msg: "Query results",
  });
}

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
*
* @apiSuccessExample {json} Success-Response:

*/
const putSlideshowItem = async(req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length===0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "The content must not be empty",
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
    msg: "Query results",
  });
}

/**
* @api {delete} /slideshow-item Delete slideshow item
* @apiName delete slideshow item
* @apiGroup Slideshow
* @apiPermission admin
*
* @apiParam {string} _id The id of the slideshow item for deletion.
*
* @apiSuccessExample {json} Success-Response:

 */
const deleteSlideshowItem = async(req, resp) => {
  let postData = req.body;
  let item = new Slideshow(postData);
  let data = await item.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

const uploadImage = async(req, resp) => {
  let data = await parseFormDataPromise(req);
  if (Object.keys(data.file).length===0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "The uploaded image must not be empty",
    });
    return false;
  }
  let uploadedFile = data.file.file;
  let featuredImage = false;
  if (typeof data.featuredImage!=="undefined") {
    featuredImage = data.featuredImage;
  }
  let extension = mimeType.extension(uploadedFile.type);
  if (extension==="jpeg") {
    extension = "jpg";
  }
  let hashedName = helpers.hashFileName(uploadedFile.name)+"."+extension;
  let newDimensions = null;
  if (typeof data.dimensions!=="undefined") {
    newDimensions = data.dimensions;
  }

  // 1. upload file
  let newUploadFile = await uploadFile(uploadedFile,hashedName);
  let srcPath = newUploadFile.path;
  let thumbnailPath = "";

  let date = new Date();
  let month = date.getMonth()+1;
  let year = date.getFullYear();
  // 2. if image create thumbnail
  let fileType = uploadedFile.type.split("/")[0];
  if (fileType==="image" && newUploadFile.status) {
    let newWidth = null;
    let newHeight = null;
    if (newDimensions!==null) {
      if (typeof newDimensions.width!=="undefined" && newDimensions.width!=="") {
        newWidth = newDimensions.width;
      }
      if (typeof newDimensions.height!=="undefined" && newDimensions.height!=="") {
        newHeight = newDimensions.height;
      }
    }

    let thumbnailsDir = `${process.env.UPLOADSPATH}/uploads/${year}/${month}/thumbnails/`;
    thumbnailPath = `${thumbnailsDir}${hashedName}`;

    let createThumb = await createThumbnail(srcPath, thumbnailPath, hashedName, newWidth, newHeight);
  }
  let status = true, error = false;
  let output = {
    status: status,
    data: {
      image: `${process.env.SERVERURL}${year}/${month}/images/${hashedName}`,
      thumbnail: `${process.env.SERVERURL}${year}/${month}/thumbnails/${hashedName}`,
    },
    error: error,
    msg: "",
  }
  resp.json(output);
}

const parseFormDataPromise = (req) => {
  return new Promise((resolve, reject) => {
    new formidable.IncomingForm().parse(req, (err, fields, files) => {
      if (err) {
        console.error('Error', err)
        throw err
      }
      let output = {};
      output.fields = fields;
      output.file = files;
      resolve(output);
    })
  });
}

module.exports = {
  Slideshow: Slideshow,
  getSlideshowItems: getSlideshowItems,
  getSlideshowItem: getSlideshowItem,
  putSlideshowItem: putSlideshowItem,
  deleteSlideshowItem: deleteSlideshowItem,
};
