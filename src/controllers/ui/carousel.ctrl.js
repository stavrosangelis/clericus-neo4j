const driver = require("../../config/db-driver");
const helpers = require("../../helpers");
const UploadedFile = require('../uploadedFile.ctrl').UploadedFile;


/**
* @api {get} /carousel Get carousel items
* @apiName get carousel items
* @apiGroup Carousel
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":{"data":[{"createdAt":"2020-02-19T12:11:02.733Z","image":"3079","updatedBy":"437","createdBy":"437","caption":"caption 2","_id":"3046","label":"test 2","url":"http://google.com","updatedAt":"2020-02-26T12:27:15.260Z","status":"private","order":"1","systemLabels":["Slideshow"],"imageDetails":{"_id":"3079","filename":"slideshow.jpg","year":2020,"month":2,"hashedName":"5889d821aae8cf508f1b12b030dc62fd.jpg","paths":[{"path":"http://localhost:5100/uploads/2020/2/images/5889d821aae8cf508f1b12b030dc62fd.jpg","pathType":"source"},{"path":"http://localhost:5100/uploads/2020/2/thumbnails/5889d821aae8cf508f1b12b030dc62fd.jpg","pathType":"thumbnail"}],"createdBy":"437","createdAt":"2020-02-26T12:27:09.950Z","updatedBy":"437","updatedAt":"2020-02-26T12:27:09.950Z"}},{"createdAt":"2020-02-19T12:10:43.691Z","image":"2942","updatedBy":"437","createdBy":"437","caption":"test caption","label":"test","url":"http://www.google.gr","updatedAt":"2020-02-19T12:10:43.691Z","order":0,"status":"private","_id":"2876","systemLabels":["Slideshow"],"imageDetails":{"_id":"2942","filename":"IMG_20200218_145701.jpg","year":2020,"month":2,"hashedName":"64fead2233879c89f47d8358530d1d41.jpg","paths":[{"path":"http://localhost:5100/uploads/2020/2/images/64fead2233879c89f47d8358530d1d41.jpg","pathType":"source"},{"path":"http://localhost:5100/uploads/2020/2/thumbnails/64fead2233879c89f47d8358530d1d41.jpg","pathType":"thumbnail"}],"createdBy":"437","createdAt":"2020-02-18T16:01:16.685Z","updatedBy":"437","updatedAt":"2020-02-18T16:01:16.685Z"}}],"totalItems":2},"error":[],"msg":"Query results"}
*/
const getCarousel = async (req, resp) => {
  let query = `MATCH (n:Slideshow) WHERE n.status='public' RETURN n ORDER BY n.order`;
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

module.exports = {
  getCarousel: getCarousel,
};
