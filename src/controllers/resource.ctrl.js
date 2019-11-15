const driver = require("../config/db-driver");
const helpers = require("../helpers");
const Canvas = require('canvas');
const fs = require('fs');
const mimeType = require('mime-types')
const {promisify} = require('util');
const formidable = require('formidable');

class Resource {
  constructor({_id=null,label=null,description=null,fileName=null,metadata=[],paths=null,resourceType=null,systemType=null,uploadedFile=null,status=false}) {
    this._id = null;
    if (_id!==null) {
      this._id = _id;
    }
    this.label = label;
    this.description = description;
    this.fileName = fileName;
    this.metadata = metadata;
    this.paths = paths;
    this.resourceType = resourceType;
    this.systemType = systemType;
    this.uploadedFile = uploadedFile;
    this.status = status;
  }

  validate() {
    let status = true;
    let errors = [];
    if (this.label==="") {
      status = false;
      errors.push({field: "label", msg: "The label must not be empty"});
    }
    if (this.fileName==="") {
      status = false;
      errors.push({field: "fileName", msg: "The fileName must not be empty"});
    }
    if (this.paths.length>0) {
      let pI = 0;
      for (let key in this.paths) {
        let path = this.paths[key];
        if (path.path==="") {
          status = false;
          errors.push({field: "path", msg: "The path must not be empty for path "+pI});
        }
        if (path.pathType==="") {
          status = false;
          errors.push({field: "pathType", msg: "The pathType must not be empty for path "+pI});
        }
        pI++;
      }
      if (this.resourceType==="") {
        status = false;
        errors.push({field: "resourceType", msg: "The resourceType must not be empty"});
      }
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
    let session = driver.session();
    let query = "MATCH (n:Resource) WHERE id(n)="+this._id+" return n";
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
    }).catch((error) => {
      console.log(error)
    });
    for (let key in node) {
      this[key] = node[key];
      if (key==="paths" && node[key].length>0) {
        let paths = [];
        for (let akey in node[key]) {
          let path = JSON.parse(node[key][akey]);
          paths.push(path);
        }
        this[key] = paths;
      }
      if (key==="metadata") {
        let metadata = JSON.parse(node[key]);
        this.metadata = JSON.parse(metadata);
      }
    }

    // relations
    let events = await helpers.loadRelations(this._id, "Resource", "Event");
    let organisations = await helpers.loadRelations(this._id, "Resource", "Organisation");
    let people = await helpers.loadRelations(this._id, "Resource", "Person");
    let resources = await helpers.loadRelations(this._id, "Resource", "Resource");
    this.events = events;
    this.organisations = organisations;
    this.people = people;
    this.resources = resources;
  }

  async save() {
    let validateResource = this.validate();
    if (!validateResource.status) {
      return validateResource;
    }
    else {
      let session = driver.session();
      // turn json data to strings to store to the db
      let newPaths = [];
      if (this.paths.length>0) {
        for (let key in this.paths) {
          let path = JSON.stringify(this.paths[key]);
          newPaths.push(path);
        }
      }
      this.paths = newPaths;
      this.metadata = JSON.stringify(this.metadata);
      let nodeProperties = helpers.prepareNodeProperties(this);
      let params = helpers.prepareParams(this);
      let query = "";
      if (typeof this._id==="undefined" || this._id===null) {
        query = "CREATE (n:Resource "+nodeProperties+") RETURN n";
      }
      else {
        query = "MATCH (n:Resource) WHERE id(n)="+this._id+" SET n="+nodeProperties+" RETURN n";
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
    // 1. load file to get details
    let resource = new Resource({_id: this._id});
    await resource.load();

    // 2. delete files from disk
    for (let key in resource.paths) {
      let path = resource.paths[key];
      let deleteFile = this.unlinkFile(process.env.ARCHIVEPATH+path.path);
    }

    // 3. delete relations
    let query1 = "MATCH (n:Resource)-[r]-() WHERE id(n)="+this._id+" DELETE r";
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

    // 4. delete record
    let query = "MATCH (n:Resource) WHERE id(n)="+this._id+" DELETE n";
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

  unlinkFile(path) {
    return new Promise((resolve, reject) => {
      fs.unlink(path, (err) => {
        let output = {};
        if (err) {
          output.error = err;
          output.status = false;
        }
        else {
          output.status = true;
          output.message = "File \""+path+"\" deleted successfully";
        }
        resolve(output);
      });
    })
    .catch((error)=> {
      return error;
    });
  }
};

const getResources = async (req, resp) => {
  let parameters = req.query;
  let label = "";
  let systemType = "";
  let description = "";
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
  if (typeof parameters.systemType!=="undefined") {
    systemType = parameters.systemType;
    if (systemType!=="") {
      if (queryParams !=="") {
        queryParams += " AND ";
      }
      queryParams = "LOWER(n.systemType) =~ LOWER('.*"+systemType+".*') ";
    }
  }
  if (typeof parameters.description!=="undefined") {
    description = parameters.description;
    if (description!=="") {
      if (queryParams !=="") {
        queryParams += " AND ";
      }
      queryParams = "LOWER(n.description) =~ LOWER('.*"+description+".*') ";
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
  query = "MATCH (n:Resource) "+queryParams+" RETURN n ORDER BY n.label SKIP "+skip+" LIMIT "+limit;
  let data = await getResourcesQuery(query, queryParams, limit);
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

const getResourcesQuery = async (query, queryParams, limit) => {
  let session = driver.session();
  let nodesPromise = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    return result.records;
  })

  let nodes = helpers.normalizeRecordsOutput(nodesPromise, "n");
  let nodesOutput = nodes.map(node=> {
    let nodeOutput = {};
    for (let key in node) {
      nodeOutput[key] = node[key];
      let paths = [];
      if (key==="paths" && node[key].length>0) {
        for (let akey in node[key]) {
          let path = JSON.parse(node[key][akey]);
          paths.push(path);
        }
        nodeOutput[key] = paths;
      }
    }
    return nodeOutput;
  });

  let count = await session.writeTransaction(tx=>
    tx.run("MATCH (n:Resource) "+queryParams+" RETURN count(*)")
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
    nodes: nodesOutput,
    count: count,
    totalPages: totalPages
  }
  return result;
}

const getResource = async(req, resp) => {
  let parameters = req.query;
  if (typeof parameters._id==="undefined" && parameters._id==="") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please select a valid id to continue.",
    });
  }
  let _id = parameters._id;
  let resource = new Resource({_id:_id});
  await resource.load();
  resp.json({
    status: true,
    data: resource,
    error: [],
    msg: "Query results",
  });
}

const putResource = async(req, resp) => {
  let postData = await helpers.parseRequestData(req);
  let resource = new Resource(postData.resource);
  let data = await resource.save();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

const deleteResource = async(req, resp) => {
  let parameters = req.query;
  let resource = new Resource({_id: parameters._id});
  let data = await resource.delete();
  resp.json({
    status: true,
    data: data,
    error: [],
    msg: "Query results",
  });
}

const uploadResource = async(req, resp) => {
  let data = await parseFormDataPromise(req);
  let uploadedFile = data.file.file;
  let fields = data.fields;
  let newId = null;
  let newLabel = uploadedFile.name;
  let systemType = null;
  if (typeof fields._id!=="undefined" && fields._id!==null) {
    newId = fields._id;
  }
  if (typeof fields.label!=="undefined" && fields.label!==null) {
    newLabel = fields.label;
  }
  if (typeof fields.systemType!=="undefined" && fields.systemType!==null) {
    systemType = fields.systemType;
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
  // 2. if image create thumbnail
  let fileType = uploadedFile.type.split("/")[0];
  let thumbnailPath = '';
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
    let fileName = uploadedFile.fileName;
    let srcPath = newUploadFile.path;
    thumbnailPath = process.env.ARCHIVEPATH+"images/thumbnails/"+hashedName;

    createThumb = await createThumbnail(srcPath, thumbnailPath, hashedName, newWidth, newHeight);
  }
  // 3. insert/update resource
  let parseResourceDetailsPromise = await parseResourceDetails(fileType, uploadedFile, newUploadFile, hashedName);
  let newResourceData = {};
  if (newId!==null) {
    newResourceData._id = newId;
  }
  if (systemType!==null) {
    newResourceData.systemType = systemType;
  }
  for (var key in parseResourceDetailsPromise) {
    if (parseResourceDetailsPromise[key]!==null) {
      newResourceData[key] = parseResourceDetailsPromise[key];
    }
  }
  if (newLabel!==null) {
    newResourceData.label = newLabel;
  }
  let newResource = new Resource(newResourceData);
  let updateResource = await newResource.save();
  let status = true;
  if (typeof updateResource.status!=="undefined" && updateResource.status===false) {
    // if file save failed delete uploaded file and thumbnail
    newResource.unlinkFile(newUploadFile.path);
    newResource.unlinkFile(thumbnailPath);
    status = false;
  }
  let error = [];
  if (typeof updateResource.error!=="undefined") {
    error = updateResource.error;
  }
  let output = {
    status: status,
    data: updateResource.data,
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

const uploadFile = async(uploadedFile=null, hashedName="") => {
  if (uploadedFile===null || hashedName==="") {
    return false;
  }
  let sourcePath = uploadedFile.path;
  let targetPath = process.env.ARCHIVEPATH+"images/fullsize/"+hashedName;
  let uploadFilePromise = await new Promise((resolve, reject) => {
    fs.rename(sourcePath, targetPath, function (error) {
        let output = {};
        if (error) {
          output.status = false;
          output.msg = error;
        }
        else {
          output.status = true;
          output.msg = "File "+uploadedFile.name+" uploaded successfully";
          output.path = targetPath;
          output.fileName = hashedName;
        }
        resolve(output)
      });
  });
  return uploadFilePromise;
}

const createThumbnail = async(srcPath=null,targetPath=null,fileName=null,customWidth=null,customHeight=null) => {
  if (srcPath===null || targetPath===null) {
    return false;
  }
  const readFile = promisify(fs.readFile);
  const imageSrc = await readFile(srcPath);
  const newTumbnail = new Promise((resolve, reject) => {
    const Image = Canvas.Image;
    const img = new Image();
    let output = {};
    let errors = [];
    img.src = imageSrc;

    img.onerror = function (err) {
      errors.push(err);
    }
    // calculate new dimensions
    let oldWidth = img.width;
    let oldHeight = img.height;
    let aspectRatio = oldWidth / oldHeight;
    let newWidth = 600, newHeight = 600;
    if (oldWidth > oldHeight) {
      newHeight = newWidth / aspectRatio;
    }
    else {
      newWidth = newHeight * aspectRatio;
    }

    if (customWidth!==null) {
      newWidth = customWidth;
      newHeight = newWidth / aspectRatio;
    }
    else if (customHeight!==null) {
      newHeight = customHeight;
      newWidth = newHeight * aspectRatio;
    }

    newWidth = parseInt(newWidth,10);
    newHeight = parseInt(newHeight,10);

    if (newWidth>0 && newHeight>0) {
      var canvas = Canvas.createCanvas(newWidth, newHeight);
      var ctx = canvas.getContext('2d');
      //ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      var out = fs.createWriteStream(targetPath);
      var stream = canvas.createJPEGStream({
        bufsize: 2048,
        quality: 80
      });

      stream.pipe(out);
      out.on('finish', function () {
        output.status = true;
        output.msg = fileName+" resized successfully";
        output.errors = errors;

        resolve(output);
      });
    }
    else {
      output.status = false;
      output.msg = fileName+" failed to resize";
      output.errors = errors;
      resolve(output);
    }
  });
}

const parseResourceDetails = async(fileType, uploadedFile, newUploadFile, hashedName) => {
  let newResourceData = {};
  if (fileType==="image") {
    let newFilePath = newUploadFile.path;
    let imageDefault = await helpers.imgDimensions(newFilePath);
    imageDefault.x=0;
    imageDefault.y=0;
    imageDefault.rotate=0;
    let imageExif = await helpers.imageExif(newFilePath);
    let imageIptc = await helpers.imageIptc(newFilePath);
    let newLabel = uploadedFile.name.replace(/\.[^/.]+$/, "");
    let resourceType = uploadedFile.type.split("/")[0];
    let newResourceImageMetadata = {}
    if (imageDefault!==null) {
      newResourceImageMetadata.default = imageDefault;
    }
    if (imageExif!==null) {
      newResourceImageMetadata.exif = JSON.stringify(imageExif);
    }
    if (imageIptc!==null && imageIptc.length>0 && imageIptc[0]!==false) {
      newResourceImageMetadata.iptc = JSON.stringify(imageIptc);
    }
    newResourceData = {
      label: newLabel,
      fileName: uploadedFile.name,
      hashedName: hashedName,
      metadata: {
        image: newResourceImageMetadata
      },
      paths: [
        {path: "images/fullsize/"+hashedName, pathType: 'source'},
        {path: "images/thumbnails/"+hashedName, pathType: 'thumbnail'},
      ],
      resourceType: 'image'
    };
  }
  return newResourceData;
}

module.exports = {
  Resource: Resource,
  getResources: getResources,
  getResource: getResource,
  putResource: putResource,
  uploadResource: uploadResource,
  deleteResource: deleteResource,
};
