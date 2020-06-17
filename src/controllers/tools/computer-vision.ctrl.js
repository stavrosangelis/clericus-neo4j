const {promisify} = require('util');
const Canvas = require('canvas');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const driver = require("../../config/db-driver");

const ExifImage = require('exif').ExifImage;
const iptc = require('node-iptc');
const path = require('path');
const helpers = require("../../helpers");
const csvParser = require('csv-parser');
const stringSimilarity = require('string-similarity');
const levenshtein = require('js-levenshtein');
const Taxonomy = require('../taxonomy.ctrl').Taxonomy;
const TaxonomyTerm = require('../taxonomyTerm.ctrl').TaxonomyTerm;
const references = require('../references.ctrl');
const Person = require('../person.ctrl').Person;

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
          output.push(err);
          reject(err);
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


const prepareForIngestion = async (req,resp) => {
  const directory = `${archivePath}documents/hamell-csv/`;
  const outputDirectory = `${archivePath}documents/hamell-csv-output/`;
  const files = await fs.readdirSync(directory);
  let headers = ['Name','Diocese','Matriculated','Class','Ordained'];
  let userId = req.decoded.id;
  let output = [];
  let count = 0;
  let csv = "Name,Diocese,Matriculated,Class,Ordained,DB name,Classpiece, URL\n";
  let hasTimeTerm = new Taxonomy({systemType:"hasTime"});
  await hasTimeTerm.load();
  let matriculationClass = new Taxonomy({systemType:"matriculationClass"});
  await matriculationClass.load();
  let organisationTaxonomyTerm = new TaxonomyTerm({labelId: "hasAffiliation"});
  await organisationTaxonomyTerm.load();
  let eventTypeMatriculation = new TaxonomyTerm({labelId: "matriculation"});
  await eventTypeMatriculation.load();
  let eventTypeOrdination = new TaxonomyTerm({labelId: "ordination"});
  await eventTypeOrdination.load();
  let moTaxonomyTerm = new TaxonomyTerm({labelId: "hasParticipant"});
  await moTaxonomyTerm.load();
  let referenceTerm = new TaxonomyTerm({labelId: "isReferencedIn"});
  await referenceTerm.load();

  let ordinationRanks = new Taxonomy({systemType:"ordinationRanks"});
  await ordinationRanks.load();

  let hamell1 = await loadHamellRef();

  for (f in files) {
    let fileNum = files[f];
    console.log(fileNum);
    let file = await new Promise((resolve,reject)=>{
      let results = [];
      fs.createReadStream(directory+fileNum)
      .pipe(csvParser(headers))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
    });
    const isUpperCase = (str) => /^[A-Z']*$/.test(str);
    const firstCapital = helpers.capitalCaseOnlyFirst;
    const isVowel = (char) => ["a", "e", "i", "o", "u","y"].includes(char);
    const removeExtern = (str)=>{
      str = str.replace('(extern)','')
      .replace('(extern','')
      .replace('extern)','')
      .replace('extern','');
      return str;
    }
    const removePriest = (str)=>{
      str = str.replace('(priest)','').replace('(Priest)','');
      return str;
    }
    const removeSame = (str)=>{
      str = str.replace('same','').replace('same.','');
      return str;
    }
    const removeSpecialCharacters = (str)=>{
      str = str.replace(/\*/g,'');
      str = str.replace(/,/g,'');
      str = str.replace(/\?/g,'');
      return str;
    }
    const parseVid = (str) => {
      if (str.toLowerCase().includes("vid")) {
        return {
          status: true,
          str: str.replace("vid.","").replace("vid","").trim()
        };
      }
      return {
        status: false,
        str: str
      };
    }
    const lastNamePrefix = (prefix, lastName) => {
      if (prefix===null) {
        return ;
      }
      prefix = prefix.replace(/[()]+/g,"").trim();
      if (prefix.length>=lastName.length && !prefix.includes("'")) {
        return prefix;
      }
      else if (prefix.includes("'")){
        let prefixLength = prefix.length-1;
        let lastChar = prefix[prefixLength].toLowerCase();
        if (isVowel(lastChar)) {
          let firstIndex = null;
          let lastIndex = null;
          for (let i=0;i<lastName.length;i++) {
            let char = lastName[i];
            if (isVowel(char.toLowerCase())) {
              firstIndex = i;
              break;
            }
          }
          if (firstIndex!==null) {
            for (let i=0;i<lastName.length;i++) {
              let char = lastName[i];
              if (i>firstIndex && !isVowel(char.toLowerCase())) {
                lastIndex = i;
                break;
              }
            }
          }
          let lastCharIndex = lastName.length-1;
          lastName = lastName.substring(lastIndex, lastCharIndex);
          return prefix+lastName;
        }
        else {
          return "O'"+lastName;
        }
      }
      else {
        lastName = lastName.replace(/[()]+/g,"");
        return lastName;
      }
    }
    const extractPrefix = (str) => {
      let re = /\s\(([^)]+)\)/;
      let prefix = str.match(re);
      let prefixStr = null;
      if (prefix!==null) {
        prefixStr = prefix[0];
      }
      str = str.replace(prefixStr,'');
      return {
        prefix: prefixStr,
        str: str
      }
    }
    const parseLastName = (lastName) => {
      let alLastName = "";
      // prefix
      if (lastName.includes("-)")) {
        let re = /\(([^)]+)\)/;
        let prefix = lastName.match(re);
        prefix = prefix[0].replace(/[()-]+/g,"");
        let cleanLastName = lastName.replace(/\(([^)]+)\)/,'');
        cleanLastName = cleanLastName.substring(prefix.length);
        alLastName = prefix+cleanLastName;
      }
      // suffix
      if (lastName.includes("(-")) {
        let re = /\(([^)]+)\)/;
        let suffix = lastName.match(re);
        suffix = suffix[0].replace(/[()-]+/g,"");
        let cleanLastName = lastName.replace(/\(([^)]+)\)/,'');
        let length = cleanLastName.length-suffix.length;
        cleanLastName = cleanLastName.substring(0,length);
        alLastName = cleanLastName+suffix;
      }
      // no indication
      if (lastName.includes("(") && !lastName.includes("-")) {
        alLastName = lastName.replace(/\(([^)]+)\)/g,'');
      }
      lastName = lastName.replace(/[()-]+/g,'');
      lastName = firstCapital(lastName);
      if (alLastName!=="") {
        alLastName = firstCapital(alLastName);
      }
      return {
        lastName: lastName,
        alLastName: alLastName,
      }
    }

    const extractReligiousOrder = (str) => {
      let orders = [" OMI", " Soc. Miss.", " O. Carm.", " O. Carm", " OFM", " O.F.M.", " SJ", " S.J.", " OP", " O.P.", " CM", " C.M.", " OSA", " Missionary", " OMI", " OFM Cap.", " OFM Cap", " ODC", " CP"];
      let relOrder = null;
      for (let i in orders) {
        let order = orders[i];
        if (str.includes(order)) {
          relOrder = order;
          str = str.replace(order,"");
        }
      }
      return {
        order: relOrder,
        str: str
      }
    }
    const splitName = (str) => {
      let religiousOrder = extractReligiousOrder(str);
      let religiousOrderText = religiousOrder.order;
      str = religiousOrder.str;
      let parsePrefix = extractPrefix(str);
      let prefix = parsePrefix.prefix;
      str = parsePrefix.str;
      let parts = str.split(" ");
      let lastName='', firstName='', middleName='';
      let alLastName='', alFirstName='', alMiddleName='';
      let lastNameIndex = -1;
      for (let i in parts) {
        let part = parts[i];
        let cleanPart = removeSpecialCharacters(part);
        cleanPart = cleanPart.replace(/[()-]+/g,"").trim();
        if (isUpperCase(cleanPart)) {
          lastName = part;
          lastNameIndex = Number(i);
          break;
        }
      }
      let fnIndex = lastNameIndex+1;
      let mnIndex = fnIndex+1;
      if (typeof parts[fnIndex]!=="undefined") {
        firstName = parts[fnIndex];
        if (firstName.includes("(")) {
          alFirstName = firstName.replace(/\(([^)]+)\)/g,'');
          alFirstName = firstCapital(alFirstName);
          firstName = firstName.replace(/[()-]+/g,'');
        }
        firstName = firstCapital(firstName);
      }
      if (typeof parts[mnIndex]!=="undefined") {
        middleName = parts[mnIndex];
        middleName = firstCapital(middleName);
      }
      if (prefix!==null) {
        // check if firstname or lastName
        let prefixClean = removeSpecialCharacters(prefix);
        prefixClean = prefixClean.replace(/[()']+/g,"").trim();
        // comparisons
        let isLastName = false;
        if (isUpperCase(prefixClean)) {
          isLastName = true;
        }
        else {
          let l1 = stringSimilarity.compareTwoStrings(prefixClean, lastName);
          let l2 = levenshtein(prefixClean, lastName);
          let f1 = stringSimilarity.compareTwoStrings(prefixClean, firstName);
          let f2 = levenshtein(prefixClean, firstName);
          if (l1>=f1 && l2<=f2) {
            isLastName = true;
          }
        }

        if (isLastName) {
          let lastNameWithPrefix = lastNamePrefix(prefix,lastName);
          let newAlLastName = firstCapital(lastNameWithPrefix);
          for (let i in newAlLastName) {
            let char = newAlLastName[i];
            let prevIndex = Number(i)-1
            if (newAlLastName[prevIndex]==="'") {
              char = char.toUpperCase();
            }
            alLastName += char;
          }
        }
        else {
          alFirstName = firstCapital(prefixClean);
        }
      }
      let prepareLastName = parseLastName(lastName);
      lastName = prepareLastName.lastName;
      if (prepareLastName.alLastName!=="") {
        alLastName = prepareLastName.alLastName
      }
      let output = {
        lastName:lastName,
        firstName:firstName,
      }
      if (middleName!=='') {
        output.middleName = middleName;
      }
      if (alLastName!=='') {
        output.alternateLastName = alLastName;
      }
      if (alFirstName!=='') {
        output.alternateFirstName = alFirstName;
      }
      if (religiousOrderText!=="") {
        output.religiousOrder = religiousOrderText;
      }
      return output;
    }
    const hasQuestionMark = (str) => {
      if (str.includes("?")) {
        return true;
      }
      return false;
    }
    const hasSame = (str) => {
      if (str.includes("same")) {
        return true;
      }
      return false;
    }

    const parseName = (str) => {
      str = removeExtern(str);
      str = removePriest(str);
      str = removeSame(str);
      str = removeSpecialCharacters(str);
      str = str.trim();
      str = splitName(str);
      return str;
    }
    const parseMatriculationDate = (str) => {
      str = removeSpecialCharacters(str);
      str = str.replace("(PL)","").replace("P-PL","").replace("(I)","").replace("(II)","");
      str = removeExtern(str);
      str = removePriest(str);
      str = removeSame(str);
      let parts = str.split(".");
      if (parts.length!==3) {
        if (isNaN(Number(str))) {
          str = "";
        }
        else if (str!==""){
          str = `1-1-${str}`
        };
      }
      else if (parts.length===1 && str!==""){
        str = `1-1-${str}`
      }
      else {
        str = parts.join("-");
      }
      return str;
    }

    const parseDeath = (str) => {}
    const parseDash = (str) => {
      str = str.replace(".","");
      str = str.replace(/[a-z]/gi,"");
      let parts = str.split("-");
      let startYear = parts[0];
      let endYear = parts[1];
      let lastIndex = 4 - endYear.length;
      let yearPrefix = startYear.substring(0,lastIndex);
      startYear = `1-1-${startYear}`;
      endYear = `31-12-${yearPrefix}${endYear}`;
      return {start: startYear, end: endYear};
    }
    const parseDot = (str) => {
      let parts = str.split(".");
      if (parts.length!==3) {
        if (isNaN(Number(str))) {
          str = "";
        }
        else if (parts.length===1 && str!==""){
          str = `1-1-${str}`
        };
      }
      else {
        str = parts.join("-");
      }
      return {start:str};
    }
    const parseRole = (str) => {
      let role = "";
      if (str.includes("l")||str.includes("L")) {
        role = "Lector";
      }
      if (str.includes("a")||str.includes("A")) {
        role = "Acolyte";
      }
      if (str.includes("t")||str.includes("T")) {
        role = "Tonsure";
      }
      if (str.includes("s")||str.includes("S")) {
        role = "Subdeacon";
      }
      if (str.includes("d")||str.includes("D")) {
        role = "Deacon";
      }
      return role;
    }

    const parseOrdinationDateItem = (str) => {
      let item = {};
      if (str.toLowerCase().includes("Ad vota saec")) {
        item.eventType = "did not complete studies";
      }
      else if (str.includes("d.")) {
        item.eventType = "death";
        str = str.replace("d.","");
      }
      else {
        item.eventType = "ordination";
      }
      if (str!=="yes") {
        let date = str.replace(/[LATSDlatsd]+/g,'');
        if (date.includes("-")) {
          date = parseDash(date);
        }
        else if (date.includes(".")) {
          date = parseDot(date);
        }
        else if (date.length===4) {
          date = {start:`1-1-${date}`};
        }
        let role = parseRole(str);
        item.date = date;
        if (role!=="") {
          item.role = role;
        }
      }
      return item;
    }

    const parseOrdinationDate = (str) => {
      let output = [];
      str = removeSpecialCharacters(str);
      str = str.replace("(PL)","").replace("P-PL","").replace("P","").replace("(I)","").replace("(II)","").replace(/ /g,"");
      str = removeExtern(str);
      str = removePriest(str);
      str = removeSame(str);
      if (str.includes(";")) {
        let parts = str.split(";");
        for (let i in parts) {
          let part = parts[i];
          let item = parseOrdinationDateItem(part);
          output.push(item)
        }
      }
      else {
        let item = parseOrdinationDateItem(str);
        output.push(item)
      }
      return output;
    }
    const parseColClass = (str) => {
      let outputString = "";
      let outputNum = "";
      for (let i in str) {
        let letter = str[i];
        let num = Number(letter);
        if (isNaN(num)) {
          outputString += letter;
        }
        else outputNum += letter;
      }
      let newStr = outputString+outputNum;
      newStr = removeSpecialCharacters(newStr);
      newStr = newStr.replace(/\./g,'');
      return newStr;
    }

    for (let line in file) {
      let row = file[line];
      if (Number(line)>0) {
        let colName = row['0'];
        let colDiocese = row['1'];
        let colMatriculated = row['2'];
        let colClass = row['3'];
        let colOrdained = row['4'];
        let vidText = "";

        let dioceseText = "";
        let checkDioceseVid = parseVid(colDiocese);
        if (checkDioceseVid.status) {
          vidText = checkDioceseVid.str;
          colDiocese = "";
        }
        if (colDiocese!=="") {
          dioceseText = colDiocese;
        }
        let matriculationOutput = {};
        let checkMatriculationVid = parseVid(colMatriculated);
        if (checkMatriculationVid.status) {
          vidText = checkMatriculationVid.str;
          colMatriculated = "";
        }
        let checkClassVid = parseVid(colClass);
        if (checkClassVid.status) {
          vidText = checkClassVid.str;
          colClass = "";
        }
        if (colMatriculated!=="") {
          matriculationOutput.date = parseMatriculationDate(colMatriculated);
          if (colClass!=="") {
            matriculationOutput.role = parseColClass(colClass);
          }
        }
        let checkOrdinationVid = parseVid(colOrdained);
        if (checkOrdinationVid.status) {
          vidText = checkOrdinationVid.str;
          colOrdained = "";
        }
        let ordinationOutput = [];
        if (colOrdained!=="") {
          ordinationOutput = parseOrdinationDate(colOrdained);
        }
        let nameCol = parseName(colName);

        if (fileNum==="1.csv") {
          output.push({
            name: nameCol,
            diocese: dioceseText,
            matriculation: matriculationOutput,
            ordination: ordinationOutput,
          });
        }

        // 1. insert person
        let match = await existingPerson(nameCol, dioceseText, ordinationOutput);
        let person = null;
        if (match.match) {
          person = match.person;
        }
        else {
          person = await addPerson(nameCol,userId);
        }
        if (typeof person._id==="undefined") {
          continue;
        }
        // 2.1 insert organisation/diocese
        let diocese = await addDiocese(dioceseText, userId);

        // 2.2 link diocese with person
        let dioceseReference = {
          items: [
            {_id: person._id, type: "Person"},
            {_id: diocese._id, type: "Organisation"},
          ],
          taxonomyTermId: organisationTaxonomyTerm._id,
        }
        let dioceseRef = await references.updateReference(dioceseReference);
        // 3.1. insert organisation/religious order
        if (nameCol.religiousOrder!==null) {
          let religiousOrder = await addReligiousOrder(nameCol.religiousOrder, userId);
          // 3.2 link religious order with person
          let roReference = {
            items: [
             {_id: person._id, type: "Person"},
             {_id: religiousOrder._id, type: "Organisation"},
            ],
            taxonomyTermId: organisationTaxonomyTerm._id,
          }
          let roRef = await references.updateReference(roReference);
        }

        // 4.1 insert matriculation date
        let matriculationDate = null;
        if (typeof matriculationOutput.date!=="undefined") {
          matriculationDate = await addDate(matriculationOutput.date,null,userId);
        }

        // 4.2 insert matriculation role
        let matriculationRole = null;
        if (typeof matriculationOutput.role!=="undefined" && matriculationOutput.role!=="") {
          matriculationRole = await addTaxonomyRole(matriculationOutput.role, matriculationClass._id, userId);
        }
        // 4.3 add matriculation event
        if (matriculationDate!==null) {
          let matriculationLabel = `Matriculation`;
          if (matriculationRole!==null) {
            matriculationLabel += ` into ${matriculationOutput.role}`;
          }
          let matriculationEvent = await addNewEvent(matriculationLabel, eventTypeMatriculation._id, userId);
          // 4.5 matriculation event/person reference
          let matriculationReference = {
            items: [
              {_id: matriculationEvent._id, type: "Event"},
              {_id: person._id, type: "Person"}
            ],
            taxonomyTermId: moTaxonomyTerm._id,
          };
          if (matriculationRole!==null) {
            matriculationReference.items[1].role = null;
            matriculationReference.items[0].role = matriculationRole._id;
          }
          await references.updateReference(matriculationReference);
          // 4.6 matriculation event/date reference
          let matriculationDateReference = {
            items: [
              {_id: matriculationEvent._id, type: "Event"},
              {_id: matriculationDate._id, type: "Temporal"}
            ],
            taxonomyTermId: hasTimeTerm._id,
          };
          await references.updateReference(matriculationDateReference);
        }


        // 5. insert ordination event (array)
        for (let j=0;j<ordinationOutput.length; j++) {
          let ordinationItem = ordinationOutput[j];
          let eventType = "", startDate="", endDate=null, role="";
          if (typeof ordinationItem.eventType!=="undefined") {
            eventType = ordinationItem.eventType
          }
          if (typeof ordinationItem.date!=="undefined") {
            if (typeof ordinationItem.start!=="undefined") {
              startDate = ordinationItem.start;
            }
            if (typeof ordinationItem.end!=="undefined") {
              endDate = ordinationItem.end;
            }
          }
          if (typeof ordinationItem.role!=="undefined") {
            role = ordinationItem.role
          }
          let label = "Ordination";
          if (role!=="") {
            label += ` as ${role}`;
          }
          let ordinationDate = null;
          let ordinationDateId = null;
          if (startDate!=="") {
            ordinationDate = await addDate(startDate,endDate,userId);
            ordinationDateId = ordinationDate._id;
          }
          let ordinationEvent = await updateEvent(label, eventTypeOrdination._id, ordinationDateId, userId);
          let ordinationReference = {
            items: [
              {_id: ordinationEvent._id, type: "Event"},
              {_id: person._id, type: "Person"}
            ],
            taxonomyTermId: moTaxonomyTerm._id,
          };
          if (role!=="") {
            let ordinationRole = await addTaxonomyRole(role, ordinationRanks._id, userId);
            ordinationReference.items[1].role = null;
            ordinationReference.items[0].role = ordinationRole._id;
          }
          await references.updateReference(ordinationReference);
          if (ordinationDate!==null) {
            let ordinationDateReference = {
              items: [
                {_id: ordinationEvent._id, type: "Event"},
                {_id: ordinationDate._id, type: "Temporal"}
              ],
              taxonomyTermId: hasTimeTerm._id,
            };
            await references.updateReference(ordinationDateReference);
          }

        }
        // 6. link to hamell1
        if (typeof person._id!=="undefined") {
          let hamellReference = {
            items: [
              {_id: person._id, type: "Person"},
              {_id: hamell1._id, type: "Resource"},
            ],
            taxonomyTermId: referenceTerm._id,
          }
          let hamellRef = await references.updateReference(hamellReference);
        }

      }
    }
  }
  resp.json({
    status: true,
    data: [],
    error: false,
    msg: '',
  })
}

const existingPerson = async(name, diocese, ordination) => {
  if (diocese==="") {
    return {
      match: false,
      person: null,
    }
  }
  let session = driver.session();
  let output = {};
  let match = false;
  let person = null;
  let lastName = name.lastName.toLowerCase().trim();
  lastName = helpers.addslashes(lastName);
  let firstName = name.firstName.toLowerCase().trim();
  firstName = helpers.addslashes(firstName);
  let query = `MATCH (n:Person) WHERE LOWER(n.lastName)="${lastName}" AND LOWER(n.firstName)="${firstName}" RETURN n`;
  let nodesPromise = await session.writeTransaction(tx=>tx.run(query,{}))
  .then(result=> {
    session.close();
    return result.records;
  }).catch((error) => {
    console.log(error)
  });
  if(nodesPromise.length>0) {
    let nodes = helpers.normalizeRecordsOutput(nodesPromise);
    let ordinationYears = ordination.map(o=>{
      if (typeof o.date!=="undefined") {
        let startDate = o.date.start;
        if (typeof o.date.start!=="undefined") {
          let date = startDate.split("-");
          return Number(date[2]);
        }
      }
      else return 0;
    })
    for (let i=0;i<nodes.length; i++) {
      let node = nodes[i];
      // Check for existing First name and last name and diocese and ordination year with classpiece
      let organisations = await helpers.loadRelations(node._id, "Person", "Organisation", false, "hasAffiliation");
      let classpieces = await helpers.loadRelations(node._id, "Person", "Resource", false, "isDepictedOn");
      let findDiocese = organisations.find(o=>{
        if (o.ref.label.toLowerCase()===diocese.toLowerCase().trim()) {
          return true;
        }
        return false;
      });
      let findClasspiece = classpieces.find(c=>{
        let label = c.ref.label;
        label = label.substr(0,4);
        let num = Number(label);
        let prev2 = num-2;
        let prev = num-1;
        let next = num+1;
        let next2 = num+2;
        if (ordinationYears.indexOf(num)>-1 || ordinationYears.indexOf(prev)>-1 || ordinationYears.indexOf(prev2)>-1 || ordinationYears.indexOf(next)>-1 || ordinationYears.indexOf(next2)>-1) {
          return true;
        }
        return false;
      });

      let nodeClasspiece = "";
      if (classpieces.length>0 && classpieces[0].ref.label) {
        nodeClasspiece = classpieces[0].ref.label;
      };
      if (typeof findDiocese!=="undefined" && typeof findClasspiece!=="undefined") {
        match = true;
        person = node;
      }
    }
  }
  output.match = match;
  output.person = person;
  return output;
}

const addPerson = async(nameCol, userId) => {
  let session = driver.session();
  let firstName="",middleName="",lastName="",fnameSoundex="", lnameSoundex="",alternateAppelation={},alternateAppelationVal=[];
  if (typeof nameCol.middleName!=="undefined" && nameCol.middleName!=="") {
    middleName = nameCol.middleName;
  }
  if (typeof nameCol.firstName!=="undefined" && nameCol.firstName!=="") {
    fnameSoundex = helpers.soundex(nameCol.firstName);
    firstName = nameCol.firstName;
  }
  if (typeof nameCol.lastName!=="undefined" && nameCol.lastName!=="") {
    lnameSoundex = helpers.soundex(nameCol.lastName);
    lastName = nameCol.lastName;
  }
  let hasAlt = false;
  if (typeof nameCol.alLastName!=="undefined" && nameCol.alLastName!=="") {
    alternateAppelation.lastName = nameCol.alLastName;
    hasAlt = true;
  }
  if (typeof nameCol.alFirstName!=="undefined" && nameCol.alFirstName!=="") {
    alternateAppelation.firstName = nameCol.alFirstName;
    hasAlt = true;
  }
  if (hasAlt) {
    alternateAppelation.appelation = "";
    alternateAppelationVal = [alternateAppelation];
  }
  let personData = {
    label:null,
    honorificPrefix:[],
    firstName:firstName,
    middleName:middleName,
    lastName:lastName,
    fnameSoundex:fnameSoundex,
    lnameSoundex:lnameSoundex,
    alternateAppelations:alternateAppelationVal,
  };
  let newPerson = new Person(personData);
  let person = await newPerson.save(userId);
  return person.data;
}

const addDiocese = async(diocese, userId) => {
  diocese = diocese.trim();
  let escapeDiocese = helpers.addslashes(diocese);
  let session = driver.session();
  let query = `MATCH (n:Organisation) WHERE n.organisationType="Diocese" AND LOWER(n.label)="${escapeDiocese.toLowerCase()}" RETURN n`;
  let organisation = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    let records = result.records;
    let outputRecord = null;
    if (records.length>0) {
      let record = records[0].toObject();
      outputRecord = helpers.outputRecord(record.n);
    }
    return outputRecord;
  }).catch((error) => {
    console.log(error)
  });
  if (organisation===null) {
    let newOrganisation = {};
    let now = new Date().toISOString();
    newOrganisation.label = diocese;
    newOrganisation.createdBy = userId;
    newOrganisation.createdAt = now;
    newOrganisation.updatedBy = userId;
    newOrganisation.updatedAt = now;
    newOrganisation.organisationType = "Diocese";
    newOrganisation.status = "private";
    newOrganisation.labelSoundex = helpers.soundex(diocese);
    let nodeProperties = helpers.prepareNodeProperties(newOrganisation);
    let params = helpers.prepareParams(newOrganisation);
    let query = `CREATE (n:Organisation ${nodeProperties}) RETURN n`;
    organisation = await session.writeTransaction(tx=>tx.run(query,params))
    .then(result=> {
      session.close();
      let records = result.records;
      let outputRecord = null;
      if (records.length>0) {
        let record = records[0].toObject();
        outputRecord = helpers.outputRecord(record.n);
      }
      return outputRecord;
    }).catch((error) => {
      console.log(error)
    });
  }
  else {
    session.close();
  }
  return organisation;
}

const addReligiousOrder = async(religiousOrder, userId) => {
  religiousOrder = religiousOrder.replace(/\./g,"").trim();
  let escapeReligiousOrder = helpers.addslashes(religiousOrder);
  let session = driver.session();
  let query = `MATCH (n:Organisation) WHERE n.organisationType="ReligiousOrder" AND LOWER(n.label)="${escapeReligiousOrder.toLowerCase()}" RETURN n`;
  let organisation = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    let records = result.records;
    let outputRecord = null;
    if (records.length>0) {
      let record = records[0].toObject();
      outputRecord = helpers.outputRecord(record.n);
    }
    return outputRecord;
  }).catch((error) => {
    console.log(error)
  });
  if (organisation===null) {
    let newOrganisation = {};
    let now = new Date().toISOString();
    newOrganisation.label = religiousOrder;
    newOrganisation.createdBy = userId;
    newOrganisation.createdAt = now;
    newOrganisation.updatedBy = userId;
    newOrganisation.updatedAt = now;
    newOrganisation.organisationType = "ReligiousOrder";
    newOrganisation.status = "private";
    newOrganisation.labelSoundex = helpers.soundex(religiousOrder);
    let nodeProperties = helpers.prepareNodeProperties(newOrganisation);
    let params = helpers.prepareParams(newOrganisation);
    let query = `CREATE (n:Organisation ${nodeProperties}) RETURN n`;
    organisation = await session.writeTransaction(tx=>tx.run(query,params))
    .then(result=> {
      session.close();
      let records = result.records;
      let outputRecord = null;
      if (records.length>0) {
        let record = records[0].toObject();
        outputRecord = helpers.outputRecord(record.n);
      }
      return outputRecord;
    }).catch((error) => {
      console.log(error)
    });
  }
  else {
    session.close();
  }
  return organisation;
}

const addDate = async(startDate, endDate=null, userId) => {
  let session = driver.session();
  startDate = startDate.replace(/\ /g,"");
  if (endDate!==null) {
    endDate = endDate.replace(/\ /g,"");
  }
  let queryEndDate = "";
  if (endDate!==null && endDate!=="") {
    queryEndDate = `AND n.endDate="${endDate}" `;
  }
  let query = `MATCH (n:Temporal) WHERE n.startDate="${startDate}" ${queryEndDate} RETURN n`;
  let temporal = await session.writeTransaction(tx=>tx.run(query,{}))
  .then(result=> {
    let records = result.records;
    let outputRecord = null;
    if (records.length>0) {
      let record = records[0].toObject();
      outputRecord = helpers.outputRecord(record.n);
    }
    return outputRecord;
  }).catch((error) => {
    console.log(error)
  });
  if (temporal===null) {
    let now = new Date().toISOString();
    let label = startDate;
    if (endDate!==null) {
      label +=  ` - ${endDate}`;
    }
    let newItem = {
      label: label,
      startDate: startDate,
      endDate: endDate,
      createdBy: userId,
      createdAt: now,
      updatedBy: userId,
      updatedAt: now,
    }
    let nodeProperties = helpers.prepareNodeProperties(newItem);
    let params = helpers.prepareParams(newItem);
    let query = `CREATE (n:Temporal ${nodeProperties}) RETURN n`;
    temporal = await session.writeTransaction(tx=>tx.run(query,params))
    .then(result=> {
      session.close();
      let records = result.records;
      let outputRecord = null;
      if (records.length>0) {
        let record = records[0].toObject();
        outputRecord = helpers.outputRecord(record.n);
      }
      return outputRecord;
    }).catch((error) => {
      console.log(error)
    });
  }
  else {
    session.close();
  }
  return temporal;
}

const addTaxonomyRole = async(label, taxonomyId, userId) => {
  label = label.trim();
  let labelId = helpers.normalizeLabelId(label);
  let taxonomyTerm = new TaxonomyTerm({labelId: labelId});
  await taxonomyTerm.load();
  if (taxonomyTerm._id===null) {
    // save taxonomy term
    let newData = {
      label: label,
      inverseLabel:label
    };
    taxonomyTerm = new TaxonomyTerm(newData);
    let saveTaxonomyTerm = await taxonomyTerm.save(userId);
    taxonomyTerm = saveTaxonomyTerm.data;
    // link to matriculation class taxonomy
    let newReference = {
      items: [
        {_id: taxonomyId, type: "Taxonomy"},
        {_id: taxonomyTerm._id, type: "TaxonomyTerm"}
      ],
      taxonomyTermLabel: "hasChild",
    }
    await references.updateReference(newReference);
  }
  return taxonomyTerm;
}

const addNewEvent = async(label, type, userId) => {
  let session = driver.session();
  let now = new Date().toISOString();
  let eventData = {
    label: label,
    eventType: type,
    status: 'private',
    createdBy: userId,
    createdAt: now,
    updatedBy: userId,
    updatedAt: now,
  }
  let nodeProperties = helpers.prepareNodeProperties(eventData);
  let params = helpers.prepareParams(eventData);
  let query = `CREATE (n:Event ${nodeProperties}) RETURN n`;
  let item = await session.writeTransaction(tx=>tx.run(query,params))
  .then(result=> {
    session.close();
    let records = result.records;
    let outputRecord = null;
    if (records.length>0) {
      let record = records[0].toObject();
      outputRecord = helpers.outputRecord(record.n);
    }
    return outputRecord;
  }).catch((error) => {
    console.log(error)
  });
  return item;
}

const updateEvent = async(label, type, temporalId, userId) => {
  let event = null;
  if (temporalId!==null) {
    let session = driver.session();
    let escapeLabel = helpers.addslashes(label);
    let query = `MATCH (n:Event)-->(t:Temporal) WHERE LOWER(n.label)="${escapeLabel.toLowerCase()}" AND n.eventType="${type}" AND id(t)=${temporalId} RETURN n`;
    event = await session.writeTransaction(tx=>
      tx.run(query,{})
    )
    .then(result=> {
      session.close();
      let records = result.records;
      let outputRecord = null;
      if (records.length>0) {
        let record = records[0].toObject();
        outputRecord = helpers.outputRecord(record.n);
      }
      return outputRecord;
    }).catch((error) => {
      console.log(error)
    });
  }
  if (event===null) {
    event = await addNewEvent(label, type, userId);
  }
  return event;
}

const loadHamellRef = async() => {
  let session = driver.session();
  let query = `MATCH (n:Resource) WHERE LOWER(n.label)="hamell 1" return n`;
  let node = await session.writeTransaction(tx=>tx.run(query,{}))
  .then(result=> {
    session.close();
    let records = result.records;
    if (records.length>0) {
      let record = records[0].toObject();
      let outputRecord = helpers.outputRecord(record.n);
      return outputRecord;
    }
  }).catch((error) => {
    console.log(error)
  });
  return node;
}

const afterIngestion = async (req,resp)=>{
  let matriculationClasses = [
    {
      term: "Humanity",
      alternateTerms: ["Humamty","Humanicy","Humanitv","Humanity()","Humantiy","Hurnanity","Rhumanity"]
    },
    {
      term: "Philosophy1",
      alternateTerms: ["IPhilosophy","Philosoohy1","Philosopny1","Philsoophy1"]
    },
    {
      term: "Philosophy2",
      alternateTerms: ["Phiosophy2"]
    },
    {
      term: "Physics",
      alternateTerms: ["Phvsics"]
    },
    {
      term: "Rhetoric",
      alternateTerms: ["Rheioric","RhetoriC","Rhetoricd","Rhetortc","Rhetotic"]
    },
    {
      term: "Theology",
      alternateTerms: ["TheoIogy","Theologv"]
    },
    {
      term: "Theology1",
      alternateTerms: ["ITheology","ltheology"]
    },
  ];

  const loadTermId = async (label) => {
    let session = driver.session();
    let query = `MATCH (n:TaxonomyTerm) WHERE n.label="${label}" return n`;
    let node = await session.writeTransaction(tx=>tx.run(query,{}))
    .then(result=> {
      session.close();
      let records = result.records;
      let outputRecord = {_id:null};
      if (records.length>0) {
        let record = records[0].toObject();
        outputRecord = helpers.outputRecord(record.n);
      }
      return outputRecord;
    }).catch((error) => {
      console.log(error)
    });
    return node._id;
  }

  // 1. select relations where role equals to alternate term id and replace the relationship role with the main term id
  // MATCH (s)-[r {role:"34870"}]-(e) SET r.role="matriculationClass.term._id"
  const updateTerm = async(srcTerm, alternateTerm) => {
    let session = driver.session();
    // 1. load triples
    let query = `MATCH (s:Person)-[r {role:"${alternateTerm._id}"}]->(t:Event) return s,r,t`;
    let triple = await session.writeTransaction(tx=>tx.run(query,{}))
    .then(result=> {
      let records = result.records;
      let source = null;
      let relation = null;
      let target = null;
      let output = {source:source,relation:relation,target:target};
      if (records.length>0) {
        let record = records[0].toObject();
        source = helpers.outputRecord(record.s);
        relation = helpers.outputRelation(record.r);
        target = helpers.outputRecord(record.t);
        // 2. update relation roleId
        relation.properties.role = srcTerm._id;
        output = {source:source,relation:relation,target:target};
      }
      return output;
    }).catch((error) => {
      console.log(error)
    });


    // 2. update the relation roleId
    let query2 = `MATCH (s)-[r {role:"${alternateTerm._id}"}]->(t) SET r.role="${srcTerm._id}" return s,r,t`;
    let updateRelationRoleId = await session.writeTransaction(tx=>tx.run(query2,{}))
    .then(result=> {
      let records = result.records;
    }).catch((error) => {
      console.log(error)
    });

    // 3. update event title
    let newLabel = triple.target.label.replace(alternateTerm.label, srcTerm.label);
    let query3 = `MATCH (e:Event) WHERE id(e)=${Number(triple.target._id)} SET e.label="${newLabel}" return e`;
    let updateEventLabel = await session.writeTransaction(tx=>tx.run(query3,{}))
    .then(result=> {
      let records = result.records;
    }).catch((error) => {
      console.log(error)
    });

    // 4. delete the alternate taxonomy term
    let query4 = `MATCH (t:TaxonomyTerm) WHERE id(t)=${Number(alternateTerm._id)} DELETE t`;
    let deleteAlTerm = await session.writeTransaction(tx=>tx.run(query4,{}))
    .then(result=> {
      let records = result.records;
    }).catch((error) => {
      console.log(error)
    });
    session.close();
    return triple;
  }

  let triples = [];
  for (key in matriculationClasses) {
    let matriculationClass = matriculationClasses[key];
    // 1. find main term _id
    let label = matriculationClass.term;
    let mainId = await loadTermId(label);
    matriculationClass.term = {label:label, _id:mainId};
    // 2. find alternateTerms _ids
    for (let tkey in matriculationClass.alternateTerms) {
      let alTerm = matriculationClass.alternateTerms[tkey];
      let alId = await loadTermId(alTerm);
      matriculationClass.alternateTerms[tkey] = {label:alTerm, _id:alId};
      let updatedTerm = await updateTerm(matriculationClass.term, matriculationClass.alternateTerms[tkey]);
      triples.push(updatedTerm);
    }
  }
  resp.json({
    status: true,
    data: {classes: matriculationClasses, triples: triples},
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
  prepareForIngestion: prepareForIngestion,
  afterIngestion: afterIngestion,
}
