const neo4j = require('neo4j-driver').v1;
const Soundex = require('soundex');
const fs = require("fs");
const crypto = require("crypto");
const sizeOfImage = require('image-size');
const ExifImage = require('exif').ExifImage;
const IptcImage = require('node-iptc');
const driver = require("../config/db-driver");

const soundex = (data) => {
  return Soundex(data);
}

const hashFileName = (data) => {
  let newData = data+randomChars();
  return crypto.createHash("md5").update(newData).digest('hex');
}

const randomChars = (length=10) => {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i <length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

const imageIptc = (imgPath) => {
  return new Promise((resolve, reject) => {
    const image = fs.readFile(imgPath, function(error, data) {
      if (error) {
        console.log(error)
      }
      var iptcData = IptcImage(data);
      resolve(iptcData);
    });
  })
  .catch((error)=> {
    console.log(error);
  });
}

const imageExif = (imgPath) => {
  return new Promise((resolve, reject) => {
    const exifImage = ExifImage({ image : imgPath }, function (error, exifData) {
      if (error) {
        //console.log(error.message);
      }
      resolve(exifData);
    });
  })
  .catch((error)=> {
    console.log(error);
  });
}

const imgDimensions = async(imgPath) => {
  let dimensions = await sizeOfImage(imgPath);
  dimensions.extension = dimensions.type;
  delete dimensions.type;
  return dimensions;
}

const prepareNodeProperties = (item) => {
  let nodeProperties = "";
  let i=0;
  for (let key in item) {
    if (i>0) {
      nodeProperties += ","
    }
    let value = item[key];
    if (value===null) {
      value = "";
    }
    if (typeof value==="string") {
      value = "'"+value+"'"
    }
    if (typeof value==="object") {
      value = '[]';
    }
    nodeProperties += key+": $"+key;
    i++;
  }
  nodeProperties = "{"+nodeProperties+"}";
  return nodeProperties;
}

const prepareOutput = (object) => {
  for (let property in object) {
    if (object.hasOwnProperty(property)) {
      const propertyValue = object[property];
      if (neo4j.isInt(propertyValue)) {
        object[property] = propertyValue.toString();
      } else if (typeof propertyValue === 'object') {
        prepareOutput(propertyValue);
      }
    }
  }
}

const prepareParams = (item) => {
  let params = {};
  for (let key in item) {
    params[key] = item[key];
  }
  return params;
}

const normalizeRecordsOutput = (records) => {
  let output = [];
  for (let i=0; i<records.length; i++) {
    let record = records[i];
    let key = record.keys[0];
    prepareOutput(record);
    let outputItem = outputRecord(record.toObject()[key]);
    output.push(outputItem)
  }
  return output;
}

const normalizeRelationsOutput = (records) => {
  let output = [];
  for (let i=0; i<records.length; i++) {
    let record = records[i];
    let key = record.keys[0];
    let relation = record._fields[0];
    prepareOutput(relation);
    output.push(relation)
  }
  return output;
}

const readJSONFile = (path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (error, data)=>{
      let dataJson = JSON.parse(data);
      let output = {data: dataJson, error:error};
      resolve(output);
    });
  })
  .catch((error)=> {
    console.log(error);
  });
}

const outputRecord = (record) => {
  prepareOutput(record);
  let output = Object.assign({}, record.properties);
  output._id = record.identity;
  delete output.identity;
  return output;
}

const outputRelation = (relation) => {
  prepareOutput(relation);
  let output = Object.assign({}, relation);
  output._id = relation.identity;
  delete output.identity;
  return output;
}

const outputPaths = (paths, _id=null) => {
  let output = paths.map((path,i)=>{
    let segments = path.segments.map(segment=> {
      let start = outputRecord(segment.start);
      start.entityType = segment.start.labels;
      let rel = outputRelation(segment.relationship);
      let end = outputRecord(segment.end);
      end.entityType = segment.end.labels;
      return {start:start,rel:rel,end:end};
    });
    return segments;
  });
  return output;
}

const normalizeLabelId = (label) => {
  if (typeof label !== 'string') {
    return '';
  }
  // trim spaces
  label = label.trim();
  let output = "";
  let labelArr = label.split(" ");
  // for each space in string split the string parts and normalize them
  for (let i=0;i<labelArr.length; i++) {
    let chunk = labelArr[i];
    chunk = chunk.trim();
    if (i===0) {
      output += chunk;
    }
    else {
      output += chunk.charAt(0).toUpperCase() + chunk.slice(1);
    }
  }
  return output;
}

const loadRelations = async (srcId=null, srcType=null, targetType=null) => {
  if (srcId===null || srcType===null) {
    return false;
  }
  let session = driver.session()
  let query = "MATCH (n:"+srcType+")-[r]->(rn) WHERE id(n)="+srcId+" return n, r, rn";
  if (targetType!==null) {
    query = "MATCH (n:"+srcType+")-[r]->(rn:"+targetType+") WHERE id(n)="+srcId+" return n, r, rn";
  }
  let relations = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    let records = result.records;
    let relations = [];
    for (let key in records) {
      let record = records[key].toObject();
      let sourceItem = outputRecord(record.n);
      let relation = record.r;
      prepareOutput(relation);
      let targetItem = outputRecord(record.rn);
      let newRelation = prepareRelation(sourceItem, relation, targetItem);
      relations.push(newRelation);
    }
    return relations;
  })
  return relations;
}

const prepareRelation = (sourceItem, relation, targetItem) => {
  let newProperty = {
    _id: relation.identity,
    term: {
      label: relation.type,
    },
    ref: targetItem
  }
  return newProperty;
}

const parseRequestData = async(request) =>{
  if( typeof request.headers!=="undefined") {
    const FORM_URLENCODED = 'application/x-www-form-urlencoded';
    if(request.headers['content-type'] === FORM_URLENCODED) {
        let body = '';
        await request.on('data', chunk => {
          body += chunk.toString();
        });
        return JSON.parse(body);
    }
    else {
      return null;
    }
  }
  else {
    console.log("Undefined request headers");
    return false;
  }

}

const escapeRegExp = (str) => {
  return str.replace(/[\\^$'"|?*+()[{]/g, '\\$&')
};

module.exports = {
  soundex: soundex,
  hashFileName: hashFileName,
  imageIptc: imageIptc,
  imageExif: imageExif,
  imgDimensions: imgDimensions,
  prepareNodeProperties: prepareNodeProperties,
  prepareOutput: prepareOutput,
  prepareParams: prepareParams,
  normalizeRecordsOutput: normalizeRecordsOutput,
  normalizeRelationsOutput: normalizeRelationsOutput,
  readJSONFile: readJSONFile,
  outputRecord: outputRecord,
  outputRelation: outputRelation,
  outputPaths: outputPaths,
  normalizeLabelId: normalizeLabelId,
  loadRelations: loadRelations,
  parseRequestData: parseRequestData,
  escapeRegExp: escapeRegExp,
}
