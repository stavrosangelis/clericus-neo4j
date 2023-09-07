const neo4j = require('neo4j-driver');
const Soundex = require('soundex');
const fs = require('fs');
const crypto = require('crypto');
const sizeOfImage = require('image-size');
const { ExifImage } = require('exif');
const IptcImage = require('node-iptc');
const { tar } = require('zip-a-folder');
const { exec } = require('child_process');

const driver = require('../config/db-driver');

const soundex = (data = null) => {
  if (data === null || data === '') {
    return '';
  }
  return Soundex(data);
};

const hashFileName = (data = null) => {
  if (data === null || data === '') {
    return false;
  }
  const newData = data + randomChars();
  return crypto.createHash('md5').update(newData).digest('hex');
};

const randomChars = (length = 10) => {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const imageIptc = (imgPath = null) => {
  if (imgPath === null) {
    return false;
  }
  return new Promise((resolve) => {
    fs.readFile(imgPath, function (error, data) {
      if (error) {
        console.log(error);
      }
      const iptcData = IptcImage(data);
      resolve(iptcData);
    });
  }).catch((error) => {
    console.log(error);
  });
};

const imageExif = (imgPath = null) => {
  if (imgPath === null) {
    return false;
  }
  return new Promise((resolve) => {
    ExifImage({ image: imgPath }, function (error, exifData) {
      if (error) {
        console.log(error);
      }
      resolve(exifData);
    });
  }).catch((error) => {
    console.log(error);
  });
};

const imgDimensions = async (imgPath = null) => {
  if (imgPath === null) {
    return false;
  }
  const dimensions = await sizeOfImage(imgPath);
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
    i += 1;
  }
  return `{${nodeProperties}}`;
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
  const params = {};
  for (let key in item) {
    params[key] = item[key];
  }
  return params;
};

const normalizeRecordsOutput = (records = []) => {
  const output = [];
  const { length = 0 } = records;
  for (let i = 0; i < length; i += 1) {
    const record = records[i];
    let labels = null;
    if (typeof record._fields[0].labels !== 'undefined') {
      labels = record._fields[0].labels;
    }
    const key = record.keys[0];
    prepareOutput(record);
    const outputItem = outputRecord(record.toObject()[key]);
    if (labels !== null) {
      outputItem.systemLabels = labels;
    }
    output.push(outputItem);
  }
  return output;
};

const normalizeGraphRecordsOutput = (records) => {
  const output = [];
  const { length } = records;
  for (let i = 0; i < length; i += 1) {
    const record = records[i];
    const key = record.keys[0];
    prepareOutput(record);
    const outputItem = outputRecord(record.toObject()[key]);
    if (record.keys.indexOf('count') > -1) {
      outputItem.count = record.toObject()['count'];
    }
    output.push(outputItem);
  }
  return output;
};

const normalizeRelationsOutput = (records) => {
  const output = [];
  const { length } = records;
  for (let i = 0; i < length; i += 1) {
    const record = records[i];
    const relation = record._fields[0];
    prepareOutput(relation);
    output.push(relation);
  }
  return output;
};

const readJSONFile = (path = '') => {
  if (path === '') {
    return { data: null, error: 'The file path cannot be empty' };
  }
  return new Promise((resolve) => {
    fs.readFile(path, 'utf-8', (error, data) => {
      let dataJson = null;
      if (error === null) {
        dataJson = JSON.parse(data);
      }
      const output = { data: dataJson, error: error };
      resolve(output);
    });
  }).catch((error) => {
    console.log(error);
  });
};

const outputRecord = (record) => {
  prepareOutput(record);
  const { properties, identity } = record;
  const output = { ...properties };
  output.label = stripslashes(output.label);
  if (typeof output._id === 'undefined') {
    output._id = identity;
  }
  delete output.identity;
  return output;
};

const outputRelation = (relation) => {
  prepareOutput(relation);
  const output = Object.assign({}, relation);
  output._id = relation.identity;
  delete output.identity;
  return output;
};

const outputPaths = (paths, _id = null) => {
  const output = paths.map((path) => {
    const segments = path.segments
      .filter((segment) => {
        const end = outputRecord(segment.end);
        if (end._id === _id) {
          return false;
        }
        return true;
      })
      .map((segment) => {
        const start = outputRecord(segment.start);
        start.entityType = segment.start.labels;
        const rel = outputRelation(segment.relationship);
        const end = outputRecord(segment.end);
        end.entityType = segment.end.labels;
        return { start, rel, end };
      });
    return segments;
  });
  return output;
};

const normalizeLabelId = (labelParam = '') => {
  let label = labelParam;
  if (typeof label !== 'string') {
    return '';
  }
  // trim spaces
  label = label.trim();
  label = label.replace(/[\W_]+/g, ' ');
  let output = '';
  let labelArr = label.split(' ');
  // for each space in string split the string parts and normalize them
  const { length } = labelArr;
  for (let i = 0; i < length; i += 1) {
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
  const newProperty = {
    _id: relation.identity,
    term: {
      label: relation.type,
    },
    ref: targetItem,
  };
  const roleId = relation?.properties?.role || null;
  if (roleId !== null && !Number.isNaN(roleId)) {
    const session = driver.session();
    const query = `MATCH (n:TaxonomyTerm) WHERE id(n)=${roleId} RETURN n`;
    const role = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records = [] } = result;
        if (records.length > 0) {
          const record = records[0];
          const key = record.keys[0];
          let output = record.toObject()[key];
          output = outputRecord(output);
          return output;
        }
        return null;
      });
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
  const { dateType = '', startDate = '', endDate = '' } = props;
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
  const eventTypesIds = eventTypes.map((_id) => `"${_id}"`);
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
  const session = driver.session();
  const eventIds = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  const output = [];
  const { length } = eventIds;
  for (let i = 0; i < length; i += 1) {
    const eventId = eventIds[i];
    prepareOutput(eventId);
    const _id = eventId.toObject()['id'] || null;
    if (_id !== null) {
      output.push(_id);
    }
  }
  return output;
};

const eventsFromTypes = async (props) => {
  const ids = props.map((_id) => `"${_id}"`);
  const query = `MATCH (n:Event) WHERE n.eventType IN [${ids}] AND n.status='public' RETURN distinct id(n) as _id;`;
  const session = driver.session();
  const eventIds = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  const output = [];
  const { length } = eventIds;
  for (let i = 0; i < length; i += 1) {
    const eventId = eventIds[i];
    prepareOutput(eventId);
    let _id = eventId.toObject()['_id'];
    if (_id !== null) {
      output.push(_id);
    }
  }
  return output;
};

const msToTime = (s) => {
  const ms = s % 1000;
  s = (s - ms) / 1000;
  const secs = s % 60;
  s = (s - secs) / 60;
  const mins = s % 60;
  const hrs = (s - mins) / 60;
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

const prepareDate = (dateParam = null) => {
  if (dateParam === null || dateParam === '') {
    return null;
  }
  const date = dateParam.toString();
  const parts = date.split(' - ') || [];
  if (parts.length === 0) {
    return null;
  }
  const start = parts[0].trim();
  const sParts = start.split('-');
  let sy = sParts[0];
  let sm = sParts[1] || '??';
  let sd = sParts[2] || '??';
  if (sy.includes('c.')) {
    sy = sy.replace('c.', '');
  }
  if (sy.includes('?')) {
    sy = sy.replaceAll('?', '0');
  }
  if (sm === '??') {
    sm = `01`;
  }
  if (sd === '??') {
    sd = `01`;
  }
  const startDate = `${sd}-${sm}-${sy}`;
  let label = startDate;
  let endDate = null;
  if (!isNaN(sParts[0]) && !isNaN(sParts[1]) && !isNaN(sParts[2])) {
    endDate = startDate;
  } else {
    if (parts.length === 1) {
      let ly = sy;
      if (sParts[0].includes('?')) {
        ly = sParts[0].replaceAll('?', '9');
      }
      const lm = sParts[1] !== '??' ? sm : '12';
      const ld = getDaysInMonth(lm, ly);
      endDate = `${ld}-${lm}-${ly}`;
    }
    if (parts.length > 1) {
      const lParts = parts[1].trim().split('-');
      let ly = lParts[0];
      let lm = lParts[1];
      let ld = lParts[2];
      if (ly.includes('c.')) {
        ly = ly.replace('c.', '');
      }
      if (ly.includes('?')) {
        ly = ly.replaceAll('?', '9');
      }
      if (lm === '??') {
        lm = `12`;
      }
      if (ld === '??') {
        ld = getDaysInMonth(lm, ly);
      }
      endDate = `${ld}-${sm}-${sy}`;
    }
    if (!date.includes('?')) {
      label = date;
    } else {
      label = date.replace(/-\?\?/g, '');
    }
  }
  return { startDate, endDate, label };
};

const compressDirectory = async (directory) => {
  try {
    await tar(directory, `${directory}.tar.gz`);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const expandDirectory = async (source = '') => {
  try {
    if (source === '') {
      throw new Error('Source path is not defined');
    }
    if (!fs.existsSync(source)) {
      throw new Error(
        'Please provide a valid path to the compressed directory'
      );
    }
    const pathArray = source.split(`/`);
    const { length } = pathArray;
    const sliced = pathArray.slice(0, length - 1);
    const path = sliced.join('/');
    const expand = await new Promise((resolve, reject) => {
      exec(`tar -xf ${source} -C ${path}`, (error) => {
        if (error) {
          console.error(`exec error: ${error}`);
          reject(false);
        }
        resolve(true);
      });
    });
    return expand;
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports = {
  compressDirectory,
  expandDirectory,
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
