const {promisify} = require('util');
const Canvas = require('canvas');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const ExifImage = require('exif').ExifImage;
const iptc = require('node-iptc');
const path = require('path');
const helpers = require("../../helpers");

const resourcesPath = process.env.RESOURCESPATH;
const archivePath = process.env.ARCHIVEPATH;

const visionKey = process.env.CLOUD_VISION_KEY;
const visionURL = process.env.CLOUD_VISION_ENDPOINT;

var schedule = require('node-schedule');

/**
* @api {get} /meta-parse-class-piece List classpiece
* @apiName list classpiece
* @apiGroup Tools
* @apiPermission admin
*
* @apiParam {string} file The filename of the requested classpiece.
* @apiSuccessExample {json} Success-Response:
{"status":true,"data":"Image analysis complete","error":"","msg":""}
*/
const parseClassPiece = async(req, resp) => {
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
  let dirPath = resourcesPath+"images/processed/compressed/";

  let fileString = path.parse(dirPath+"/"+file).name;
  let outputDir = resourcesPath+"output/"+fileString+"/";
  let imagesDir = outputDir+"images/";
  let thumbnailsDir = outputDir+"thumbnails/";
  let jsonDir = outputDir+"json/";
  let srcPath = dirPath+file;
  let fileName = path.parse(file).name;

  // make output dir
  if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir);
  }

  // make images dir
  if (!fs.existsSync(imagesDir)){
    fs.mkdirSync(imagesDir);
  }
  // make thumbnails dir
  if (!fs.existsSync(thumbnailsDir)){
    fs.mkdirSync(thumbnailsDir);
  }
  // make json dir
  if (!fs.existsSync(jsonDir)){
    fs.mkdirSync(jsonDir);
  }

  // prepare image
  var readFile = promisify(fs.readFile);
  var image = await readFile(srcPath);

  let imgData = new FormData();
  imgData.append('data', image);

  // 1. detect faces

  // 1.1 make a request to microsoft computer vision api
  let params = {
    visualFeatures: "Faces",
    language: "en"
  };
  const facesData = await axios({
    method: "post",
    url: visionURL+"vision/v2.0/analyze",
    data: image,
    params: params,
    crossDomain: false,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Ocp-Apim-Subscription-Key': visionKey
    }
  })
  .then(response=>{
    return response.data;
  })
  .catch(error => {
    console.log("error")
    console.log(error.response.data);
  });

  var identifiedFaces = facesData.faces;

  // 1.2 get results and create a new image with the highlights
  var outputFacesFile = imagesDir+fileName+"-faces.png";

  console.log('Highlighting faces...');
  await highlightFaces(srcPath, identifiedFaces, outputFacesFile, Canvas);
  console.log('Finished highlighting faces!');

  // 1.3 write the results in a json file for future reference
  fs.writeFile(jsonDir+fileName+"-faces.json", JSON.stringify(identifiedFaces), 'utf8', (error) => {
    if (error) throw err;
    console.log('Faces have been saved successfully!');
  });


  // 2. detect text
  // 2.1 make a request to microsoft computer vision api to initiate the text identification process
  let textParams = {
    mode: "Printed"
  }
  const textDataURL = await axios({
    method: "post",
    url: visionURL+"vision/v2.0/recognizeText",
    data: image,
    params: textParams,
    crossDomain: false,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Ocp-Apim-Subscription-Key': visionKey
    }
  })
  .then(response=>{
    let location = response.headers['operation-location'];
    console.log(location)
    return location;
  })
  .catch(error => {
    console.log("error")
    console.log(error.response.data);
  });

  let textDataFile = {
    url: textDataURL,
    completed: false
  }

  await fs.writeFile(jsonDir+fileName+"-text-status.json", JSON.stringify(textDataFile), 'utf8', (error) => {
    if (error) throw err;
    console.log('Text status saved successfully!');
  });

  // 2.2 initiate a cron job to check for the text analysis results every five minutes
  let cronJob = schedule.scheduleJob('*/1 * * * *', async()=> {
    let textResults = await getTextAnalysis(imagesDir,jsonDir,fileName);
    if (textResults) {
      cronJob.cancel();
    }
  });

  // 3. return results
  resp.json({
    status: true,
    data: "Image analysis complete",
    error: '',
    msg: '',
  })
}

const getTextAnalysis = async(imagesDir,jsonDir,fileName) => {
  console.log("cron job starts")
  // 1. check if text analysis is complete
  var readFile = promisify(fs.readFile);
  var json = await readFile(jsonDir+fileName+"-text-status.json");
  let jsonData = JSON.parse(json);
  if (jsonData.completed===false) {
    const textData = await axios({
      method: "get",
      url: jsonData.url,
      crossDomain: false,
      headers: {
        'Ocp-Apim-Subscription-Key': visionKey
      }
    })
    .then(response=>{
      return response;
    })
    .catch(error => {
      console.log("error")
      console.log(error.response.data);
    });
    if (typeof textData.data.status!=="undefined" && textData.data.status==="Succeeded") {
      // get results and create a new image with the highlights
      var outputTextFile = imagesDir+fileName+"-text.png";
      var outputFacesFile = imagesDir+fileName+"-faces.png";

      console.log('Highlighting labels...');
      await highlightText(outputFacesFile, textData.data, outputTextFile, Canvas);
      console.log('Finished highlighting labels!');

      await fs.writeFile(jsonDir+fileName+"-text.json", JSON.stringify(textData.data.recognitionResult), 'utf8', (error) => {
        if (error) throw err;
        console.log('Text has been saved successfully!');
      });

      let textDataFile = {
        url: jsonData.url,
        completed: true
      }

      await fs.writeFile(jsonDir+fileName+"-text-status.json", JSON.stringify(textDataFile), 'utf8', (error) => {
        if (error) throw err;
        console.log('Text status saved successfully!');
      });
      return true;
    }
    return false;
  }
  else {
    return false;
  }
}

const imageExif = (req, resp) => {
  let srcPath = "/Applications/XAMPP/htdocs/ahi/clericus/resources/1971.jpg";
  try {
    new ExifImage({ image : srcPath }, function (error, exifData) {
        if (error) {
          resp.json({
            status: false,
            data: '',
            error: true,
            msg: error.message,
          })
        }

        else {
          resp.json({
            status: true,
            data: exifData,
            error: false,
            msg: '',
          })
        }

    });
  } catch (error) {
      console.log('Error: ' + error.message);
  }
}

const imageIptc = async (req, resp) => {
  let srcPath = "/Applications/XAMPP/htdocs/ahi/clericus/resources/images/processed/1971.jpg";
  var parseIptcData = await parseIptc(srcPath);
  var iptc_data = iptc(parseIptcData);
  resp.json({
    status: true,
    data: iptc_data,
    error: false,
    msg: '',
  })
}

var parseIptc = async(src) => {
  return new Promise(function (resolve, reject) {
    fs.readFile(src, function(error, data) {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

var highlightFaces = async(inputFile, faces, outputFile, Canvas) => {
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

  faces.forEach(face => {
    context.beginPath();
    let rectangle = face.faceRectangle;
    context.moveTo(rectangle.left, rectangle.top);
    context.lineTo(rectangle.left+rectangle.width, rectangle.top);
    context.lineTo(rectangle.left+rectangle.width, rectangle.top+rectangle.height);
    context.lineTo(rectangle.left, rectangle.top+rectangle.height);
    context.lineTo(rectangle.left, rectangle.top);
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

var highlightText = async(inputFile, text, outputFile, Canvas) => {
  if (typeof text.recognitionResult==="undefined" || typeof text.recognitionResult.lines==="undefined") {
    return false;
  }
  let lines = text.recognitionResult.lines;
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
  let words = [];
  for (let key in lines) {
    let line = lines[key];
    if (typeof line.words!=="undefined") {
      for (let wordKey in line.words) {
        let word = line.words[wordKey];
        words.push(word);
      }
    }
  }
  words.forEach(word => {
    context.beginPath();
    let boundingBox = word.boundingBox;
    context.moveTo(boundingBox[0], boundingBox[1]);
    context.lineTo(boundingBox[2], boundingBox[3]);
    context.lineTo(boundingBox[4], boundingBox[5]);
    context.lineTo(boundingBox[6], boundingBox[7]);
    context.lineTo(boundingBox[0], boundingBox[1]);
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

const analyseDocument = async (req,resp) => {
  const directory = `${archivePath}documents/hamell/`;
  const files = await fs.readdirSync(`${directory}images/`);
  const readFile = promisify(fs.readFile);

  const ocrTextQuery = async(directory,i,file,fileName,srcPath) => {
    let textFile = await readFile(srcPath);
    let textParams = {
      mode: "Printed",
      language: "en",
      detectOrientation: false
    }
    let results = {};
    const ocrText = await axios({
      method: "post",
      url: visionURL+"vision/v2.0/ocr",
      data: textFile,
      params: textParams,
      crossDomain: false,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': visionKey
      }
    })
    .then(response=>{
      return response.data;
    })
    .catch(error => {
      console.log(`error ${i}-${fileName}\n`)
      console.log(error.response.data);
      return false;
    });
    if(ocrText!==false) {
      let targetFile = `${directory}output-json/${fileName}-output.json`;
      let writeFile = await new Promise((resolve,reject)=> {
        fs.writeFile(targetFile, JSON.stringify(ocrText), 'utf8', (error) => {
          if (error) {
            results = {status: false, error: error};
            reject(error);
          }
          else {
            results = {status: true, msg: `Text from file "${file}" saved successfully!`};
            resolve(true);
          }
        });
      })
    }
    else results = {status: false, error: "error"};
    return results;
  }

  let output = [];
  for (let i=0;i<files.length; i++) {
    let file = files[i];
    if (!file.includes(".jpg")) {
      continue;
    }

    let fileName = file.replace(".jpg", "");
    let srcPath = `${directory}images/${file}`;
    let startTime = new Date(Date.now() + i*5000);
    console.log(startTime);

    let cronJob = schedule.scheduleJob({start: startTime, rule: `*/1 * * * * *`}, async()=> {
      let textResults = await ocrTextQuery(directory,i,file,fileName,srcPath);
      if (textResults.status) {
        console.log(i+" "+textResults.msg);
        cronJob.cancel();
      }
    });
  }
  resp.json({
    status: true,
    data: output,
    error: false,
    msg: '',
  })
}

const getDocumentAnalysis = async(targetFile, outputFile) => {
  // 1. check if text analysis is complete
  var readFile = promisify(fs.readFile);
  var json = await readFile(targetFile);
  let jsonData = JSON.parse(json);
  if (jsonData.completed===false) {
    const textData = await axios({
      method: "get",
      url: jsonData.url,
      crossDomain: false,
      headers: {
        'Ocp-Apim-Subscription-Key': visionKey
      }
    })
    .then(response=>{
      return response;
    })
    .catch(error => {
      console.log("error")
      console.log(error.response.data);
    });
    if (typeof textData.data.status!=="undefined" && textData.data.status==="Succeeded") {
      // get results and create a new image with the highlights
      var outputTextFile = outputFile;

      await fs.writeFile(outputTextFile, JSON.stringify(textData.data.recognitionResult), 'utf8', (error) => {
        if (error) throw err;
        console.log('Text has been saved successfully!');
      });
      return true;
    }
    return false;
  }
  else {
    return false;
  }
}

const readDocumentResults = async(req,resp) => {
  const directory = `${archivePath}documents/hamell/`;
  const files = await fs.readdirSync(`${directory}output-json/`);
  const readFile = promisify(fs.readFile);
  const columnsPath = `${archivePath}documents/hamell/columns.json`;
  let columnsJson = await helpers.readJSONFile(columnsPath);
  let columnsData = columnsJson.data;
  let output = [];
  let thresholdX = 10;
  let thresholdY = 15;
  let c=-1;
  for (let i=0;i<files.length; i++) {
    let file = files[i];
    if (!file.includes(".json")) {
      continue;
    }
    else {
      c++;
    }
    let fileName = file.replace("-output.json", "");
    let columns = columnsData.find(f=>f.filename===Number(fileName));
    if (typeof columns==="undefined") {
      continue;
    }

    let path = `${directory}output-json/${file}`;
    let csvPath = `${directory}output-csv/${fileName}.csv`;
    let json = await helpers.readJSONFile(path);
    let regions = json.data.regions;

    let c0x, c1x, c2x, c3x, c4x, c5x, c0w, c1w, c2w, c3w, c4w, c5w, c0=[], c1=[], c2=[], c3=[], c4=[], c5=[], c0Word, c1Word, c2Word, c3Word, c4Word, c5Word;

    // expand control points according to threshold
    c0x = columns.c0.x0;
    c1x = columns.c1.x0;
    c2x = columns.c2.x0;
    c3x = columns.c3.x0;
    c4x = columns.c4.x0;
    c5x = columns.c5.x0;

    c0w = columns.c0.x1-c0x;
    c1w = columns.c1.x1-c1x;
    c2w = columns.c2.x1-c2x;
    c3w = columns.c3.x1-c3x;
    c4w = columns.c4.x1-c4x;
    c5w = columns.c5.x1-c5x;

    for (let k=0; k<regions.length; k++) {
      let r = regions[k];
      for (let m=0;m<r.lines.length; m++) {
        let l = r.lines[m];
        let bbox = l.boundingBox.split(",");
        let x = Number(bbox[0]);
        let y = Number(bbox[1]);
        let w = Number(bbox[2]);
        let h = Number(bbox[3]);
        let words = l.words.map(w=>{
          return w.text;
        }).join(" ");

        let output = {text: words, x:x, y:y, h:h};
        if (x>c0x && w<c0w && x+w<c1x)
          c0.push(output);
        if (x>c1x && w<c1w && x+w<c2x)
          c1.push(output);
        if (x>c2x && w<c2w && x+w<c3x)
          c2.push(output);
        if (x>c3x && w<c3w && x+w<c4x)
          c3.push(output);
        if (x>c4x && w<c4w && x+w<c5x)
          c4.push(output);
        if (x>c5x && w<c5w)
          c5.push(output);
      }
    }
    // sort by y
    c0.sort((a, b) =>{
      let akey = a.y;
      let bkey = b.y;
      if (akey<bkey) {
        return -1;
      }
      if (bkey<bkey) {
        return 1;
      }
      return 0;
    });
    c1.sort((a, b) =>{
      let akey = a.y;
      let bkey = b.y;
      if (akey<bkey) {
        return -1;
      }
      if (bkey<bkey) {
        return 1;
      }
      return 0;
    });
    c2.sort((a, b) =>{
      let akey = a.y;
      let bkey = b.y;
      if (akey<bkey) {
        return -1;
      }
      if (bkey<bkey) {
        return 1;
      }
      return 0;
    });
    c3.sort((a, b) =>{
      let akey = a.y;
      let bkey = b.y;
      if (akey<bkey) {
        return -1;
      }
      if (bkey<bkey) {
        return 1;
      }
      return 0;
    });
    c4.sort((a, b) =>{
      let akey = a.y;
      let bkey = b.y;
      if (akey<bkey) {
        return -1;
      }
      if (bkey<bkey) {
        return 1;
      }
      return 0;
    });
    c5.sort((a, b) =>{
      let akey = a.y;
      let bkey = b.y;
      if (akey<bkey) {
        return -1;
      }
      if (bkey<bkey) {
        return 1;
      }
      return 0;
    });

    // fix lines
    const rowText = (row, col) => {
      let result = "";
      let top = row.y-thresholdY;
      let bottom = row.y+row.h+thresholdY;

      let newText = col.filter(i=>{
        let topY = i.y;
        let bottomY = topY+i.h;
        if (top<topY && bottom>bottomY) {
          return true;
        }
        return false;
      });
      if (typeof newText!=="undefined") {
        newText.sort((a, b) =>{
          let akey = a.x;
          let bkey = b.x;
          if (akey<bkey) {
            return -1;
          }
          if (bkey<bkey) {
            return 1;
          }
          return 0;
        });
        for (let t=0;t<newText.length; t++) {
          result += newText[t].text;
        }
      }
      return result;
    }

    let csv = "";
    for (let n=0; n<c0.length;n++) {
      let row = c0[n];
      let text = row.text.replace(/,/g,".");
      text+=","+rowText(row,c1).replace(/,/g,".");
      text+=","+rowText(row,c2).replace(/,/g,".");
      text+=","+rowText(row,c3).replace(/,/g,".");
      text+=","+rowText(row,c4).replace(/,/g,".");
      text+=","+rowText(row,c5).replace(/,/g,".")+"\n";
      csv += text;
    }

    let writeFile = await new Promise ((resolve,reject)=> {
      fs.writeFile(csvPath, csv, 'utf8', function(err) {
        if (err) {
          output.push(error);
          reject(error);
        } else {
          output.push(`CSV from file "${file}" created successfully at the path "${csvPath}"`)
          resolve(true);
        }
      });
    });
  }
  resp.json({
    status: true,
    data: output,
    error: false,
    msg: '',
  })
}

const getColumns = async (req, resp) => {
  const path = `${archivePath}documents/hamell/columns.json`;
  let data = await helpers.readJSONFile(path);
  resp.json({
    status: true,
    data: data,
    error: false,
    msg: '',
  })
}

const updateColumns = async (req, resp) => {
  let newData = req.body;
  const path = `${archivePath}documents/hamell/columns.json`;
  let json = await helpers.readJSONFile(path);
  let data = json.data;
  let item = data.find(d=>d.filename===Number(newData.filename));
  if (typeof item==="undefined") {
    data.push(newData);
  }
  else {
    let index = data.indexOf(item);
    data[index] = newData;
  }
  await fs.writeFile(path, JSON.stringify(data), 'utf8', (error) => {
    if (error) throw err;
    console.log('Text status saved successfully!');
  });
  resp.json({
    status: true,
    data: data,
    error: false,
    msg: '',
  })
}


module.exports = {
  parseClassPiece: parseClassPiece,
  imageExif: imageExif,
  imageIptc: imageIptc,
  analyseDocument: analyseDocument,
  readDocumentResults: readDocumentResults,
  getColumns: getColumns,
  updateColumns: updateColumns,
}
