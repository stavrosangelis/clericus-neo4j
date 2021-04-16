const driver = require('../config/db-driver');
const helpers = require('../helpers');

/**
* @api {get} /dashboard Dashboard
* @apiName dashboard
* @apiGroup Dashboard
* @apiPermission admin
*
* @apiSuccessExample {json} Success-Response:
{
    "status": true,
    "data": {
        "people": 220,
        "resources": 220,
        "organisations": 80,
        "events": 0
    },
    "error": false,
    "msg": ""
}
*/
const dashboardStats = async (req, resp) => {
  let countPeoplePromise = countNodes('Person');
  let countResourcesPromise = countNodes('Resource');
  let countOrganisationsPromise = countNodes('Organisation');
  let countEventsPromise = countNodes('Event');
  let countSpatialPromise = countNodes('Spatial');
  let countTemporalPromise = countNodes('Temporal');
  let stats = await Promise.all([
    countPeoplePromise,
    countResourcesPromise,
    countOrganisationsPromise,
    countEventsPromise,
    countSpatialPromise,
    countTemporalPromise,
  ]).then((data) => {
    return data;
  });
  let response = {
    people: stats[0],
    resources: stats[1],
    organisations: stats[2],
    events: stats[3],
    spatial: stats[4],
    temporal: stats[5],
  };
  resp.json({
    status: true,
    data: response,
    error: false,
    msg: '',
  });
};

const countNodes = async (type) => {
  let session = driver.session();
  let query = 'MATCH (n:' + type + ') RETURN count(*)';
  let count = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['count(*)'];
      return output;
    });
  return parseInt(count, 10);
};

/**
* @api {get} /monthly-stats Monthly stats
* @apiName monthly stats
* @apiGroup Dashboard
* @apiPermission admin
*
* @apiParam {number} [year=current year] The year for the requested data.
* @apiParam {number} [month=current month] The month for the requested data.
*
* @apiExample {request} Example:
* http://localhost:5100/api/nmonthly-stats?year=2020&month=1
*
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"year":2020,"month":1,"items":[{"day":10,"count":35},{"day":15,"count":3},{"day":16,"count":1},{"day":17,"count":3}]},"error":false,"msg":""}
*/
const getMonthlyStats = async (req, resp) => {
  let parameters = req.query;
  let year = parameters.year;
  let nextYear = year;
  let month = parameters.month;
  let nextMonth = 0;
  if (typeof month !== 'undefined') {
    nextMonth = month + 1;
  }
  if (typeof year === 'undefined' || typeof month === 'undefined') {
    let date = new Date();
    year = date.getFullYear();
    nextYear = year;
    month = date.getMonth() + 1;
    nextMonth = month + 2;
    if (nextMonth > 12) {
      nextMonth = nextMonth - 12;
      nextYear = year + 1;
    }
  }

  let session = driver.session();
  let query = `MATCH (n) WHERE (datetime(n.createdAt))>=datetime({year:${year}, month:${month}}) AND datetime(n.createdAt)<datetime({year:${nextYear}, month:${nextMonth}}) RETURN date(datetime(n.createdAt)) as newDate, count(*) as c ORDER BY newDate`;
  //query = `MATCH (n) WHERE datetime(n.createdAt)>=datetime({year:${year}, month:${month}}) AND datetime(n.createdAt)<datetime({year:${nextYear}, month:${nextMonth}}) RETURN collect(n.createdAt) as timestamp ORDER BY timestamp`;

  let items = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      if (result.records.length > 0) {
        let records = result.records.map((record) => {
          let item = record.toObject();
          const day = item.newDate.day.toString();
          return {
            day: parseInt(day, 10),
            count: parseInt(item.c, 10),
          };
        });
        return records;
      }
      return [];
    });
  let responseData = {
    year: year,
    month: month,
    items: items,
  };
  resp.json({
    status: true,
    data: responseData,
    error: false,
    msg: '',
  });
};

module.exports = {
  dashboardStats: dashboardStats,
  getMonthlyStats: getMonthlyStats,
};
