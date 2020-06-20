const axios = require("axios");
const driver = require("../../config/db-driver");
const helpers = require("../../helpers");
const sanitizeHtml = require('sanitize-html');

const postContact = async (req, resp) => {
  let params = req.body;
  let name = params.name;
  let email = params.email;
  let subject = params.subject;
  let message = params.message;
  let token = params.token;

  let postData = {
    'secret': '6Le0OqYZAAAAABPmVWtIN0-5dvzb1nIIZxORUaEX',
    'response': token
  }
  let responseData = await axios({
    method: 'post',
    url: 'https://www.google.com/recaptcha/api/siteverify',
    params: postData
  })
  .then(function (response) {
    return response.data;
  })
  .catch(function (error) {
  });
  let status = false;
  let error = true;
  let msg = "";
  if (responseData.success) {
    status = true;
    error = false;
    let mail = {
      from: sanitizeHtml(name),
      email: sanitizeHtml(email),
      subject: sanitizeHtml(subject),
      html: sanitizeHtml(message),
    };
    if (validate(mail)) {
      let now = new Date().toISOString();
      mail.createdAt = now;
    }
    let session = driver.session();
    let nodeProperties = helpers.prepareNodeProperties(mail);
    let params = helpers.prepareParams(mail);
    let query = `CREATE (n:ContactForm ${nodeProperties}) RETURN n`;
    let addContactForm = await session.run(query,params).then(result => {
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
    status = addContactForm.status;
    responseData = addContactForm.data;
    error = addContactForm.error;
    msg = addContactForm.msg;
  }

  resp.json({
    status: status,
    data: responseData,
    error: error,
    msg: msg,
  });
}

const loadAppSettings = async() => {
  let session = driver.session();
  let query = `MATCH (n:Settings) RETURN n`;
  const settings = await session.run(query,{}).then(result => {
    session.close();
    let resultRecord = null;
    let records = result.records;
    if (records.length>0) {
      let record = records[0];
      let key = record.keys[0];
      resultRecord = record.toObject()[key];
      resultRecord = helpers.outputRecord(resultRecord);
    }
    return resultRecord;
  })
  .catch((error) => {
    console.log(error);
  });
  return settings;
}

const validate = (mail) => {
  let status = true;
  if (mail.from==="" || mail.email==="" || mail.subject==="" || mail.html==="") {
    status = false;
  }
  return status;
}

module.exports = {
  postContact: postContact,
}
