const neo4j = require('neo4j-driver');
const Soundex = require('soundex');
const fs = require('fs');
const crypto = require('crypto');
const sizeOfImage = require('image-size');
const ExifImage = require('exif').ExifImage;
const IptcImage = require('node-iptc');
const driver = require('../config/db-driver');

const soundex = (data = null) => {
  if (data === null || data === '') {
    return '';
  }
  return Soundex(data);
};

const hashFileName = (data) => {
  if (data === null || data === '') {
    return false;
  }
  let newData = data + randomChars();
  return crypto.createHash('md5').update(newData).digest('hex');
};

const randomChars = (length = 10) => {
  var text = '';
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const imageIptc = (imgPath) => {
  return new Promise((resolve) => {
    fs.readFile(imgPath, function (error, data) {
      if (error) {
        console.log(error);
      }
      var iptcData = IptcImage(data);
      resolve(iptcData);
    });
  }).catch((error) => {
    console.log(error);
  });
};

const imageExif = (imgPath) => {
  return new Promise((resolve) => {
    ExifImage({ image: imgPath }, function (error, exifData) {
      if (error) {
        // console.log(error.message);
      }
      resolve(exifData);
    });
  }).catch((error) => {
    console.log(error);
  });
};

const imgDimensions = async (imgPath) => {
  let dimensions = await sizeOfImage(imgPath);
  dimensions.extension = dimensions.type;
  delete dimensions.type;
  return dimensions;
};

const prepareNodeProperties = (item) => {
  let nodeProperties = '';
  let i = 0;
  for (let key in item) {
    if (i > 0) {
      nodeProperties += ',';
    }
    let value = item[key];
    if (value === null) {
      value = '';
    }
    if (typeof value === 'string') {
      value = "'" + value + "'";
    }
    if (typeof value === 'object') {
      value = '[]';
    }
    nodeProperties += key + ': $' + key;
    i++;
  }
  nodeProperties = '{' + nodeProperties + '}';
  return nodeProperties;
};

const prepareOutput = (object) => {
  for (let property in object) {
    if (Object.prototype.hasOwnProperty.call(object, property)) {
      const propertyValue = object[property];
      if (neo4j.isInt(propertyValue)) {
        object[property] = propertyValue.toString();
      } else if (typeof propertyValue === 'object') {
        prepareOutput(propertyValue);
      }
    }
  }
};

const prepareParams = (item) => {
  let params = {};
  for (let key in item) {
    params[key] = item[key];
  }
  return params;
};

const normalizeRecordsOutput = (records) => {
  let output = [];
  for (let i = 0; i < records.length; i++) {
    let record = records[i];
    let labels = null;
    if (typeof record._fields[0].labels !== 'undefined') {
      labels = record._fields[0].labels;
    }
    let key = record.keys[0];
    prepareOutput(record);
    let outputItem = outputRecord(record.toObject()[key]);
    if (labels !== null) {
      outputItem.systemLabels = labels;
    }
    output.push(outputItem);
  }
  return output;
};

const normalizeGraphRecordsOutput = (records) => {
  let output = [];
  for (let i = 0; i < records.length; i++) {
    let record = records[i];
    let key = record.keys[0];
    prepareOutput(record);
    let outputItem = outputRecord(record.toObject()[key]);
    if (record.keys.indexOf('count') > -1) {
      outputItem.count = record.toObject()['count'];
    }
    output.push(outputItem);
  }
  return output;
};

const normalizeRelationsOutput = (records) => {
  let output = [];
  for (let i = 0; i < records.length; i++) {
    let record = records[i];
    let relation = record._fields[0];
    prepareOutput(relation);
    output.push(relation);
  }
  return output;
};

const readJSONFile = (path) => {
  return new Promise((resolve) => {
    fs.readFile(path, 'utf-8', (error, data) => {
      let dataJson = null;
      if (error === null) {
        dataJson = JSON.parse(data);
      }
      let output = { data: dataJson, error: error };
      resolve(output);
    });
  }).catch((error) => {
    console.log(error);
  });
};

const outputRecord = (record) => {
  prepareOutput(record);
  const output = Object.assign({}, record.properties);
  output.label = stripslashes(output.label);
  if (typeof output._id === 'undefined') {
    output._id = record.identity;
  }
  delete output.identity;
  return output;
};

const outputRelation = (relation) => {
  prepareOutput(relation);
  let output = Object.assign({}, relation);
  output._id = relation.identity;
  delete output.identity;
  return output;
};

const outputPaths = (paths, _id = null) => {
  let output = paths.map((path) => {
    let segments = path.segments
      .filter((segment) => {
        let end = outputRecord(segment.end);
        if (end._id === _id) {
          return false;
        }
        return true;
      })
      .map((segment) => {
        let start = outputRecord(segment.start);
        start.entityType = segment.start.labels;
        let rel = outputRelation(segment.relationship);
        let end = outputRecord(segment.end);
        end.entityType = segment.end.labels;
        return { start: start, rel: rel, end: end };
      });
    return segments;
  });
  return output;
};

const normalizeLabelId = (label) => {
  if (typeof label !== 'string') {
    return '';
  }
  // trim spaces
  label = label.trim();
  label = label.replace(/[\W_]+/g, ' ');
  let output = '';
  let labelArr = label.split(' ');
  // for each space in string split the string parts and normalize them
  for (let i = 0; i < labelArr.length; i++) {
    let chunk = labelArr[i];
    chunk = chunk.trim();
    if (i === 0) {
      output += chunk;
    } else {
      output += chunk.charAt(0).toUpperCase() + chunk.slice(1);
    }
  }
  return output;
};

const lowerCaseOnlyFirst = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  let firstLetter = str.charAt(0).toLowerCase();
  let restOfString = str.slice(1);
  return firstLetter + restOfString;
};
const capitalCaseOnlyFirst = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  str = str.toLowerCase();
  let firstLetter = str.charAt(0).toUpperCase();
  let restOfString = str.slice(1);
  let newStr = '';
  for (let i = 0; i < restOfString.length; i++) {
    let char = restOfString[i];
    let prevIndex = i - 1;
    if (prevIndex > -1 && restOfString[prevIndex] === '.') {
      char = char.toUpperCase();
    }
    newStr += char;
  }
  return firstLetter + newStr;
};

const isUpperCase = (str) => /^[A-Z]*$/.test(str);

const loadRelations = async (
  srcId = null,
  srcType = null,
  targetType = null,
  status = false,
  relType = null,
  sort = null
) => {
  if (srcId === null || srcType === null) {
    return false;
  }
  const session = driver.session();
  const r = relType !== null ? `r:${relType}` : 'r';
  const orderBy = sort !== null ? `ORDER BY ${sort}` : 'ORDER BY id(r)';
  let query = `MATCH (n:${srcType})-[${r}]->(rn) WHERE id(n)=${srcId} return n, r, rn ${orderBy}`;
  if (status) {
    const sourceStatus =
      srcType !== 'Temporal' && srcType !== 'Spatial'
        ? `AND n.status='public'`
        : '';
    query = `MATCH (n:${srcType}) WHERE id(n)=${srcId} ${sourceStatus}
    OPTIONAL MATCH (n)-[${r}]->(rn) WHERE rn.status='public' return n, r, rn ORDER BY id(r)`;
  }
  if (targetType !== null) {
    query = `MATCH (n:${srcType})-[${r}]->(rn:${targetType}) WHERE id(n)=${srcId} return n, r, rn ORDER BY id(r)`;
    if (status) {
      const sourceStatus =
        srcType !== 'Temporal' && srcType !== 'Spatial'
          ? `AND n.status='public'`
          : '';
      const targetStatus =
        targetType !== 'Temporal' && targetType !== 'Spatial'
          ? `WHERE rn.status='public'`
          : '';
      query = `MATCH (n:${srcType}) WHERE id(n)=${srcId} ${sourceStatus}
      OPTIONAL MATCH (n)-[${r}]->(rn:${targetType}) ${targetStatus} return n, r, rn ${orderBy}`;
    }
  }
  const relations = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then(async (result) => {
      session.close();
      const records = result.records;
      const relations = [];
      for (let key in records) {
        const record = records[key].toObject();
        const sourceItem = outputRecord(record.n);
        const relation = record.r;
        prepareOutput(relation);
        let targetItem = null;
        if (record.rn !== null) {
          targetItem = outputRecord(record.rn);
          const newRelation = await prepareRelation(
            sourceItem,
            relation,
            targetItem
          );
          relations.push(newRelation);
        }
      }
      return relations;
    });
  return relations;
};

const prepareRelation = async (sourceItem, relation, targetItem) => {
  let newProperty = {
    _id: relation.identity,
    term: {
      label: relation.type,
    },
    ref: targetItem,
  };
  if (
    typeof relation.properties.role !== 'undefined' &&
    relation.properties.role !== null &&
    relation.properties.role !== 'null'
  ) {
    let roleId = relation.properties.role;
    let session = driver.session();
    let query = 'MATCH (n:TaxonomyTerm) WHERE id(n)=' + roleId + ' return n';
    let role =
      (await session
        .writeTransaction((tx) => tx.run(query, {}))
        .then((result) => {
          session.close();
          let records = result.records;
          if (records.length > 0) {
            let record = records[0];
            let key = record.keys[0];
            let output = record.toObject()[key];
            output = outputRecord(output);
            return output;
          }
        })) || null;
    if (role !== null) {
      newProperty.term.role = role.labelId;
      newProperty.term.roleLabel = role.label;
    }
  }
  return newProperty;
};

const parseRequestData = async (request) => {
  if (typeof request.headers !== 'undefined') {
    const FORM_URLENCODED = 'application/x-www-form-urlencoded';
    if (request.headers['content-type'] === FORM_URLENCODED) {
      try {
        let body = '';
        await request.on('data', (chunk) => {
          body += chunk.toString();
        });
        return JSON.parse(body);
      } catch (error) {
        return error;
      }
    } else {
      return null;
    }
  } else {
    console.log('Undefined request headers');
    return false;
  }
};

const escapeRegExp = (str) => {
  return str.replace(/[\\^$'"|?*+()[{]/g, '\\$&');
};

const addslashes = (str) => {
  return str.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
};

const stripslashes = (str) => {
  return (str + '').replace(/\\(.?)/g, (s, n1) => {
    switch (n1) {
      case '\\':
        return '\\';
      case '0':
        return '\u0000';
      case '':
        return '';
      default:
        return n1;
    }
  });
};

const temporalEvents = async (props, eventTypes) => {
  let dateType = props.dateType;
  let startDate = props.startDate;
  let endDate = props.endDate;
  let operator = '=';
  if (dateType === 'before') {
    operator = '<';
  }
  if (dateType === 'after') {
    operator = '>';
  }
  if (startDate === '' || startDate === null || startDate === 'null') {
    return [];
  }
  if (
    dateType === 'range' &&
    (startDate === '' ||
      startDate === null ||
      startDate === 'null' ||
      endDate === '' ||
      endDate === null ||
      endDate === 'null')
  ) {
    return [];
  }
  let eventTypesIds = eventTypes.map((_id) => `"${_id}"`);
  let query = `MATCH (n:Temporal)
    WHERE NOT n.startDate="" AND date(datetime({epochmillis: apoc.date.parse(n.startDate,"ms","dd-MM-yyyy")}))${operator}date(datetime({epochmillis: apoc.date.parse('${startDate}',"ms","dd/MM/yyyy")}))
    OPTIONAL MATCH (n)-->(e:Event) WHERE e.status='public'
    RETURN distinct id(e) as id`;
  if (eventTypes.length > 0) {
    query = `MATCH (n:Temporal)
      WHERE NOT n.startDate="" AND date(datetime({epochmillis: apoc.date.parse(n.startDate,"ms","dd-MM-yyyy")}))${operator}date(datetime({epochmillis: apoc.date.parse('${startDate}',"ms","dd/MM/yyyy")}))
      OPTIONAL MATCH (n)-->(e:Event) WHERE e.status='public' AND e.eventType IN [${eventTypesIds}]
      RETURN distinct id(e) as id`;
  }
  if (dateType === 'range') {
    query = `MATCH (n:Temporal)
      WHERE NOT n.startDate="" AND date(datetime({epochmillis: apoc.date.parse(n.startDate,"ms","dd-MM-yyyy")}))>=date(datetime({epochmillis: apoc.date.parse("${startDate}","ms","dd/MM/yyyy")})) AND date(datetime({epochmillis: apoc.date.parse(n.startDate,"ms","dd-MM-yyyy")}))<=date(datetime({epochmillis: apoc.date.parse("${endDate}","ms","dd/MM/yyyy")}))
      OPTIONAL MATCH (n)-->(e:Event) WHERE e.status='public'
      RETURN distinct id(e) as id`;
    if (eventTypes.length > 0) {
      query = `MATCH (n:Temporal)
          WHERE NOT n.startDate="" AND date(datetime({epochmillis: apoc.date.parse(n.startDate,"ms","dd-MM-yyyy")}))>=date(datetime({epochmillis: apoc.date.parse("${startDate}","ms","dd/MM/yyyy")})) AND date(datetime({epochmillis: apoc.date.parse(n.startDate,"ms","dd-MM-yyyy")}))<=date(datetime({epochmillis: apoc.date.parse("${endDate}","ms","dd/MM/yyyy")}))
          OPTIONAL MATCH (n)-->(e:Event) WHERE e.status='public' AND e.eventType IN [${eventTypesIds}]
          RETURN distinct id(e) as id`;
    }
  }
  let session = driver.session();
  let eventIds = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  let output = [];
  for (let i = 0; i < eventIds.length; i++) {
    let eventId = eventIds[i];
    prepareOutput(eventId);
    let _id = eventId.toObject()['id'];
    if (_id !== null) {
      output.push(_id);
    }
  }
  return output;
};

const eventsFromTypes = async (props) => {
  let ids = props.map((_id) => `"${_id}"`);
  let query = `MATCH (n:Event) WHERE n.eventType IN [${ids}] AND n.status='public' RETURN distinct id(n) as _id;`;
  let session = driver.session();
  let eventIds = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  let output = [];
  for (let i = 0; i < eventIds.length; i++) {
    let eventId = eventIds[i];
    prepareOutput(eventId);
    let _id = eventId.toObject()['_id'];
    if (_id !== null) {
      output.push(_id);
    }
  }
  return output;
};

const msToTime = (s) => {
  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;
  return `${hrs}:${mins}:${secs}.${ms}`;
};

// temporal functions
const getDaysInMonth = (m, y) => {
  return new Date(y, m + 1, 0).getDate();
};

const splitMultiString = (value = '') => {
  if (typeof value === 'string' && value !== '' && value.includes(';')) {
    return value.split(';');
  }
  return [value];
};

const prepareDate = (date) => {
  if (date === null) {
    return null;
  }
  const parts = date.split(' - ');
  const start = parts[0].trim();
  const sParts = start.split('-');
  let sy = sParts[0];
  let sm = sParts[1];
  let sd = sParts[2];
  if (sy.includes('c.')) {
    sy = sy.replace('c.', '');
  }
  if (sm === '??') {
    sm = `01`;
  }
  if (sd === '??') {
    sd = `01`;
  }
  const startDate = `${sd}-${sm}-${sy}`;
  let endDate = null;
  if (parts.length === 1) {
    const lm = sParts[1] !== '??' ? sm : '12';
    const ld = getDaysInMonth(lm, sy);
    endDate = `${ld}-${lm}-${sy}`;
  }
  if (parts.length > 1) {
    const lParts = parts[1].trim().split('-');
    let ly = lParts[0];
    let lm = lParts[1];
    let ld = lParts[2];
    if (ly.includes('c.')) {
      ly = ly.replace('c.', '');
    }
    if (lm === '??') {
      lm = `12`;
    }
    if (ld === '??') {
      ld = getDaysInMonth(lm, ly);
    }
    endDate = `${ld}-${sm}-${sy}`;
  }
  let label = '';
  if (!date.includes('?')) {
    label = date;
  } else {
    label = date.replace(/-\?\?/g, '');
  }
  return { startDate, endDate, label };
};

module.exports = {
  soundex,
  hashFileName,
  imageIptc,
  imageExif,
  imgDimensions,
  prepareNodeProperties,
  prepareOutput,
  prepareParams,
  normalizeRecordsOutput,
  normalizeGraphRecordsOutput,
  normalizeRelationsOutput,
  readJSONFile,
  outputRecord,
  outputRelation,
  outputPaths,
  normalizeLabelId,
  lowerCaseOnlyFirst,
  capitalCaseOnlyFirst,
  isUpperCase,
  loadRelations,
  parseRequestData,
  escapeRegExp,
  prepareRelation,
  addslashes,
  stripslashes,
  temporalEvents,
  eventsFromTypes,
  msToTime,
  getDaysInMonth,
  splitMultiString,
  prepareDate,
};
