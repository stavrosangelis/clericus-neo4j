const helpers = require('../helpers');
/**
* @api {get} /language-codes Get language codes
* @apiName get language-codes
* @apiGroup Language codes
*
* @apiSuccessExample {json} Success-Response:
{
  "status": true,
  "data": [{English: "Afar", alpha2: "aa", alpha3-b: "aar"},…],
  "error": [],
  "msg": "Query results"
}
*/
const getLanguageCodes = async (req, resp) => {
  let file = await helpers.readJSONFile(
    process.env.ABSPATH + 'src/config/language-codes.json'
  );
  let languageCodes = [];
  if (file.error === null) {
    languageCodes = file.data;
  }
  resp.json({
    status: true,
    data: languageCodes,
    error: [],
    msg: 'Query results',
  });
};

module.exports = {
  getLanguageCodes: getLanguageCodes,
};
