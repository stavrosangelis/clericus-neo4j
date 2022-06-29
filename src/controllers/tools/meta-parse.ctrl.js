const { promisify } = require('util');
const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');
const helpers = require('../../helpers');
const driver = require('../../config/db-driver');
const { RESOURCESPATH: resourcesPath, SERVERURL: serverURL } = process.env;

/**
* @api {get} /meta-parse-class-piece Meta-parse classpiece
* @apiName list classpiece
* @apiGroup Tools
* @apiPermission admin
*
* @apiParam {string} file The filename of the requested classpiece.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":"Face thumbnails created successfully","error":"","msg":""}
*/
const metaParseClassPiece = async (req, resp) => {
  const { query: parameters } = req;
  const { file = null } = parameters;
  if (file === null || file === '') {
    return resp.status(400).json({
      status: false,
      data: '',
      error: true,
      msg: 'Please provide a valid file name to continue',
    });
  }
  const fileName = path.parse(file).name;
  const dirPath = `${resourcesPath}images/processed/compressed/`;
  const outputDir = `${resourcesPath}output/${fileName}/`;
  const outputThumbnailsDir = `${resourcesPath}output/${fileName}/thumbnails/`;
  const outputThumbnailsPathDir = `${serverURL}output/${fileName}/thumbnails/`;
  const srcPath = dirPath + file;

  // make dir to save the output files
  mkdirSync(outputDir);

  const outputFacesFile = `${outputDir}images/${fileName}-faces-processed.png`;
  const identifiedFacesPath = `${outputDir}json/${fileName}-faces.json`;
  const identifiedFacesJSON = fs.readFileSync(identifiedFacesPath, 'utf-8');
  const identifiedFaces =
    typeof identifiedFaces === 'string'
      ? JSON.parse(identifiedFacesJSON)
      : identifiedFacesJSON;

  let msg = 'Highlighting faces...';

  await highlightFaces(
    srcPath,
    identifiedFaces,
    outputFacesFile,
    Canvas,
    outputThumbnailsDir,
    identifiedFacesPath,
    outputThumbnailsPathDir
  );
  msg = 'Finished highlighting faces!';

  // 05. return results
  return resp.status(200).json({
    status: true,
    data: 'Face thumbnails created successfully',
    error: '',
    msg: msg,
  });
};

const associateThumbToLabels = async (req, resp) => {
  const { query: parameters } = req;
  const {
    file = null,
    bottom: bottomDistance = 0,
    side: sideDistance = 0,
  } = parameters;
  if (file === null || file === '') {
    return resp.status(400).json({
      status: false,
      data: '',
      error: true,
      msg: 'Please provide a valid file name to continue',
    });
  }

  const fileName = path.parse(file).name;
  const outputDir = `${resourcesPath}output/${fileName}/`;

  const response = [];

  // get faces
  const faces = fs.readFileSync(`${outputDir}${fileName}-faces.json`, 'utf-8');

  // get text
  const text = fs.readFileSync(`${outputDir}${fileName}-text.json`, 'utf-8');

  let i = 0;
  faces.forEach((face) => {
    // 01. find face boundaries
    const { faceRectangle: rectangle } = face;
    let { width, height, top, left } = rectangle;
    if (typeof width === 'string') {
      width = width.replace('px', '');
      width = Number(width);
    }
    if (typeof height === 'string') {
      height = height.replace('px', '');
      height = Number(height);
    }

    // 02. find face top-bottom points
    // let topY = rectangle.top;
    const bottomY = top + height;

    // 03 find face left-right points
    const leftX = left;
    const rightX = left + width;

    const newBottomPoint = bottomY + Number(bottomDistance);
    const newLeftPoint = leftX - Number(sideDistance);
    const newRightPoint = rightX + Number(sideDistance);

    const facePosition = {};
    facePosition.topY = bottomY;
    facePosition.bottomY = newBottomPoint;
    facePosition.leftX = newLeftPoint;
    facePosition.rightX = newRightPoint;

    const association = compareTextPosition(text, facePosition, i);
    response.push(association);
    i += 1;
  });

  return resp.status(200).json({
    status: true,
    data: response,
    error: true,
    msg: '',
  });
};

const highlightFaces = async (
  inputFile,
  faces,
  outputFile,
  Canvas,
  outputDir,
  facesPath,
  pathDir
) => {
  const readFile = promisify(fs.readFile);
  const image = await readFile(inputFile);
  const Image = Canvas.Image;
  // Open the original image into a canvas
  const img = new Image();
  img.src = image;
  const canvas = new Canvas.Canvas(img.width, img.height);
  const context = canvas.getContext('2d');
  context.drawImage(img, 0, 0, img.width, img.height);

  // Now draw boxes around all the faces
  context.strokeStyle = 'rgba(0,255,0,0.8)';
  context.lineWidth = '5';

  let i = 0;
  let newFaces = [];

  // clear dir of existing thumbnails
  fs.readdirSync(outputDir, (err, files) => {
    if (err) throw err;
    for (let file of files) {
      fs.unlink(path.join(outputDir, file), (err) => {
        if (err) throw err;
      });
    }
  });

  let facesCropPromises = [];
  if (typeof faces === 'string') {
    faces = JSON.parse(faces);
  }
  faces.forEach((face) => {
    context.beginPath();
    const { faceRectangle: rectangle, rotate = 0 } = face;
    let { width, height } = rectangle;
    if (typeof width === 'string') {
      width = width.replace('px', '');
      width = Number(width);
    }
    if (typeof height === 'string') {
      height = height.replace('px', '');
      height = Number(height);
    }
    height = Number(height);
    context.moveTo(rectangle.left, rectangle.top);
    context.lineTo(rectangle.left + width, rectangle.top);
    context.lineTo(rectangle.left + width, rectangle.top + height);
    context.lineTo(rectangle.left, rectangle.top + height);
    context.lineTo(rectangle.left, rectangle.top);
    context.stroke();

    // create face thumbnail
    let cropImgPromise = new Promise((resolve) => {
      resolve(
        cropImg(
          i,
          faces.length,
          inputFile,
          rectangle.left,
          rectangle.top,
          width,
          height,
          rotate,
          outputDir
        )
      );
    }).catch((error) => {
      console.log(error);
    });
    facesCropPromises.push(cropImgPromise);

    const newFileSrc = `${outputDir}${i}.jpg`;
    const newFilePath = `${pathDir}${i}.jpg`;
    const newFace = { ...face };
    newFace.thumbnail = {
      path: newFilePath,
      src: newFileSrc,
    };
    newFaces.push(face);
    i += 1;
  });

  await Promise.all(facesCropPromises).then((data) => {
    return data;
  });

  // console.log(cropped)
  // update faces json
  let fileWriteStatus = true;
  let fileWriteError = '';
  try {
    fs.writeFileSync(facesPath, JSON.stringify(newFaces), 'utf8');
  } catch (e) {
    fileWriteStatus = false;
    fileWriteError = e;
  }
  return {
    status: fileWriteStatus,
    error: fileWriteError,
  };
};

const cropImg = async (
  i,
  total,
  inputFile,
  initialX,
  initialY,
  width,
  height,
  rotate = 0,
  outputDir
) => {
  const readFile = promisify(fs.readFile);
  const image = await readFile(inputFile);
  const Image = Canvas.Image;
  // Open the original image into a canvas
  const img = new Image();
  img.src = image;
  // console.log('loaded image '+i+'\n');
  if (width < 0) {
    width = Math.abs(width);
  }
  if (height < 0) {
    height = Math.abs(height);
  }
  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (rotate !== 0) {
    const radians = degreesToRadians(rotate);
    const cx = initialX + width * 0.5;
    const cy = initialY + height * 0.5;
    const newCoordinates = rotateCoordinates(
      cx,
      cy,
      initialX,
      initialY,
      radians,
      width,
      height,
      rotate
    );
    const {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    } = newCoordinates;
    canvas.width = width;
    canvas.height = height;

    const left = rotate < 180 ? 0 : width - newWidth - 12;
    const top = rotate < 180 ? 0 : width - newWidth - 5;
    ctx.rotate(radians);
    ctx.drawImage(
      img,
      newX,
      newY,
      newWidth,
      newHeight,
      left,
      top,
      newWidth,
      newHeight
    );
  } else {
    ctx.drawImage(img, initialX, initialY, width, height, 0, 0, width, height);
  }

  const out = fs.createWriteStream(`${outputDir}${i}.jpg`);
  const stream = canvas.createJPEGStream({
    bufsize: 2048,
    quality: 90,
  });

  stream.pipe(out);
  return `${i}.jpg cropped successfully!`;
};

async (inputFile, labels, outputFile, Canvas) => {
  const readFile = promisify(fs.readFile);
  const image = await readFile(inputFile);
  const Image = Canvas.Image;
  // Open the original image into a canvas
  const img = new Image();
  img.src = image;
  const canvas = new Canvas.Canvas(img.width, img.height);
  const context = canvas.getContext('2d');
  context.drawImage(img, 0, 0, img.width, img.height);

  // Now draw boxes around all the faces
  context.strokeStyle = 'rgba(0,255,17,0.8)';
  context.lineWidth = '5';

  labels.forEach((label) => {
    context.beginPath();
    let origX = 0;
    let origY = 0;
    label.boundingPoly.vertices.forEach((bounds, i) => {
      if (i === 0) {
        origX = bounds.x;
        origY = bounds.y;
      }
      context.lineTo(bounds.x, bounds.y);
    });
    context.lineTo(origX, origY);
    context.stroke();
  });

  // Write the result to a file
  // console.log(`Writing to file ${outputFile}`);
  const writeStream = fs.createWriteStream(outputFile);
  const pngStream = canvas.pngStream();

  await new Promise((resolve, reject) => {
    pngStream
      .on('data', (chunk) => writeStream.write(chunk))
      .on('error', reject)
      .on('end', resolve);
  });
};

const mkdirSync = async (dirPath) => {
  try {
    fs.mkdirSync(dirPath);
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
};

const compareTextPosition = (text, facePosition, i) => {
  let associations = [];
  text.forEach((chunk) => {
    if (
      // 01. text should be below picture
      chunk.boundingPoly.vertices[0].y > facePosition.topY &&
      // 02. text should be above bottom vertical position
      chunk.boundingPoly.vertices[0].y < facePosition.bottomY &&
      // 03. check left horizontal facePosition
      chunk.boundingPoly.vertices[0].x < facePosition.leftX &&
      // 04. check right horizontal position
      chunk.boundingPoly.vertices[1].x < facePosition.rightX
    ) {
      // console.log(i, chunk.description);
      let association = {};
      association.description = chunk.description;
      association.boundaries = chunk.boundingPoly.vertices;
      association.face = facePosition;

      associations.push(association);
    }
  });
  let relation = { id: i, associations: associations };
  // console.log(relation);
  return relation;
};

/**
* @api {get} /list-class-pieces List classpieces
* @apiName list classpieces
* @apiGroup Tools
* @apiPermission admin
*
* @apiSuccessExample {json} Success-Response:
{
    "status": true,
    "data": [
        {
            "name": "1969-1970.jpg",
            "thumbnail": "http://localhost:5100/images/processed/thumbnails/1969-1970.jpg",
            "fullsize": "http://localhost:5100/images/processed/fullsize/1969-1970.jpg"
        },
        {
            "name": "1971.jpg",
            "thumbnail": "http://localhost:5100/images/processed/thumbnails/1971.jpg",
            "fullsize": "http://localhost:5100/images/processed/fullsize/1971.jpg"
        },
        {
            "name": "1972.jpg",
            "thumbnail": "http://localhost:5100/images/processed/thumbnails/1972.jpg",
            "fullsize": "http://localhost:5100/images/processed/fullsize/1972.jpg"
        },
        {
            "name": "1973.jpg",
            "thumbnail": "http://localhost:5100/images/processed/thumbnails/1973.jpg",
            "fullsize": "http://localhost:5100/images/processed/fullsize/1973.jpg"
        },
        {
            "name": "1974.jpg",
            "thumbnail": "http://localhost:5100/images/processed/thumbnails/1974.jpg",
            "fullsize": "http://localhost:5100/images/processed/fullsize/1974.jpg"
        },
        {
            "name": "1975.jpg",
            "thumbnail": "http://localhost:5100/images/processed/thumbnails/1975.jpg",
            "fullsize": "http://localhost:5100/images/processed/fullsize/1975.jpg"
        },
        {
            "name": "1976.jpg",
            "thumbnail": "http://localhost:5100/images/processed/thumbnails/1976.jpg",
            "fullsize": "http://localhost:5100/images/processed/fullsize/1976.jpg"
        },
        {
            "name": "1977.jpg",
            "thumbnail": "http://localhost:5100/images/processed/thumbnails/1977.jpg",
            "fullsize": "http://localhost:5100/images/processed/fullsize/1977.jpg"
        },
        {
            "name": "1978.jpg",
            "thumbnail": "http://localhost:5100/images/processed/thumbnails/1978.jpg",
            "fullsize": "http://localhost:5100/images/processed/fullsize/1978.jpg"
        },
        {
            "name": "1979.jpg",
            "thumbnail": "http://localhost:5100/images/processed/thumbnails/1979.jpg",
            "fullsize": "http://localhost:5100/images/processed/fullsize/1979.jpg"
        },
        {
            "name": "1980.jpg",
            "thumbnail": "http://localhost:5100/images/processed/thumbnails/1980.jpg",
            "fullsize": "http://localhost:5100/images/processed/fullsize/1980.jpg"
        }
    ],
    "error": false,
    "msg": ""
}
*/

const listClassPieces = (req, resp) => {
  let fsPath = resourcesPath + 'images/processed/thumbnails';
  let fullsizePath = serverURL + 'images/processed/fullsize';
  let thumbnailsPath = serverURL + 'images/processed/thumbnails';

  fs.readdir(fsPath, function (error, files) {
    let responseData = [];
    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      let responseFile = {};
      if (file !== '.DS_Store') {
        responseFile = {
          name: file,
          thumbnail: thumbnailsPath + '/' + file,
          fullsize: fullsizePath + '/' + file,
        };
        responseData.push(responseFile);
      }
    }

    resp.json({
      status: true,
      data: responseData,
      error: false,
      msg: '',
    });
  });
};

/**
* @api {get} /list-class-piece List classpiece
* @apiName list classpiece
* @apiGroup Tools
* @apiPermission admin
*
* @apiParam {string} file The filename of the requested classpiece.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":[{"name":"1969-1970.jpg","thumbnail":"http://localhost:5100/images/processed/thumbnails/1969-1970.jpg","fullsize":"http://localhost:5100/images/processed/fullsize/1969-1970.jpg","compressed":"http://localhost:5100/images/processed/compressed/1969-1970.jpg","facesThumbnails":true,"faces":"http://localhost:5100/output/1969-1970/json/1969-1970-faces.json","text":"http://localhost:5100/output/1969-1970/json/1969-1970-text.json"}],"error":false,"msg":""}
*/
const listClassPiece = (req, resp) => {
  let parameters = req.query;
  let fileName = '';
  if (typeof parameters.file !== 'undefined') {
    fileName = parameters.file;
  }
  if (typeof fileName === 'undefined' || fileName === '') {
    resp.json({
      status: false,
      data: '',
      error: true,
      msg: 'Please provide a valid file name to continue',
    });
    return false;
  }

  let fsPath = resourcesPath + 'images/processed/thumbnails';
  let fullsizeDir = resourcesPath + 'images/processed/fullsize';
  let fullsizeURL = serverURL + 'images/processed/fullsize';
  let compressedDir = resourcesPath + 'images/processed/compressed';
  let compressedURL = serverURL + 'images/processed/compressed';
  let thumbnailsDir = resourcesPath + 'images/processed/thumbnails';
  let thumbnailsURL = serverURL + 'images/processed/thumbnails';

  fs.readdir(fsPath, function (error, files) {
    let responseData = [];
    let file = files.find((f) => f === fileName);
    let fileString = path.parse(thumbnailsDir + '/' + file).name;
    let outputDir = resourcesPath + 'output/' + fileString + '/';
    let outputURL = serverURL + 'output/' + fileString + '/';
    let outputFacesDir = outputDir + 'thumbnails/';
    let outputJsonDir = outputDir + 'json';
    let outputJsonURL = outputURL + 'json';

    let thumbnail = null;
    let fullsize = null;
    let compressed = null;
    let facesThumbnails = false;
    let facesJSON = null;
    let textJSON = null;
    if (fs.existsSync(thumbnailsDir + '/' + file)) {
      thumbnail = thumbnailsURL + '/' + file;
    }
    if (fs.existsSync(fullsizeDir + '/' + file)) {
      fullsize = fullsizeURL + '/' + file;
    }
    if (fs.existsSync(compressedDir + '/' + file)) {
      compressed = compressedURL + '/' + file;
    }
    if (fs.existsSync(outputFacesDir + '/0.jpg')) {
      facesThumbnails = true;
    }
    if (fs.existsSync(outputJsonDir + '/' + fileString + '-faces.json')) {
      facesJSON = outputJsonURL + '/' + fileString + '-faces.json';
    }
    if (fs.existsSync(outputJsonDir + '/' + fileString + '-text.json')) {
      textJSON = outputJsonURL + '/' + fileString + '-text.json';
    }
    let responseFile = {
      name: file,
      thumbnail: thumbnail,
      fullsize: fullsize,
      compressed: compressed,
      facesThumbnails: facesThumbnails,
      faces: facesJSON,
      text: textJSON,
    };
    responseData.push(responseFile);
    resp.json({
      status: true,
      data: responseData,
      error: false,
      msg: '',
    });
  });
};

/**
* @api {get} /create-thumbnails Create thumbnails
* @apiName create thumbnails
* @apiGroup Tools
* @apiPermission admin
*
* @apiParam {boolean} [test=false] If test is true it returns 200 and stops execution.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":"Image analysis complete","error":"","msg":""}
*/
const createThumbnails = async (req, resp) => {
  let parameters = req.query;
  if (parameters.test === 'true') {
    resp.json({
      status: true,
      data: [],
      error: false,
      msg: 'Test completed succesfully',
    });
    return false;
  }
  let fullsizeDir = resourcesPath + 'images/processed/fullsize';
  let thumbnailsDir = resourcesPath + 'images/processed/thumbnails';
  let compressedDir = resourcesPath + 'images/processed/compressed';

  fs.readdir(fullsizeDir, async function (error, files) {
    for (let i = 0; i < files.length; i++) {
      let file = files[i];

      await createThumbnail(
        fullsizeDir + '/' + file,
        thumbnailsDir + '/' + file,
        file,
        null,
        null
      );
      await createCompressed(
        fullsizeDir + '/' + file,
        compressedDir + '/' + file,
        file,
        null,
        null
      );
    }

    resp.json({
      status: true,
      data: [],
      error: false,
      msg: 'Files import completed successfully',
    });
  });
};

const createThumbnail = async (
  srcPath = null,
  targetPath = null,
  fileName = null,
  customWidth = null,
  customHeight = null
) => {
  if (srcPath === null || targetPath === null || fileName === null) {
    return false;
  }
  const readFile = promisify(fs.readFile);
  const imageSrc = await readFile(srcPath);
  const Image = Canvas.Image;
  const img = new Image();
  img.src = imageSrc;

  img.onerror = function (err) {
    console.log(err);
  };
  // calculate new dimensions
  let oldWidth = img.width;
  let oldHeight = img.height;
  let aspectRatio = oldWidth / oldHeight;
  let newWidth = 600;
  let newHeight = 600;
  if (oldWidth > oldHeight) {
    newHeight = newWidth / aspectRatio;
  } else {
    newWidth = newHeight * aspectRatio;
  }

  if (customWidth !== null) {
    newWidth = customWidth;
    newHeight = newWidth / aspectRatio;
  } else if (customHeight !== null) {
    newHeight = customHeight;
    newWidth = newHeight * aspectRatio;
  }

  newWidth = parseInt(newWidth, 10);
  newHeight = parseInt(newHeight, 10);

  var canvas = Canvas.createCanvas(newWidth, newHeight);
  var ctx = canvas.getContext('2d');
  // ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  var out = fs.createWriteStream(targetPath);
  var stream = canvas.createJPEGStream({
    bufsize: 2048,
    quality: 80,
  });

  stream.pipe(out);
  out.on('finish', function () {
    // console.log(fileName+" resized successfully");
    return fileName + ' resized successfully';
  });
};

const createCompressed = async (
  srcPath = null,
  targetPath = null,
  fileName = null,
  customWidth = null,
  customHeight = null
) => {
  if (srcPath === null || targetPath === null || fileName === null) {
    return false;
  }
  const readFile = promisify(fs.readFile);
  const imageSrc = await readFile(srcPath);
  const Image = Canvas.Image;
  const img = new Image();
  img.src = imageSrc;

  img.onerror = function (err) {
    console.log(err);
  };
  // calculate new dimensions
  let oldWidth = img.width;
  let oldHeight = img.height;

  let aspectRatio = oldWidth / oldHeight;
  let newWidth = 2400;
  let newHeight = 2400;
  if (oldWidth < 2400 || oldHeight < 2400) {
    newWidth = oldWidth;
    newHeight = oldHeight;
  }

  if (oldWidth > oldHeight) {
    newHeight = newWidth / aspectRatio;
  } else {
    newWidth = newHeight * aspectRatio;
  }

  if (customWidth !== null) {
    newWidth = customWidth;
    newHeight = newWidth / aspectRatio;
  } else if (customHeight !== null) {
    newHeight = customHeight;
    newWidth = newHeight * aspectRatio;
  }

  newWidth = parseInt(newWidth, 10);
  newHeight = parseInt(newHeight, 10);

  var canvas = Canvas.createCanvas(newWidth, newHeight);
  var ctx = canvas.getContext('2d');
  // ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  var out = fs.createWriteStream(targetPath);
  var stream = canvas.createJPEGStream({
    bufsize: 2048,
    quality: 90,
  });

  stream.pipe(out);
  out.on('finish', function () {
    // console.log(fileName+" compressed successfully");
    return fileName + ' compressed successfully';
  });
};

/**
* @api {post} /update-class-piece-faces Update classpiece faces
* @apiName update classpiece faces
* @apiGroup Tools
* @apiPermission admin
*
* @apiParam {string} file The filename of the requested classpiece.
* @apiParam {string} faces A stringified JSON containing all available information about a classpiece faces.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":"Face selections have been saved successfully","error":"","msg":""}
*/
const updateClassPieceFaces = async (req, resp) => {
  let parameters = req.body;
  if (
    typeof parameters.file === 'undefined' ||
    typeof parameters.faces === 'undefined'
  ) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The file or the contents are undefined',
    });
    return false;
  }
  let file = '';
  if (typeof parameters.file !== 'undefined') {
    file = parameters.file;
  }
  let newFaces = {};
  if (typeof parameters.faces !== 'undefined') {
    newFaces = parameters.faces;
  }
  if (newFaces !== '') {
    let thumbnailsDir = resourcesPath + 'images/processed/thumbnails';
    let fileString = path.parse(thumbnailsDir + '/' + file).name;
    let facesJSON =
      resourcesPath +
      'output/' +
      fileString +
      '/json/' +
      fileString +
      '-faces.json';

    let fileWriteStatus = true;
    let fileWriteError = '';

    try {
      await fs.writeFileSync(facesJSON, JSON.stringify(newFaces), 'utf8');
    } catch (e) {
      fileWriteStatus = false;
      fileWriteError = e;
    }

    if (fileWriteStatus) {
      resp.json({
        status: true,
        data: 'Face selections have been saved successfully',
        error: '',
        msg: '',
      });
    } else {
      resp.json({
        status: false,
        data: [],
        error: true,
        msg: fileWriteError,
      });
    }
  } else {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please provide the face selections data to continue',
    });
  }
};

const degreesToRadians = (degrees) => {
  let radians = 0;
  if (degrees > 0) {
    radians = (degrees * Math.PI) / 180;
  } else {
    radians = (degrees * Math.PI) / 180;
  }
  return -radians;
};

const rotateCoordinates = (
  cx,
  cy,
  x,
  y,
  radians,
  width,
  height,
  rotateDegrees
) => {
  let cos = Math.cos(radians);
  let sin = Math.sin(radians);
  let newCoordinates = {};
  let nx = cos * (x - cx) + sin * (y - cy) + cx;
  let ny = cos * (y - cy) + sin * (x - cx) + cy;
  let newWidth = height * sin + width * cos;
  let newHeight = height * cos + width * sin;
  if (rotateDegrees < 180) {
    nx = cos * (x - cx) - sin * (y - cy) + cx;
    ny = cos * (y - cy) - sin * (x - cx) + cy;
    newWidth = height * sin - width * cos;
    newHeight = height * cos - width * sin;
  }
  newCoordinates.width = Math.abs(newWidth);
  newCoordinates.height = Math.abs(newHeight);
  newCoordinates.x = nx;
  newCoordinates.y = ny;
  return newCoordinates;
};
/**
* @api {post} /query-texts Query texts
* @apiName query texts
* @apiGroup Tools
* @apiPermission admin
*
* @apiParam {array} texts An array of strings.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":[{"word":"Chanting","type":null,"count":null},{"word":"Ocaling","type":null,"count":null},{"word":"ARD","type":"firstName","count":9},{"word":"MACHA","type":"lastName","count":2}],"error":[],"msg":"Word counts results"}
*/
const queryTexts = async (req, resp) => {
  let postData = req.body;
  if (Object.keys(postData).length === 0) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The texts must not be empty',
    });
    return false;
  }
  let texts = postData.texts;

  let promises = [];
  for (let i = 0; i < texts.length; i++) {
    let word = texts[i];
    if (word.length > 2) {
      /* let honorificPrefix = new Promise((resolve,reject)=>{
        resolve(countWordType(word, "honorificPrefix"));
      });*/
      let firstName = new Promise((resolve) => {
        resolve(countWordType(word, 'firstName'));
      });
      let middleName = new Promise((resolve) => {
        resolve(countWordType(word, 'middleName'));
      });
      let lastName = new Promise((resolve) => {
        resolve(countWordType(word, 'lastName'));
      });
      let diocese = new Promise((resolve) => {
        resolve(countWordType(word, 'diocese'));
      });
      promises.push(Promise.all([firstName, middleName, lastName, diocese]));
    }
  }

  let results = await Promise.all(promises).then((data) => {
    return data;
  });
  // group results
  let output = results.map((result) => {
    let counts = {
      // honorificPrefix: result.find(item=>item.type==="honorificPrefix")['count'],
      firstName: result.find((item) => item.type === 'firstName')['count'],
      middleName: result.find((item) => item.type === 'middleName')['count'],
      lastName: result.find((item) => item.type === 'lastName')['count'],
      diocese: result.find((item) => item.type === 'diocese')['count'],
    };
    let countsArr = [];
    for (let key in counts) {
      countsArr.push([key, counts[key]]);
    }
    countsArr.sort((a, b) => {
      return b[1] - a[1];
    });
    let firstCount = countsArr[0];
    let obj = {
      word: result[0].word,
      type: null,
      count: null,
    };
    if (firstCount[1] > 0) {
      obj.type = firstCount[0];
      obj.count = firstCount[1];
    }
    return obj;
  });
  resp.json({
    status: true,
    data: output,
    error: [],
    msg: 'Word counts results',
  });
};

const countWordType = async (word = '', type) => {
  const queryWord = helpers.escapeRegExp(word).toLowerCase();
  const session = driver.session();
  const query = `MATCH (n:Person) WHERE EXISTS(n.${type}) AND toLower(n.${type}) =~ '.*${queryWord}.*' RETURN count(*) AS count`;
  const count = await session
    .writeTransaction((tx) => tx.run(query, {}))
    .then((result) => {
      session.close();
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['count'];
      return output;
    })
    .catch((error) => {
      console.log(error);
    });
  return { word: word, type: type, count: parseInt(count, 10) };
};

module.exports = {
  metaParseClassPiece,
  associateThumbToLabels,
  listClassPieces,
  listClassPiece,
  createThumbnails,
  updateClassPieceFaces,
  queryTexts,
};
