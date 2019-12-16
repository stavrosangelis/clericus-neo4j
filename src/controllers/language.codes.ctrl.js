const helpers = require("../helpers");

const getLanguageCodes = async(req, resp) => {
  let file = await helpers.readJSONFile(process.env.ABSPATH+'src/config/language-codes.json');
  let languageCodes = [];
  if (file.error===null) {
    languageCodes = file.data;
  }
  resp.json({
    status: true,
    data: languageCodes,
    error: [],
    msg: "Query results",
  })
}

module.exports = {
  getLanguageCodes: getLanguageCodes
}
