const driver = require('../config/db-driver');
const {
  addslashes,
  loadRelations,
  normalizeRecordsOutput,
  outputRecord,
  prepareNodeProperties,
  prepareOutput,
  prepareParams,
  soundex,
} = require('../helpers');

class Person {
  constructor({
    _id = null,
    honorificPrefix = [],
    firstName = '',
    middleName = '',
    lastName = '',
    nameSuffix = [],
    fnameSoundex = null,
    lnameSoundex = null,
    alternateAppelations = [],
    description = '',
    gender = '',
    personType = 'Clergy',
    nationality = '',
    status = 'private',
    createdBy = null,
    createdAt = null,
    updatedBy = null,
    updatedAt = null,
  }) {
    this._id = null;
    if (_id !== null) {
      this._id = _id;
    }
    if (firstName !== '' && isNaN(firstName)) {
      firstName = firstName.trim();
    }
    if (middleName !== '' && isNaN(middleName)) {
      middleName = middleName.trim();
    }
    if (lastName !== '' && isNaN(lastName)) {
      lastName = lastName.trim();
    }
    if (description !== '' && isNaN(description)) {
      description = description.trim();
    }
    this.honorificPrefix = honorificPrefix;
    this.firstName = firstName;
    this.middleName = middleName;
    this.lastName = lastName;
    this.nameSuffix = nameSuffix;
    this.label = this.personLabel({
      honorificPrefix,
      firstName,
      middleName,
      lastName,
      nameSuffix,
    });
    this.fnameSoundex = fnameSoundex;
    this.lnameSoundex = lnameSoundex;
    this.description = description;
    this.gender = gender;
    this.personType = personType;
    this.nationality = nationality;
    this.status = status;
    this.alternateAppelations = this.normalizeAppelations(alternateAppelations);
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedBy = updatedBy;
    this.updatedAt = updatedAt;
  }

  personLabel(props) {
    const {
      honorificPrefix = [],
      firstName = '',
      middleName = '',
      lastName = '',
      nameSuffix = [],
    } = props;
    let label = '';
    if (typeof honorificPrefix !== 'string' && honorificPrefix.length > 0) {
      const labelHP = honorificPrefix.filter((i) => i !== '').join(', ');
      label += `(${labelHP})`;
    }
    if (firstName !== '') {
      if (label !== '') {
        label += ' ';
      }
      label += firstName.trim();
    }
    if (middleName !== '') {
      if (label !== '') {
        label += ' ';
      }
      label += middleName.trim();
    }
    if (lastName !== '') {
      if (label !== '') {
        label += ' ';
      }
      label += lastName.trim();
    }
    if (typeof nameSuffix !== 'string' && nameSuffix.length > 0) {
      const labelNS = nameSuffix.filter((i) => i !== '').join(', ');
      if (label !== '') {
        label += ' ';
      }
      label += `(${labelNS})`;
    }
    label = label.replace(/ {2}/g, ' ');
    return label;
  }

  normalizeAppelations(alternateAppelations) {
    const appelations = alternateAppelations.map((appelation) => {
      const {
        firstName = null,
        middleName = null,
        lastName = null,
      } = appelation;
      if (appelation.label === '') {
        appelation.label = this.personLabel({
          firstName,
          middleName,
          lastName,
        });
      }
      return appelation;
    });
    return appelations;
  }

  validate() {
    let status = true;
    let errors = [];
    if (
      this.firstName !== null &&
      this.firstName !== '' &&
      this.firstName.length < 1
    ) {
      status = false;
      errors.push({
        field: 'firstName',
        msg: 'First name must contain at least 1 characters',
      });
    }
    if (
      this.firstName !== null &&
      this.middleName !== '' &&
      this.firstName.length < 1
    ) {
      status = false;
      errors.push({
        field: 'middleName',
        msg: 'If middle name is entered it must contain at least 1 characters',
      });
    }
    if (
      this.lastName !== null &&
      this.lastName !== '' &&
      this.lastName.length < 1
    ) {
      status = false;
      errors.push({
        field: 'lastName',
        msg: 'Last name must contain at least 1 characters',
      });
    }
    if (this.firstName !== null && this.alternateAppelations.length > 0) {
      for (let key in this.alternateAppelations) {
        let alternateAppelation = this.alternateAppelations[key];
        if (
          typeof alternateAppelation.appelation !== 'undefined' &&
          alternateAppelation.appelation !== '' &&
          alternateAppelation.appelation.length < 1
        ) {
          status = false;
          errors.push({
            field: 'appelation',
            msg:
              'Appelation must contain at least 1 characters for alternate appelation "' +
              alternateAppelation.appelation +
              '"',
          });
        }
        if (
          alternateAppelation.appelation === '' &&
          typeof alternateAppelation.firstName !== 'undefined' &&
          alternateAppelation.firstName !== null &&
          alternateAppelation.firstName !== '' &&
          alternateAppelation.firstName.length < 1
        ) {
          status = false;
          errors.push({
            field: 'firstName',
            msg:
              'First name must contain at least 1 characters for alternate appelation "' +
              alternateAppelation.appelation +
              '"',
          });
        }
        if (
          alternateAppelation.appelation === '' &&
          typeof alternateAppelation.middleName !== 'undefined' &&
          alternateAppelation.middleName !== null &&
          alternateAppelation.middleName !== '' &&
          this.firstName.length < 1
        ) {
          status = false;
          errors.push({
            field: 'middleName',
            msg:
              'If middle name is entered it must contain at least 1 characters for alternate appelation "' +
              alternateAppelation.appelation +
              '"',
          });
        }
        if (
          alternateAppelation.appelation === '' &&
          typeof alternateAppelation.lastName !== 'undefined' &&
          alternateAppelation.lastName !== null &&
          alternateAppelation.lastName !== '' &&
          alternateAppelation.lastName.length < 1
        ) {
          status = false;
          errors.push({
            field: 'lastName',
            msg:
              'Last name must contain at least 1 characters for alternate appelation "' +
              alternateAppelation.appelation +
              '"',
          });
        }
      }
    }

    let msg = 'The record is valid';
    if (!status) {
      msg = 'The record is not valid';
    }
    let output = {
      status: status,
      msg: msg,
      errors: errors,
      data: [],
    };
    return output;
  }

  async load() {
    if (this._id === null) {
      return false;
    }
    const session = driver.session();
    const query = `MATCH (n:Person) WHERE id(n)=${this._id} RETURN n`;
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records } = result;
        if (records.length > 0) {
          const record = records[0].toObject();
          return outputRecord(record.n);
        }
        return null;
      })
      .catch((error) => {
        console.log(error);
      });
    for (let key in node) {
      this[key] = node[key];
      let newAppelations = [];
      if (key === 'alternateAppelations' && node[key].length > 0) {
        for (let akey in node[key]) {
          let alternateAppelation = JSON.parse(node[key][akey]);
          newAppelations.push(alternateAppelation);
        }
        this[key] = newAppelations;
      }
    }
    // relations
    const events = await loadRelations(this._id, 'Person', 'Event');
    const organisations = await loadRelations(
      this._id,
      'Person',
      'Organisation'
    );
    const people = await loadRelations(this._id, 'Person', 'Person');
    const resources = await loadRelations(this._id, 'Person', 'Resource');
    this.events = events;
    this.organisations = organisations;
    this.people = people;
    this.resources = resources;
  }

  async loadUnpopulated() {
    if (this._id === null) {
      return false;
    }
    const session = driver.session();
    const query = `MATCH (n:Person) WHERE id(n)=${this._id} RETURN n`;
    const node = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        const { records = [] } = result;
        if (records.length > 0) {
          const record = records[0].toObject();
          return outputRecord(record.n);
        }
      })
      .catch((error) => {
        console.log(error);
      });
    for (let key in node) {
      this[key] = node[key];
      const newAppelations = [];
      if (key === 'alternateAppelations' && node[key].length > 0) {
        for (let akey in node[key]) {
          let alternateAppelation = JSON.parse(node[key][akey]);
          newAppelations.push(alternateAppelation);
        }
        this[key] = newAppelations;
      }
    }
  }

  async save(userId) {
    const validatePerson = this.validate();
    if (!validatePerson.status) {
      return validatePerson;
    } else {
      const session = driver.session();
      const newAppelations = [];
      if (this.alternateAppelations.length > 0) {
        for (let key in this.alternateAppelations) {
          let alternateAppelation = this.alternateAppelations[key];
          if (
            typeof alternateAppelation.appelation === 'undefined' ||
            alternateAppelation.appelation === ''
          ) {
            let newAltAppelation = '';
            if (typeof alternateAppelation === 'string') {
              alternateAppelation = JSON.parse(alternateAppelation);
            }
            if (
              typeof alternateAppelation.firstName !== 'undefined' &&
              alternateAppelation.firstName !== null &&
              alternateAppelation.firstName !== ''
            ) {
              newAltAppelation += alternateAppelation.firstName;
            }
            if (
              typeof alternateAppelation.middleName !== 'undefined' &&
              alternateAppelation.middleName !== null &&
              alternateAppelation.middleName !== ''
            ) {
              if (newAltAppelation !== '') {
                newAltAppelation += ' ';
              }
              newAltAppelation += alternateAppelation.middleName;
            }
            if (
              typeof alternateAppelation.lastName !== 'undefined' &&
              alternateAppelation.lastName !== null &&
              alternateAppelation.lastName !== ''
            ) {
              if (newAltAppelation !== '') {
                newAltAppelation += ' ';
              }
              newAltAppelation += alternateAppelation.lastName;
            }
            alternateAppelation.appelation = newAltAppelation;
          }
          let alternateAppelationStringified =
            JSON.stringify(alternateAppelation);
          newAppelations.push(alternateAppelationStringified);
        }
      }
      this.alternateAppelations = newAppelations;
      this.label = this.personLabel(this);

      // timestamps
      const now = new Date().toISOString();
      if (typeof this._id === 'undefined' || this._id === null) {
        this.createdBy = userId;
        this.createdAt = now;
      } else {
        const original = new Person({ _id: this._id });
        await original.load();
        this.createdBy = original.createdBy;
        this.createdAt = original.createdAt;
      }
      this.updatedBy = userId;
      this.updatedAt = now;

      const nodeProperties = prepareNodeProperties(this);
      const params = prepareParams(this);

      let query = '';
      if (typeof this._id === 'undefined' || this._id === null) {
        query = `CREATE (n:Person ${nodeProperties}) RETURN n`;
      } else {
        query = `MATCH (n:Person) WHERE id(n)=${this._id} SET n=${nodeProperties} RETURN n`;
      }
      const resultPromise = await session
        .run(query, params)
        .then((result) => {
          session.close();
          const { records } = result;
          let output = {
            error: ['The record cannot be updated'],
            status: false,
            data: [],
          };
          if (records.length > 0) {
            const [record] = records;
            const [key] = record.keys;
            let resultRecord = record.toObject()[key];
            resultRecord = outputRecord(resultRecord);
            output = { error: [], status: true, data: resultRecord };
          }
          return output;
        })
        .catch((error) => {
          console.log(error);
        });
      return resultPromise;
    }
  }

  async delete() {
    let session = driver.session();
    // 1. delete relations
    let query1 =
      'MATCH (n:Person)-[r]-() WHERE id(n)=' + this._id + ' DELETE r';
    await session
      .writeTransaction((tx) => tx.run(query1, {}))
      .then((result) => {
        return result;
      })
      .catch((error) => {
        console.log(error);
      });
    // 2. delete node
    let query = 'MATCH (n:Person) WHERE id(n)=' + this._id + ' DELETE n';
    let deleteRecord = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        return result;
      })
      .catch((error) => {
        console.log(error);
      });
    return deleteRecord;
  }
}

/**
* @api {get} /people Get people
* @apiName get people
* @apiGroup People
*
* @apiParam {_id} [_id] A unique _id.
* @apiParam {string} [label] A string to match against the peoples' labels.
* @apiParam {string} [firstName] A string to match against the peoples' first names.
* @apiParam {string} [lastName] A string to match against the peoples' last names.
* @apiParam {string} [fnameSoundex] A string to match against the peoples' first name soundex.
* @apiParam {string} [lnameSoundex] A string to match against the peoples' last name soundex.
* @apiParam {string} [description] A string to match against the peoples' description.
* @apiParam {number} [classpieceId] The id of a related classpiece.
* @apiParam {string} [orderField=firstName] The field to order the results by.
* @apiParam {boolean} [orderDesc=false] If the results should be ordered in a descending order.
* @apiParam {number} [page=1] The current page of results
* @apiParam {number} [limit=25] The number of results per page
* @apiSuccessExample {json} Success-Response:
{
  "status": true,
  "data": {
    "currentPage": 1,
    "data": [
      {"lastName": "Fox", "firstName": "Aidan", "honorificPrefix": [""], "middleName": "", "label": "Aidan Fox",…},
    …],
    "totalItems": "221",
    "totalPages": 9
  },
  "error": [],
  "msg": "Query results"
}
*/
const getPeople = async (req, resp) => {
  const { query: params } = req;
  const {
    _id = '',
    label: labelParam = '',
    firstName: firstNameParam = '',
    lastName: lastNameParam = '',
    fnameSoundex: fnameSoundexParam = '',
    lnameSoundex: lnameSoundexParam = '',
    description: descriptionParam = '',
    personType: personTypeParam = '',
    orderField = 'lastName',
    orderDesc = '',
    page: pageParam = 1,
    limit: limitParam = 25,
    status = '',
    classpieceId: classpieceIdParam = '',
  } = params;
  let page = Number(pageParam);
  let queryPage = 0;
  const limit = Number(limitParam);
  const label = labelParam !== '' ? addslashes(labelParam).trim() : '';
  const firstName =
    firstNameParam !== '' ? addslashes(firstNameParam).trim() : '';
  const lastName = lastNameParam !== '' ? addslashes(lastNameParam).trim() : '';
  const fnameSoundex =
    fnameSoundexParam !== '' ? addslashes(fnameSoundexParam).trim() : '';
  const lnameSoundex =
    lnameSoundexParam !== '' ? addslashes(lnameSoundexParam).trim() : '';
  const description =
    descriptionParam !== '' ? addslashes(descriptionParam).trim() : '';
  const personType =
    personTypeParam !== '' ? addslashes(personTypeParam).trim() : '';
  const classpieceId = classpieceIdParam !== '' ? Number(classpieceIdParam) : 0;

  let query = '';
  let queryParams = '';
  let queryOrder = '';

  if (_id !== '') {
    const personId = _id.trim();
    queryParams = `id(n)=${personId} `;
  } else {
    if (label !== '') {
      queryParams += `toLower(n.label) =~ toLower('.*${label}.*') `;
    }
    if (firstName !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += `exists(n.firstName) AND toLower(n.firstName) =~ toLower('.*${firstName}.*') `;
    }
    if (lastName !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += `exists(n.lastName) AND toLower(n.lastName) =~ toLower('.*${lastName}.*') `;
    }
    if (fnameSoundex !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += `exists(n.fnameSoundex) AND toLower(n.fnameSoundex) =~ toLower('.*${fnameSoundex}.*') `;
    }
    if (lnameSoundex !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += `exists(n.lnameSoundex) AND toLower(n.lnameSoundex) =~ toLower('.*${lnameSoundex}.*') `;
    }
    if (description !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += `exists(n.description) AND toLower(n.description) =~ toLower('.*${description}.*') `;
    }
    if (status !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += `toLower(n.status) =~ toLower('.*${status}.*') `;
    }
    if (personType !== '') {
      if (queryParams !== '') {
        queryParams += ' AND ';
      }
      queryParams += `exists(n.personType) AND toLower(n.personType) =~ toLower('.*${personType}.*') `;
    }
    if (orderField !== '') {
      queryOrder = `ORDER BY n.${orderField}`;
      if (orderDesc === 'true') {
        queryOrder += ' DESC';
      }
    }

    if (page > 0) {
      queryPage = page - 1;
    }
  }

  const currentPage = page === 0 ? 1 : page;
  const skip = limit * queryPage;
  if (classpieceId === 0 && queryParams !== '') {
    queryParams = `WHERE ${queryParams}`;
  }
  if (classpieceId === 0) {
    query = `MATCH (n:Person) ${queryParams} RETURN n ${queryOrder} SKIP ${skip} LIMIT ${limit}`;
  } else {
    if (queryParams !== '') {
      queryParams = `WHERE id(r)=${classpieceId} AND ${queryParams}`;
    } else {
      queryParams = `WHERE id(r)=${classpieceId}`;
    }
    query = `MATCH (n:Person)-->(r:Resource) ${queryParams} RETURN n ${queryOrder} SKIP ${skip} LIMIT ${limit}`;
  }
  const data = await getPeopleQuery(query, queryParams, limit, classpieceId);
  if (data.error) {
    return resp.status(400).json({
      status: false,
      data: [],
      error: data.error,
      msg: data.error.message,
    });
  } else {
    const responseData = {
      currentPage,
      data: data.nodes,
      totalItems: data.count,
      totalPages: data.totalPages,
    };
    resp.json({
      status: true,
      data: responseData,
      error: [],
      msg: 'Query results',
    });
  }
};

const getPeopleQuery = async (query, queryParams, limit, classpieceId) => {
  const session = driver.session();
  const nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });

  const nodes = normalizeRecordsOutput(nodesPromise);

  // get related resources
  const { length } = nodes;
  for (let i = 0; i < length; i += 1) {
    const node = nodes[i];
    const { honorificPrefix = null } = node;
    if (typeof honorificPrefix === 'string' && honorificPrefix !== '') {
      const newHP = honorificPrefix.split(';');
      node.honorificPrefix = newHP;
    }
    let relations = {};
    relations.nodeId = node._id;
    node.resources =
      (await loadRelations(node._id, 'Person', 'Resource')) || [];
    node.affiliations =
      (await loadRelations(
        node._id,
        'Person',
        'Organisation',
        false,
        'hasAffiliation'
      )) || [];
  }

  let queryCount = `MATCH (n:Person) ${queryParams} RETURN count(*)`;
  if (classpieceId > 0) {
    queryCount = `MATCH (n:Person)-->(r:Resource) ${queryParams} RETURN count(*)`;
  }

  const count = await session
    .writeTransaction((tx) => tx.run(queryCount))
    .then((result) => {
      session.close();
      const [resultRecord] = result.records;
      let countObj = resultRecord.toObject();
      prepareOutput(countObj);
      return countObj['count(*)'];
    });

  const totalPages = Math.ceil(count / limit);
  return {
    nodes,
    count,
    totalPages,
  };
};

/**
* @api {get} /person Get person
* @apiName get person
* @apiGroup People
*
* @apiParam {string} _id The _id of the requested person.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"_id":"2069","honorificPrefix":["My"],"firstName":"fname","middleName":"mname","lastName":"lname","label":"fname mname lname","fnameSoundex":"F550","lnameSoundex":"L550","description":"description","status":"private","alternateAppelations":[{"appelation":"","firstName":"altfname","middleName":"altmname","lastName":"altlname","note":"note","language":{"value":"en","label":"English"}}],"createdBy":"260","createdAt":"2020-01-14T15:39:10.638Z","updatedBy":"260","updatedAt":"2020-01-14T15:42:42.939Z","events":[],"organisations":[],"people":[],"resources":[]},"error":[],"msg":"Query results"}
*/
const getPerson = async (req, resp) => {
  const { query: parameters } = req;
  const { _id = '' } = parameters;
  if (_id === '') {
    return resp.status(400).json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
  }
  const person = new Person({ _id });
  await person.load();
  const { honorificPrefix = null } = person;
  if (typeof honorificPrefix === 'string' && honorificPrefix !== '') {
    const newHP = honorificPrefix.split(';');
    person.honorificPrefix = newHP;
  }
  return resp.status(200).json({
    status: true,
    data: person,
    error: [],
    msg: 'Query results',
  });
};

/**
* @api {put} /person Put person
* @apiName put person
* @apiGroup People
* @apiPermission admin
*
* @apiParam {string} [_id] The _id of the person. This should be undefined|null|blank in the creation of a new person.
* @apiParam {array} [honorificPrefix] The various honorific prefixes a person has.
* @apiParam {string} firstName The person's first name.
* @apiParam {string} [middleName] The person's middle name.
* @apiParam {string} lastName The person's lastName name.
* @apiParam {string} [description] A description about the person.
* @apiParam {string} [status=private] The status of the person.
* @apiParam {array} [alternateAppelations] The person's alternate appelations.
* @apiParam {string}  [alternateAppelation[appelation]] The person's alternate appelation label.
* @apiParam {string}  alternateAppelation[firstName] The person's alternate appelation first name.
* @apiParam {string}  [alternateAppelation[middleName]] The person's alternate appelation middle name.
* @apiParam {string}  alternateAppelation[lastName] The person's alternate appelation lastName name.
* @apiParam {string}  [alternateAppelation[note]] The person's alternate appelation note.
* @apiParam {object}  [alternateAppelation[language]] The person's alternate appelation language.
* @apiSuccessExample {json} Success-Response:
{"error":[],"status":true,"data":{"lastName":"lname","updatedBy":"260","description":"description","honorificPrefix":["Mr"],"label":"fname mname lname","alternateAppelations":[],"firstName":"fname","createdAt":"2020-01-14T15:39:10.638Z","createdBy":"260","middleName":"mname","lnameSoundex":"L550","fnameSoundex":"F550","status":"private","updatedAt":"2020-01-14T15:39:10.638Z","_id":"2069"}}
*/
const putPerson = async (req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The person must not be empty',
    });
    return false;
  }
  let personData = {};
  for (let key in postData) {
    if (postData[key] !== null) {
      personData[key] = postData[key];
      // add the soundex
      if (key === 'firstName') {
        personData.fnameSoundex = soundex(postData.firstName.trim());
      }
      if (key === 'lastName') {
        personData.lnameSoundex = soundex(postData.lastName.trim());
      }
    }
  }
  let userId = req.decoded.id;
  let person = new Person(personData);
  let output = await person.save(userId);
  resp.json(output);
};

/**
* @api {delete} /person Delete person
* @apiName delete person
* @apiGroup People
* @apiPermission admin
*
* @apiParam {string} _id The id of the person for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"records":[],"summary":{"statement":{"text":"MATCH (n:Person) WHERE id(n)=2069 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":17,"high":0}}},"error":[],"msg":"Query results"}*/
const deletePerson = async (req, resp) => {
  const { body } = req;
  const { _id = '' } = body;
  if (_id === '') {
    return resp.status(400).json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select a valid id to continue.',
    });
  }
  const person = new Person({ _id });
  const { data = null, error = [], status = true } = await person.delete();
  return resp.status(200).json({
    status,
    data,
    error,
    msg: '',
  });
};
/**
* @api {delete} /people Delete people
* @apiName delete people
* @apiGroup People
* @apiPermission admin
*
* @apiParam {array} _ids The ids of the people for deletion.
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":[{"records":[],"summary":{"statement":{"text":"MATCH (n:Event) WHERE id(n)=1149 DELETE n","parameters":{}},"statementType":"w","counters":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"updateStatistics":{"_stats":{"nodesCreated":0,"nodesDeleted":1,"relationshipsCreated":0,"relationshipsDeleted":0,"propertiesSet":0,"labelsAdded":0,"labelsRemoved":0,"indexesAdded":0,"indexesRemoved":0,"constraintsAdded":0,"constraintsRemoved":0}},"plan":false,"profile":false,"notifications":[],"server":{"address":"localhost:7687","version":"Neo4j/3.5.12"},"resultConsumedAfter":{"low":0,"high":0},"resultAvailableAfter":{"low":6,"high":0}}}],"error":[],"msg":"Query results"}
*/
const deletePeople = async (req, resp) => {
  let deleteData = req.body;
  if (typeof deleteData._ids === 'undefined' || deleteData._ids.length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select valid ids to continue.',
    });
    return false;
  }
  let responseData = [];
  for (let i = 0; i < deleteData._ids.length; i++) {
    let _id = deleteData._ids[i];
    let person = new Person({ _id: _id });
    responseData.push(await person.delete());
  }
  resp.json({
    status: true,
    data: responseData,
    error: [],
    msg: 'Query results',
  });
};

const patchUnknown = async (req, resp) => {
  // 1. firstname
  let queryFN =
    'match (n:Person) where n.firstName="Unknown" set n.firstName="" return n';
  let session = driver.session();
  let transactionFN = await session
    .writeTransaction((tx) => tx.run(queryFN, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });

  // 2. lastname
  let queryLN =
    'match (n:Person) where n.lastName="Unknown" set n.lastName="" return n';
  let transactionLN = await session
    .writeTransaction((tx) => tx.run(queryLN, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });

  // 3. label
  let queryLabel =
    "match (n:Person) where toLower(n.label) =~ toLower('.*Unknown.*') return n";
  let transactionLabel = await session
    .writeTransaction((tx) => tx.run(queryLabel, {}))
    .then((result) => {
      session.close();
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });
  let nodes = normalizeRecordsOutput(transactionLabel);
  let normalizedNodes = [];
  let results = [];
  for await (const n of nodes) {
    if (n.label.includes('Unknown')) {
      n.label = n.label.replace(/Unknown/g, '');
      n.label = n.label.trim();
    }
    normalizedNodes.push(n);

    let node = new Person(n);
    let userId = req.decoded.id;
    let output = await node.save(userId);
    results.push(output);
  }

  //
  resp.json({
    status: true,
    data: {
      firstname: transactionFN,
      lastname: transactionLN,
      queryLabelCount: normalizedNodes.length,
      queryLabel: normalizedNodes,
      queryLabelUpdates: results,
    },
    error: [],
    msg: 'Query results',
  });
};

const updateStatus = async (req, resp) => {
  let postData = req.body;
  if (
    typeof postData._ids === 'undefined' ||
    postData._ids.length === 0 ||
    typeof postData.status === 'undefined' ||
    postData.status === ''
  ) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please select valid ids and new status to continue.',
    });
    return false;
  }
  let userId = req.decoded.id;
  let responseData = [];
  let session = driver.session();
  for (let i = 0; i < postData._ids.length; i++) {
    let _id = postData._ids[i];
    let now = new Date().toISOString();
    let updatedBy = userId;
    let updatedAt = now;
    let query = `MATCH (n:Person) WHERE id(n)=${_id} SET n.status="${postData.status}", n.updatedBy="${updatedBy}", n.updatedAt="${updatedAt}"`;
    let update = await session.run(query, {}).then((result) => {
      return result;
    });
    responseData.push(update);
  }
  session.close();
  resp.json({
    status: true,
    data: responseData,
    error: [],
    msg: 'Query results',
  });
};

const fixLabels = async (req, resp) => {
  let output = [];
  let query = "MATCH (n:Person) WHERE  n.label =~ '.*  .*'  RETURN n";
  let session = driver.session();
  let nodesPromise = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      return result.records;
    })
    .catch((error) => {
      console.log(error);
    });

  let nodes = normalizeRecordsOutput(nodesPromise);
  let userId = req.decoded.id;
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    let label = node.label;
    let firstName = node.firstName.trim();
    let lastName = node.lastName.trim();
    label = label.replace(/ {2}/g, ' ');
    let now = new Date().toISOString();
    let updatedBy = userId;
    let updatedAt = now;

    let query = `MATCH (n:Person) WHERE id(n)=${node._id} SET n.label="${label}", n.firstName="${firstName}", n.lastName="${lastName}", n.updatedBy="${updatedBy}", n.updatedAt="${updatedAt}" return n`;
    const resultPromise = await session
      .run(query, {})
      .then((result) => {
        let records = result.records;
        let ret = null;
        if (records.length > 0) {
          let record = records[0];
          let key = record.keys[0];
          let resultRecord = record.toObject()[key];
          resultRecord = outputRecord(resultRecord);
          ret = resultRecord;
        }
        return ret;
      })
      .catch((error) => {
        console.log(error);
      });
    output.push(resultPromise);
  }
  session.close();
  resp.json({
    status: true,
    data: output,
    error: [],
    msg: 'Query results',
  });
};
module.exports = {
  Person,
  getPeople,
  getPerson,
  putPerson,
  deletePerson,
  deletePeople,
  patchUnknown,
  updateStatus,
  fixLabels,
};
