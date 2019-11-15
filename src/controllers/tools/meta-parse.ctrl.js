const {promisify} = require('util');
const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');
const { parse } = require('querystring');
const helpers = require('../../helpers');
const resourcesPath = process.env.RESOURCESPATH;
const serverURL = process.env.SERVERURL;

const metaParseClassPiece = async(req, resp) => {
  let parameters = req.query;
  let file = parameters.file;
  if (typeof file==="undefined" || file==="") {
    resp.json({
      status: false,
      data: '',
      error: true,
      msg: 'Please provide a valid file name to continue',
    })
    return false;
  }

  let fileName = path.parse(file).name;
  let dirPath = resourcesPath+"images/processed/compressed/";
  let outputDir = resourcesPath+"output/"+fileName+"/";
  let outputThumbnailsDir = resourcesPath+"output/"+fileName+"/thumbnails/";
  let outputThumbnailsPathDir = serverURL+"output/"+fileName+"/thumbnails/";
  let srcPath = dirPath+file;

  var response = [];


  // make dir to save the output files
  mkdirSync(outputDir);

  // 01. expand faces boundaries
  var outputFacesFile = outputDir+"images/"+fileName+"-faces-processed.png";
  var identifiedFaces = require(outputDir+"json/"+fileName+"-faces.json");
  var identifiedFacesPath = outputDir+"json/"+fileName+"-faces.json";

  let msg = 'Highlighting faces...'

  await highlightFaces(srcPath, identifiedFaces, outputFacesFile, Canvas, outputThumbnailsDir, identifiedFacesPath, outputThumbnailsPathDir);
  msg = 'Finished highlighting faces!';
  console.log(msg);
  // 05. return results
  resp.json({
    status: true,
    data: 'Face thumbnails created successfully',
    error: '',
    msg: '',
  })
}

const associateThumbToLabels = async(req, resp) => {
    let parameters = req.query;
    let file = parameters.file;
    let bottomDistance = parameters.bottom || 0;
    let sideDistance = parameters.side || 0;
    if (typeof file==="undefined" || file==="") {
      resp.json({
        status: false,
        data: '',
        error: true,
        msg: 'Please provide a valid file name to continue',
      })
      return false;
    }

    let fileName = path.parse(file).name;
    let dirPath = resourcesPath+"images/processed/";
    let outputDir = resourcesPath+"output/"+fileName+"/";
    let srcPath = dirPath+file;

    var response = [];

    // get faces
    var faces = require(outputDir+fileName+"-faces.json");

    // get text
    var text = require(outputDir+fileName+"-text.json");

    let i=0;
    faces.forEach((face) => {
      // 01. find face boundaries
      let rectangle = face.faceRectangle;
      let width = rectangle.width.replace("px", "");
      width = parseInt(width,10);
      let height = rectangle.height.replace("px", "");
      height = parseInt(height,10);

      // 02. find face top-bottom points
      let topY = rectangle.top;
      let bottomY = rectangle.top+height;

      // 03 find face left-right points
      let leftX = rectangle.left;
      let rightX = rectangle.left+width;

      let newBottomPoint = bottomY + parseInt(bottomDistance,10);
      let newLeftPoint = leftX - (parseInt(sideDistance,10));
      let newRightPoint = rightX + (parseInt(sideDistance,10));

      let facePosition = {};
      facePosition.topY = bottomY;
      facePosition.bottomY = newBottomPoint;
      facePosition.leftX = newLeftPoint;
      facePosition.rightX = newRightPoint;

      let association = compareTextPosition(text, facePosition, i);
      response.push(association);
      i++
    });

    resp.json({
      status: true,
      data: response,
      error: true,
      msg: '',
    })
}

var highlightFaces = async(inputFile, faces, outputFile, Canvas, outputDir, facesPath, pathDir) => {
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
  await fs.readdir(outputDir, (err, files) => {
    if (err) throw err;
    for (let file of files) {
      fs.unlink(path.join(outputDir, file), err => {
        if (err) throw err;
      });
    }
  });

  let facesCropPromises = [];
  faces.forEach((face) => {
    context.beginPath();
    let rectangle = face.faceRectangle;
    let width = rectangle.width.replace("px", "");
    width = parseInt(width,10);
    let height = rectangle.height.replace("px", "");
    height = parseInt(height,10);
    context.moveTo(rectangle.left, rectangle.top);
    context.lineTo(rectangle.left+width, rectangle.top);
    context.lineTo(rectangle.left+width, rectangle.top+height);
    context.lineTo(rectangle.left, rectangle.top+height);
    context.lineTo(rectangle.left, rectangle.top);
    context.stroke();

    let rotate = 0;
    if (typeof face.rotate!=="undefined") {
      rotate = face.rotate;
    }

    // create face thumbnail
    let cropImgPromise = new Promise((resolve, reject)=> {
      resolve(cropImg(i, faces.length, inputFile, rectangle.left, rectangle.top, width, height, rotate, outputDir));
    })
	  .catch((error) =>{
      console.log(error)
	  });
    facesCropPromises.push(cropImgPromise);

    let newFileSrc = outputDir+i+'.jpg';
    let newFilePath = pathDir+i+'.jpg';
    let newFace = face;
    newFace.thumbnail = {
      path: newFilePath,
      src: newFileSrc
    };
    newFaces.push(newFace);
    i++;
  });

  let cropped = await Promise.all(facesCropPromises).then(data=> {
    return data;
  })

  console.log(cropped)
  // update faces json
  fs.writeFile(facesPath, JSON.stringify(newFaces), 'utf8', (error) => {
    if (error) throw error;
    console.log('Faces have been updated successfully!');
  });
}

const cropImg = async(i, total, inputFile, initialX, initialY, width, height, rotate=0, outputDir) => {
  const readFile = promisify(fs.readFile);
  const image = await readFile(inputFile);
  const Image = Canvas.Image;
  // Open the original image into a canvas
  const img = new Image();
  img.src = image;
  console.log('loaded image '+i+'\n');
  var canvas = Canvas.createCanvas(width, height);
  var ctx = canvas.getContext('2d')
  if (rotate!==0) {
    let rotateDegrees = rotate;
		let radians = degreesToRadians(rotateDegrees);
		let imageWidth = image.width;
		let imageHeight = image.height;

		let cx = initialX + (width*0.5);
		let cy = initialY + (height*0.5);
		let newCoordinates = rotateCoordinates(cx,cy,initialX,initialY,radians,width,height,rotateDegrees);

		let newX = newCoordinates.x;
		let newY = newCoordinates.y;

		let newWidth = newCoordinates.width;
		let newHeight = newCoordinates.height;

		canvas.width=width;
    canvas.height=height;

    let left = (width - newWidth)-32;
    let top = (width - newWidth)-10;
    if (rotateDegrees<180) {
      top = 0;
    }
    else {
      left = 0;
    }
		ctx.rotate(radians);
		ctx.drawImage(img, newX, newY, newWidth, newHeight, left, top, newWidth, newHeight);
  }
  else {
    ctx.drawImage(img, initialX, initialY, width, height, 0, 0, width, height);
  }

  var out = fs.createWriteStream(outputDir+i+'.jpg');
  var stream = canvas.createJPEGStream({
    bufsize: 2048,
    quality: 90
  })

  stream.pipe(out);
  console.log(i+'.jpg cropped successfully!');
  if (i===(parseInt(total,10)-1)) {
    console.log('Images cropping completed successfully!');
  }
  return i+'.jpg cropped successfully!'
}

const highlightText = async(inputFile, labels, outputFile, Canvas) => {
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

  labels.forEach(label => {
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
  console.log(`Writing to file ${outputFile}`);
  const writeStream = fs.createWriteStream(outputFile);
  const pngStream = canvas.pngStream();

  await new Promise((resolve, reject) => {
    pngStream
      .on('data', chunk => writeStream.write(chunk))
      .on('error', reject)
      .on('end', resolve);
  });
}

const mkdirSync = async (dirPath) =>{
  try {
    fs.mkdirSync(dirPath)
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}

const compareTextPosition = (text, facePosition, i) => {
  let associations = [];
  text.forEach(chunk => {
    if (
      // 01. text should be below picture
      chunk.boundingPoly.vertices[0].y > facePosition.topY
      // 02. text should be above bottom vertical position
      && chunk.boundingPoly.vertices[0].y < facePosition.bottomY
      // 03. check left horizontal facePosition
      && chunk.boundingPoly.vertices[0].x < facePosition.leftX
      // 04. check right horizontal position
      && chunk.boundingPoly.vertices[1].x < facePosition.rightX
    ) {
      //console.log(i, chunk.description);
      let association = {};
      association.description = chunk.description;
      association.boundaries = chunk.boundingPoly.vertices;
      association.face = facePosition;

      associations.push(association)
    }
  });
  let relation = {id: i, associations: associations};
  //console.log(relation);
  return relation;
}

const listClassPieces = (req, resp) => {
  let fsPath = resourcesPath+"images/processed/thumbnails";
  let fullsizePath = serverURL+"images/processed/fullsize";
  let thumbnailsPath = serverURL+"images/processed/thumbnails";

  fs.readdir(fsPath, function(error, files) {
    let responseData = [];
    for (let i=0;i<files.length; i++) {
      let file = files[i];
      let responseFile = {};
      if (file!==".DS_Store") {
        responseFile = {name: file, thumbnail: thumbnailsPath+"/"+file, fullsize: fullsizePath+"/"+file }
        responseData.push(responseFile);
      }
    }

    resp.json({
      status: true,
      data: responseData,
      error: false,
      msg: '',
    })
  });
}

const listClassPiece = (req, resp) => {
  let parameters = req.query;
  let fileName = "";
  if (typeof parameters.file!=="undefined") {
    fileName = parameters.file;
  }
  if (typeof fileName==="undefined" || fileName==="") {
    resp.json({
      status: false,
      data: '',
      error: true,
      msg: 'Please provide a valid file name to continue',
    })
    return false;
  }

  let fsPath = resourcesPath+"images/processed/thumbnails";
  let fullsizeDir = resourcesPath+"images/processed/fullsize";
  let fullsizeURL = serverURL+"images/processed/fullsize";
  let compressedDir = resourcesPath+"images/processed/compressed";
  let compressedURL = serverURL+"images/processed/compressed";
  let thumbnailsDir = resourcesPath+"images/processed/thumbnails";
  let thumbnailsURL = serverURL+"images/processed/thumbnails";

  fs.readdir(fsPath, function(error, files) {
    let responseData = [];
    for (let i=0;i<files.length; i++) {
      let file = files[i];
      if (fileName===file) {
        let fileString = path.parse(thumbnailsDir+"/"+file).name;
        let outputDir = resourcesPath+"output/"+fileString+"/";
        let outputURL = serverURL+"output/"+fileString+"/";
        let outputImagesDir = outputDir+"images/";
        let outputImagesURL = outputURL+"images/";
        let outputFacesDir = outputDir+"thumbnails/";
        let outputFacesURL = outputURL+"thumbnails/";
        let outputJsonDir = outputDir+"json";
        let outputJsonURL = outputURL+"json";

        let thumbnail = null;
        let fullsize = null;
        let compressed = null;
        let facesThumbnails = false;
        let facesJSON = null;
        let textJSON = null;
        if (fs.existsSync(thumbnailsDir+"/"+file)) {
            thumbnail = thumbnailsURL+"/"+file;
        }
        if (fs.existsSync(fullsizeDir+"/"+file)) {
            fullsize = fullsizeURL+"/"+file;
        }
        if (fs.existsSync(compressedDir+"/"+file)) {
            compressed = compressedURL+"/"+file;
        }
        if (fs.existsSync(outputFacesDir+"/0.jpg")) {
            facesThumbnails = true;
        }
        if (fs.existsSync(outputJsonDir+"/"+fileString+"-faces.json")) {
            facesJSON = outputJsonURL+"/"+fileString+"-faces.json";
        }
        if (fs.existsSync(outputJsonDir+"/"+fileString+"-text.json")) {
            textJSON = outputJsonURL+"/"+fileString+"-text.json";
        }
        let responseFile = {
          name: file,
          thumbnail: thumbnail,
          fullsize: fullsize,
          compressed: compressed,
          facesThumbnails: facesThumbnails,
          faces: facesJSON,
          text: textJSON,
         }
        responseData.push(responseFile);
      }
    }

    resp.json({
      status: true,
      data: responseData,
      error: false,
      msg: '',
    })
  });
}

const createThumbnails = async(req, resp) => {
  let fullsizeDir = resourcesPath+"images/processed/fullsize";
  let thumbnailsDir = resourcesPath+"images/processed/thumbnails";
  let compressedDir = resourcesPath+"images/processed/compressed";

  fs.readdir(fullsizeDir, async function(error, files) {
    for (let i=0;i<files.length; i++) {
      let file = files[i];

      await createThumbnail(fullsizeDir+"/"+file, thumbnailsDir+"/"+file, file, null, null);
      await createCompressed(fullsizeDir+"/"+file, compressedDir+"/"+file, file, null, null);
    }

    resp.json({
      status: true,
      data: [],
      error: false,
      msg: 'Files import completed successfully',
    })
  });

}

var createThumbnail = async(srcPath=null, targetPath=null, fileName=null, customWidth=null, customHeight=null) => {
  if (srcPath===null || targetPath===null || fileName===null) {
    return false;
  }
  const readFile = promisify(fs.readFile);
  const imageSrc = await readFile(srcPath);
  const Image = Canvas.Image;
  const img = new Image();
  img.src = imageSrc;

  img.onerror = function (err) {
    console.log(err)
  }
  // calculate new dimensions
  let oldWidth = img.width;
  let oldHeight = img.height;
  let aspectRatio = oldWidth / oldHeight;
  let newWidth = 600, newHeight = 600;
  if (oldWidth > oldHeight) {
    newHeight = newWidth / aspectRatio;
	}
  else {
	  newWidth = newHeight * aspectRatio;
	}

  if (customWidth!==null) {
    newWidth = customWidth;
    newHeight = newWidth / aspectRatio;
  }
  else if (customHeight!==null) {
    newHeight = customHeight;
    newWidth = newHeight * aspectRatio;
  }

  newWidth = parseInt(newWidth,10);
  newHeight = parseInt(newHeight,10);

  var canvas = Canvas.createCanvas(newWidth, newHeight);
  var ctx = canvas.getContext('2d');
  //ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, newWidth, newHeight);


  var out = fs.createWriteStream(targetPath);
  var stream = canvas.createJPEGStream({
    bufsize: 2048,
    quality: 80
  });

  stream.pipe(out);
  out.on('finish', function () {
    console.log(fileName+" resized successfully");
    return fileName+" resized successfully";
  })

}

var createCompressed = async(srcPath=null, targetPath=null, fileName=null, customWidth=null, customHeight=null) => {
  if (srcPath===null || targetPath===null || fileName===null) {
    return false;
  }
  const readFile = promisify(fs.readFile);
  const imageSrc = await readFile(srcPath);
  const Image = Canvas.Image;
  const img = new Image();
  img.src = imageSrc;

  img.onerror = function (err) {
    console.log(err)
  }
  // calculate new dimensions
  let oldWidth = img.width;
  let oldHeight = img.height;

  let aspectRatio = oldWidth / oldHeight;
  let newWidth = 2400, newHeight = 2400;
  if (oldWidth<2400 || oldHeight<2400) {
    newWidth = oldWidth;
    newHeight = oldHeight;
  }

  if (oldWidth > oldHeight) {
    newHeight = newWidth / aspectRatio;
	}
  else {
	  newWidth = newHeight * aspectRatio;
	}

  if (customWidth!==null) {
    newWidth = customWidth;
    newHeight = newWidth / aspectRatio;
  }
  else if (customHeight!==null) {
    newHeight = customHeight;
    newWidth = newHeight * aspectRatio;
  }

  newWidth = parseInt(newWidth,10);
  newHeight = parseInt(newHeight,10);

  var canvas = Canvas.createCanvas(newWidth, newHeight);
  var ctx = canvas.getContext('2d');
  //ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, newWidth, newHeight);


  var out = fs.createWriteStream(targetPath);
  var stream = canvas.createJPEGStream({
    bufsize: 2048,
    quality: 90
  });

  stream.pipe(out);
  out.on('finish', function () {
    console.log(fileName+" compressed successfully");
    return fileName+" compressed successfully";
  })

}

const updateClassPieceFaces = async(req, resp) => {
  let parameters = await helpers.parseRequestData(req, data =>data);
  let file = "";
  if (typeof parameters.file!=="undefined") {
    file = parameters.file;
  }
  let newFaces = {};
  if (typeof parameters.faces!=="undefined") {
    newFaces = parameters.faces;
  }
  if (newFaces!=="") {
    let thumbnailsDir = resourcesPath+"images/processed/thumbnails";
    let fileString = path.parse(thumbnailsDir+"/"+file).name;

    let facesJSON = resourcesPath+"output/"+fileString+"/json/"+fileString+"-faces.json";

    fs.writeFile(facesJSON, JSON.stringify(newFaces), 'utf8', (error) => {
      if (error) throw error;
      console.log('Faces have been updated successfully!');
    });

    resp.json({
      status: true,
      data: 'Face selections have been saved successfully',
      error: '',
      msg: '',
    })
  }
  else {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please provide the face selections data to continue',
    })
  }
}

var degreesToRadians = (degrees) => {
	let radians = 0;
	if (degrees>0) {
		radians = degrees * Math.PI / 180;
	}
	else {
		radians = degrees * Math.PI /  180;
	}
	return -radians;
}

var rotateCoordinates = (cx,cy,x,y,radians, width, height,rotateDegrees) => {
    let cos = Math.cos(radians);
    let sin = Math.sin(radians);
    let newCoordinates = {};
    let nx = (cos * (x - cx)) + (sin * (y - cy)) + cx;
    let ny = (cos * (y - cy)) + (sin * (x - cx)) + cy;
    let newWidth = height * sin + width * cos;
    let newHeight = height * cos + width * sin ;
    if (rotateDegrees<180) {
    	nx = (cos * (x - cx)) - (sin * (y - cy)) + cx;
    	ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    	newWidth = height * sin - width * cos;
    	newHeight = height * cos - width * sin ;
    }
    newCoordinates.width = Math.abs(newWidth);
    newCoordinates.height = Math.abs(newHeight);
    newCoordinates.x = nx;
    newCoordinates.y = ny;
    return newCoordinates;
}

module.exports = {
  metaParseClassPiece: metaParseClassPiece,
  associateThumbToLabels: associateThumbToLabels,
  listClassPieces: listClassPieces,
  listClassPiece: listClassPiece,
  createThumbnails: createThumbnails,
  updateClassPieceFaces: updateClassPieceFaces
}
