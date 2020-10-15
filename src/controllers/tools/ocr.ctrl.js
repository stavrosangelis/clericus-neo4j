const {promisify} = require('util');
const Canvas = require('canvas');
const fs = require('fs');
const axios = require('axios');
const schedule = require('node-schedule');
const readFile = promisify(fs.readFile);
const helpers = require("../../helpers");
const csvParser = require('csv-parser');
const driver = require("../../config/db-driver");

const Event = require("../event.ctrl").Event;
const Organisation = require("../organisation.ctrl").Organisation;
const Person = require("../person.ctrl").Person;
const Spatial = require("../spatial.ctrl").Spatial;
const Taxonomy = require("../taxonomy.ctrl").Taxonomy;
const TaxonomyTerm = require("../taxonomyTerm.ctrl").TaxonomyTerm;
const Temporal = require("../temporal.ctrl").Temporal;
const updateReference = require("../references.ctrl").updateReference;

const archivePath = process.env.ARCHIVEPATH;

const visionKey = process.env.CLOUD_VISION_KEY;
const visionURL = process.env.CLOUD_VISION_ENDPOINT;

const ocrDocumentsDir = async (req,resp) => {
  const directory = `${archivePath}documents/meath/`;
  const files = await fs.readdirSync(`${directory}images/`);

  let output = [];
  for (let i=0;i<files.length; i++) {
    let file = files[i];
    if (!file.includes(".jpg")) {
      continue;
    }

    let fileName = file.replace(".jpg", "");
    let srcPath = `${directory}images/${file}`;
    let startTime = new Date(Date.now() + i*15000);

    let cronJob = schedule.scheduleJob({start: startTime, rule: `15 * * * * *`}, async()=> {
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
    url: visionURL+"vision/v3.0/ocr",
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

const identifyColumns = async(req,resp) => {
  let p = req.query;
  let fileNum = p.fileNum;
  if (typeof fileNum==="undefined") {
    return resp.json({
      status: false,
      data: [],
      msg: "Please define a fileNum",
    });
  }
  let w0 = p.w0;
  let w1 = p.w1;
  let w2 = p.w2;
  let w3 = p.w3;
  let w4 = p.w4;
  let w5 = p.w5;
  let w6 = p.w6;

  let path =`${archivePath}documents/meath/output-json/${fileNum}-output.json`;
  let data = await helpers.readJSONFile(path);
  let regions = data.data.regions;
  let word0 = null;
  for (let i=0; i<regions.length; i++) {
    let r = regions[i];
    let lines = r.lines;
    for (let j=0; j<lines.length; j++) {
      let l = lines[j];
      let words = l.words;
      for (let k=0;k<words.length; k++) {
        let w = words[k];
        if (w.text===w0) {
          word0 = w;
          break;
        }
      }
    }
  }
  let word1 = null;
  for (let i=0; i<regions.length; i++) {
    let r = regions[i];
    let lines = r.lines;
    for (let j=0; j<lines.length; j++) {
      let l = lines[j];
      let words = l.words;
      for (let k=0;k<words.length; k++) {
        let w = words[k];
        if (w.text===w1) {
          word1 = w;
          break;
        }
      }
    }
  }
  let word2 = null;
  for (let i=0; i<regions.length; i++) {
    let r = regions[i];
    let lines = r.lines;
    for (let j=0; j<lines.length; j++) {
      let l = lines[j];
      let words = l.words;
      for (let k=0;k<words.length; k++) {
        let w = words[k];
        if (w.text===w2) {
          word2 = w;
          break;
        }
      }
    }
  }
  let word3 = null;
  for (let i=0; i<regions.length; i++) {
    let r = regions[i];
    let lines = r.lines;
    for (let j=0; j<lines.length; j++) {
      let l = lines[j];
      let words = l.words;
      for (let k=0;k<words.length; k++) {
        let w = words[k];
        if (w.text===w3) {
          word3 = w;
          break;
        }
      }
    }
  }
  let word4 = null;
  for (let i=0; i<regions.length; i++) {
    let r = regions[i];
    let lines = r.lines;
    for (let j=0; j<lines.length; j++) {
      let l = lines[j];
      let words = l.words;
      for (let k=0;k<words.length; k++) {
        let w = words[k];
        if (w.text===w4) {
          word4 = w;
          break;
        }
      }
    }
  }
  let word5 = null;
  for (let i=0; i<regions.length; i++) {
    let r = regions[i];
    let lines = r.lines;
    for (let j=0; j<lines.length; j++) {
      let l = lines[j];
      let words = l.words;
      for (let k=0;k<words.length; k++) {
        let w = words[k];
        if (w.text===w5) {
          word5 = w;
          break;
        }
      }
    }
  }
  let word6 = null;
  for (let i=0; i<regions.length; i++) {
    let r = regions[i];
    let lines = r.lines;
    for (let j=0; j<lines.length; j++) {
      let l = lines[j];
      let words = l.words;
      for (let k=0;k<words.length; k++) {
        let w = words[k];
        if (w.text===w6) {
          word6 = w;
          break;
        }
      }
    }
  }
  let output = [word0, word1, word2, word3, word4, word5, word6];

  let index = parseInt(fileNum,10)-1;
  let columnsPath = `${archivePath}documents/meath/columns.json`;
  let columns = await helpers.readJSONFile(columnsPath);
  columns.data[index] = output;
  let writeFile = await new Promise((resolve,reject)=> {
    fs.writeFile(columnsPath, JSON.stringify(columns.data), 'utf8', (error) => {
      if (error) {
        results = {status: false, error: error};
        reject(error);
      }
      else {
        results = {status: true, msg: `Columns updated successfully!`};
        resolve(true);
      }
    });
  })

  return resp.json({
    status: true,
    data: output,
    error: [],
    msg: "",
  });

}

const exportToCsv = async(req,resp) => {
  const directory = `${archivePath}documents/meath/`;
  const files = await fs.readdirSync(`${directory}output-json/`);
  const readFile = promisify(fs.readFile);
  const columnsPath = `${archivePath}documents/meath/columns.json`;
  let columnsJson = await helpers.readJSONFile(columnsPath);
  let columnsData = columnsJson.data;
  let output = [];
  let thresholdX = 10;
  let thresholdY = 15;
  let c=-1;
  let doneArray = [
    "1-output.json",
    "2-output.json",
    "3-output.json",
    "4-output.json",
    "5-output.json",
    "6-output.json",
    "7-output.json",
    "8-output.json",
    "9-output.json",
    "10-output.json",
    "12-output.json",
    "13-output.json",
    "14-output.json",
    "15-output.json",
    "16-output.json",
    "17-output.json",
    "18-output.json",
    "19-output.json",
    "20-output.json",
    "21-output.json",
    "22-output.json",
    "23-output.json",
    "24-output.json",
    "25-output.json",
    "26-output.json",
    "27-output.json",
    "28-output.json",
    "29-output.json",
  ];
  for (let i=0;i<files.length; i++) {
    let file = files[i];
    if (!file.includes(".json") || doneArray.indexOf(file)>-1) {
      continue;
    }
    else {
      c++;
    }

    let fileName = file.replace("-output.json", "");
    let index = parseInt(fileName,10)-1;
    let columns = columnsData[index];
    if (typeof columns==="undefined") {
      continue;
    }
    let path = `${directory}output-json/${file}`;
    let csvPath = `${directory}output-csv/${fileName}.csv`;
    let json = await helpers.readJSONFile(path);
    let regions = json.data.regions;

    let c0x, c1x, c2x, c3x, c4x, c5x, c6x, c0w, c1w, c2w, c3w, c4w, c5w, c6w, c0=[], c1=[], c2=[], c3=[], c4=[], c5=[], c6=[], c0Word, c1Word, c2Word, c3Word, c4Word, c5Word, c6Word;

    // expand control points according to threshold
    c0x = parseInt(columns[0].boundingBox.split(",")[0],10)-thresholdX;
    c1x = parseInt(columns[1].boundingBox.split(",")[0],10)-thresholdX;
    c2x = parseInt(columns[2].boundingBox.split(",")[0],10)-thresholdX;
    c3x = parseInt(columns[3].boundingBox.split(",")[0],10)-thresholdX;
    c4x = parseInt(columns[4].boundingBox.split(",")[0],10)-thresholdX;
    c5x = parseInt(columns[5].boundingBox.split(",")[0],10)-thresholdX;
    c6x = parseInt(columns[6].boundingBox.split(",")[0],10)-thresholdX;

    c0w = c1x-c0x;
    c1w = c2x-c1x;
    c2w = c3x-c2x;
    c3w = c4x-c3x;
    c4w = c5x-c4x;
    c5w = c6x-c5x;
    c6w = 200;

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
        if (x>c5x && w<c5w && x+w<c6x)
          c5.push(output);
        if (x>c6x && w<c6w)
          c6.push(output);
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
    c6.sort((a, b) =>{
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
      text+=","+rowText(row,c5).replace(/,/g,".");
      text+=","+rowText(row,c6).replace(/,/g,".")+"\n";
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

const exportOrganisations = async(req,resp) => {
  const directory = `${archivePath}documents/meath/`;
  const files = await fs.readdirSync(`${directory}output-csv/`);
  let organisations = [];
  const headers = ['First name','Middle name','Last name','Native of','App.','Title','Appointment','Died','Location of death'];
  for (let i=0;i<files.length; i++) {
    let file = files[i];
    if (!file.includes(".csv")) {
      continue;
    }
    let csv = await new Promise((resolve,reject)=>{
      let results = [];
      fs.createReadStream(`${directory}output-csv/${file}`)
      .pipe(csvParser(headers))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
    });
    for (let line in csv) {
      let row = csv[line];
      if (Number(line)===0) {
        continue;
      }
      let organisation0 = row['Native of'];
      let organisation1 = row['Appointment'];
      if (organisation0!=="" && organisations.indexOf(organisation0)===-1) {
        organisations.push(organisation0);
      }
      if (organisation1!=="" && organisations.indexOf(organisation1)===-1) {
        organisations.push(organisation1);
      }
    }
  }
  organisations.sort();
  let csvText = "Organisation,Organisation type, Cathedral city,\n"+organisations.join(",\n");

  let csvPath = `${directory}organisations.csv`;
  let csvStatus = false;
  let writeFile = await new Promise ((resolve,reject)=> {
    fs.writeFile(csvPath, csvText, 'utf8', function(err) {
      if (err) {
        reject(err);
      } else {
        csvStatus = true;
        resolve(true);
      }
    });
  });
  let output = {
    'csv status': csvStatus,
    number: organisations.length,
    organisations: organisations
  };
  return resp.json({
    status: true,
    data: output,
    error: false,
    msg: '',
  })
}

const correctOrganisations = async(req,resp) => {
  const directory = `${archivePath}documents/meath/`;
  const files = await fs.readdirSync(`${directory}output-csv/`);
  // 1. load organisation values
  let organisations = [];
  let organisationsToBeReplaced = [];
  const organisationsFileHeaders = ['Organisation','Organisation type','Cathedral city','Corrected organisation label'];
  const organisationsFile = await new Promise((resolve,reject)=>{
    let results = [];
    fs.createReadStream(`${directory}organisations.csv`)
    .pipe(csvParser(organisationsFileHeaders))
    .on('data', (data) => results.push(data))
    .on('end', () => {
      resolve(results);
    });
  });
  for (let line in organisationsFile) {
    if (Number(line)===0) {
      continue;
    }
    let row = organisationsFile[line];
    if (row['3']!=="") {
      organisations.push({current:row['0'], new:row['3']});
      organisationsToBeReplaced.push(row['0']);
    }
  }

  // 2. load files and update as necessary
  let replacements = [];
  const headers = ['First name','Middle name','Last name','Native of','App.','Title','Appointment','Died','Location of death'];
  for (let i=0;i<files.length; i++) {
    let file = files[i];
    if (!file.includes(".csv") || file!=="11.csv") {
      continue;
    }

    let csv = await new Promise((resolve,reject)=>{
      let results = [];
      fs.createReadStream(`${directory}output-csv/${file}`)
      .pipe(csvParser(headers))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
    });
    let newCsv = [];
    for (let line in csv) {
      let row = csv[line];
      if (Number(line)===0) {
        continue;
      }
      let organisation0 = row['Native of'];
      let organisation1 = row['Appointment'];
      if (organisation0!=="" && organisationsToBeReplaced.indexOf(organisation0)>-1) {
        let replacement = organisations.find(r=>r.current===organisation0);

        replacements.push({file: file, line: line, organisation: organisation0, replacement: replacement.new});
        row['Native of'] = replacement.new;
      }
      if (organisation1!=="" && organisationsToBeReplaced.indexOf(organisation1)>-1) {
        let replacement = organisations.find(r=>r.current===organisation1);
        replacements.push({file: file, line: line, organisation: organisation1, replacement: replacement.new});
        row['Appointment'] = replacement.new;
      }
      newCsv.push(row);
    }
    let csvText = "First name,Middle name,Last name,Native of,App.,Title,Appointment,Died,Location of death,\n";
    for (let i=0;i<newCsv.length; i++) {
      let row = newCsv[i];
      let rowText = `${row['First name']},${row['Middle name']},${row['Last name']},${row['Native of']},${row['App.']},${row['Title']},${row['Appointment']},${row['Died']},${row['Location of death']},\n`;
      csvText += rowText;
    }
    let csvPath = `${directory}processed-csv/${file}`;
    let writeFile = await new Promise ((resolve,reject)=> {
      fs.writeFile(csvPath, csvText, 'utf8', function(err) {
        if (err) {
          reject(err);
        } else {
          csvStatus = true;
          resolve(true);
        }
      });
    });
  }
  return resp.json({
    status: true,
    data: replacements,
    error: false,
    msg: '',
  })
}

const normalizeDate = (date="") => {
  if (date==="") {
    return "";
  }
  let output = date;
  date = date.replace("?","");
  date = date.replace("c","");
  if (!date.includes("/")) {
    output = `1/1/${date}-31/12/${date}`;
  }
  else {
    let dateArr = date.split("/");
    let d = dateArr[0],m=dateArr[1],y=dateArr[2];
    if (d===""){
      let lastDay = getDaysInMonth(m,y);
      output = `1/${m}/${y}-${lastDay}/${m}/${y}`;
    }
  }
  return output;
}

var getDaysInMonth = function(month,year) {
 return new Date(year, month, 0).getDate();
};


const processItems = async(req,resp) => {
  const directory = `${archivePath}documents/meath/`;
  const files = await fs.readdirSync(`${directory}corrected-organisations/`);
  // 1. load organisation values
  const organisationsFileHeaders = ['Organisation','Organisation type','Cathedral city','Corrected organisation label'];
  var organisations = await new Promise((resolve,reject)=>{
    let results = [];
    fs.createReadStream(`${directory}organisations.csv`)
    .pipe(csvParser(organisationsFileHeaders))
    .on('data', (data) => results.push(data))
    .on('end', () => {
      resolve(results);
    });
  });
  organisations.splice(0,1);

  // 2. load files and update as necessary
  const titlePairs = [
    {0:'Adm.', 1:'Administrator'},
    {0:'Adm', 1:'Administrator'},
    {0:'C.C.', 1:'Curate'},
    {0:'C. Dip', 1:'Vatican Diplomat'},
    {0:'C.Dip', 1:'Vatican Diplomat'},
    {0:'Chap', 1:'Chaplain'},
    {0:'C.M.', 1:'Congregation of the Mission'},
    {0:'C.P.', 1:'Passionist Order'},
    {0:'C.S.S.P.', 1:'Holy Spirit Congregation'},
    {0:'Emer', 1:'Retired'},
    {0:'O. Cist.', 1:'Order of Cistercians'},
    {0:'O. Cist', 1:'Order of Cistercians'},
    {0:'O.Cist.', 1:'Order of Cistercians'},
    {0:'O.Cist', 1:'Order of Cistercians'},
    {0:'O.M.', 1:'Order of Minims'},
    {0:'O. Praem.', 1:'Order of Canons Regular of Prémontré'},
    {0:'O.Praem.', 1:'Order of Canons Regular of Prémontré'},
    {0:'O.Praem', 1:'Order of Canons Regular of Prémontré'},
    {0:'O.P.', 1:'Dominican Order'},
    {0:'O.S.A.', 1:'Order of St. Augustine'},
    {0:'P.E.', 1:'Retired Parish Priest'},
    {0:'P.E', 1:'Retired Parish Priest'},
    {0:'P.P.', 1:'Parish Priest'},
    {0:'Pres.', 1:'President'},
    {0:'Pres', 1:'President'},
    {0:'Prof', 1:'Professor'},
    {0:'R.A.F.', 1:'Royal Air Force Chaplain'},
    {0:'RAF', 1:'Royal Air Force Chaplain'},
    {0:'S.J.', 1:'Society of Jesus'},
    {0:'S.M.', 1:'Society of Mary'},
    {0:'S.M.A.', 1:'Society of African Missions'},
    {0:'S.P.S.', 1:'St. Patrick’s Missionary Society'},
    {0:'S.S.C.', 1:'St. Columban’s Missionary Society'},
    {0:'S.S.C', 1:'St. Columban’s Missionary Society'},
    {0:'S.D.B.', 1:'Salesians of Don Bosco'},
    {0:'V. Pres.', 1:'Vice-President'},
    {0:'V. Pres', 1:'Vice-President'},
    {0:'V.Pres', 1:'Vice-President'},
    {0:'V.G.', 1:'Vicar General'},
    {0:'Bursar', 1:'Bursar'},
    {0:'Bishop', 1:'Bishop'},
    {0:'Coadjutor Bishop', 1:'Coadjutor Bishop'},
  ];

  const seminaries = [
    "Congregation of the Mission",
    "Passionist Order",
    "Holy Spirit Congregation",
    "Order of Cistercians",
    "Order of Minims",
    "Order of Canons Regular of Prémontré",
    "Dominican Order",
    "Order of St. Augustine",
    "Royal Air Force Chaplain",
    "Society of Jesus",
    "Society of Mary",
    "Society of African Missions",
    "St. Patrick’s Missionary Society",
    "St. Columban’s Missionary Society",
    "Salesians of Don Bosco"
  ];
  const headers = ['First name','Middle name','Last name','Native of','App.','Title','Appointment','Died','Location of death','Native event','Appointment event','Death event'];
  for (let i=0;i<files.length; i++) {
    let file = files[i];
    if (!file.includes(".csv") || file!=="11.csv") {
      continue;
    }
    let csv = await new Promise((resolve,reject)=>{
      let results = [];
      fs.createReadStream(`${directory}output-csv/${file}`)
      .pipe(csvParser(headers))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
    });
    let newCsv = [];

    // all transformation take place here
    for (let line in csv) {
      let row = csv[line];
      if (Number(line)===0) {
        continue;
      }
      let nativeOf = row['Native of'].trim();
      let nativeOfType = "";
      let nativeOfCathedralCity = "";
      let nativeDiocese = "";
      let appointment = row['Appointment'].trim();
      let appointmentType = "";
      let appointmentCathedralCity = "";
      let appointmentDiocese = "";
      let title = row['Title'].trim();
      let replaceTitle = title;

      if (nativeOf!=="") {
        let org = organisations.find(o=>o['0'].trim()===nativeOf);
        if (typeof org!=="undefined") {
          nativeOfType = org['1'];
          nativeOfCathedralCity = org['2'];
          nativeDiocese = org['3'];
          if (org['4']!=="") {
            nativeOf = org['3'].trim();
          }
        }
      }
      if (appointment!=="") {
        let org = organisations.find(o=>o['0']===appointment);
        if (typeof org!=="undefined") {
          appointmentType = org['1'];
          appointmentCathedralCity = org['2'];
          appointmentDiocese = org['3'];
          if (org['4']!=="") {
            appointment = org['3'].trim();
          }
        }
      }
      if (title!=="") {
        if (title.includes(",")) {
          let titles = title.split(",");
          let newTitleText = "";
          for (let i=0;i<titles.length; i++) {
            let newTitle = titles[i].trim();
            let rt = titlePairs.find(t=>t[0].toLowerCase()===newTitle.toLowerCase());
            if (i>0) newTitleText +="; ";
            newTitleText += rt[1];
          }
          replaceTitle = newTitleText;
        }
        else {
          let rt = titlePairs.find(t=>t[0].toLowerCase()===title.toLowerCase());
          replaceTitle = rt[1];
        }
      }
      row['Native of'] = nativeOf;
      row['Native of type'] = nativeOfType;
      row['Native of Cathedral city'] = nativeOfCathedralCity;
      row['Native Diocese'] = nativeDiocese;
      row['Title'] = replaceTitle;
      row['Appointment'] = appointment;
      row['Appointment type'] = appointmentType;
      row['Appointment Cathedral city'] = appointmentCathedralCity;
      row['Appointment Diocese'] = appointmentDiocese;

      // events
      let nativeEvent = "";
      if (nativeOf!=="") {
        nativeEvent = `${row['First name']} ${row['Middle name']} ${row['Last name']} was native of ${nativeOf} [${nativeOfType}]`;
        let nativeEventLocation = "";
        if (nativeOfCathedralCity!=="") {
          nativeEventLocation = `(${nativeDiocese} has it's episcopal see in ${nativeOfCathedralCity})`;
          nativeEvent += nativeEventLocation;
        }
        let affiliationEvent = "";
        if (nativeDiocese!=="") {
          affiliationEvent = `${row['First name']} ${row['Middle name']} ${row['Last name']} has affiliation ${nativeDiocese}`;
          nativeEvent += `; ${affiliationEvent}`;
        }
      }
      row['Native event'] = nativeEvent;

      let appointmentEvent = "";
      if (appointment!=="") {
        let appRelationType = "was appointed";
        let appTitle = "";
        if (replaceTitle!=="") {
          appTitle = `as ${replaceTitle}`;
        }
        let appLocation = "";
        if (appointmentCathedralCity!=="") {
          appLocation = `(${nativeDiocese} has it's episcopal see in ${appointmentCathedralCity})`;
        }
        let appDate = "";
        if (row['App.']!=="") {
          appDate = `on ${row['App.']}[${normalizeDate(row['App.'])}]`;
          if (row['App.']==="1704") {
            appRelationType = "was serving";
          }
        }

        let appTitlePreposition = " of";
        if (appTitle==="Retired Parish Priest" || appTitle==="Retired") {
          appRelationType = "retired to";
        }
        let cleanTitle = appTitle.replace("as ","");
        let seminaryIndex = seminaries.indexOf(cleanTitle);
        if (appointmentType==="School" && seminaryIndex===-1) {
          appTitle = `to teaching post`;
          appTitlePreposition = " in";
        }

        let seminaryAffiliationEvent = "";
        if (seminaryIndex>-1) {
          seminaryAffiliationEvent = `; ${row['First name']} ${row['Middle name']} ${row['Last name']} hasAffiliation ${seminaries[seminaryIndex]}`;
          appTitle = `as Parish Priest`;
        }
        appTitle += appTitlePreposition;
        appointmentEvent = `${row['First name']} ${row['Middle name']} ${row['Last name']} ${appRelationType} ${appTitle} ${appointment}[${appointmentType}] ${appLocation} ${appDate}${seminaryAffiliationEvent}`;
      }
      row['Appointment event'] = appointmentEvent;

      let deathEvent = "";
      if (row['Died']!=="") {
        deathEvent = `${row['First name']} ${row['Middle name']} ${row['Last name']} died on ${row['Died']} [${normalizeDate(row['Died'])}]`;
      }
      row['Death event'] = deathEvent;
      newCsv.push(row);
    }

    let csvText = "First name,Middle name,Last name,Native of,Native of type,Native of Cathedral city,Native  Diocese,App.,Title,Appointment,Appointment type,Appointment Cathedral city,Appointment Diocese,Died,Location of death,Native event,Appointment event,Death event\n";
    for (let i=0;i<newCsv.length; i++) {
      let row = newCsv[i];
      let rowText = `"${row['First name']}","${row['Middle name']}","${row['Last name']}","${row['Native of']}","${row['Native of type']}","${row['Native of Cathedral city']}","${row['Native Diocese']}","${row['App.']}","${row['Title']}","${row['Appointment']}","${row['Appointment type']}","${row['Appointment Cathedral city']}","${row['Appointment Diocese']}","${row['Died']}","${row['Location of death']}","${row['Native event']}","${row['Appointment event']}","${row['Death event']}"\n`;
      csvText += rowText;
    }
    let csvPath = `${directory}processed-csv/${file}`;
    let writeFile = await new Promise ((resolve,reject)=> {
      fs.writeFile(csvPath, csvText, 'utf8', function(err) {
        if (err) {
          reject(err);
        } else {
          csvStatus = true;
          resolve(true);
        }
      });
    });

  }
  return resp.json({
    status: true,
    data: organisations,
    error: false,
    msg: '',
  })
}

const compareToDBProcessedItems = async(req,resp) => {
  const directory = `${archivePath}documents/meath/`;
  const files = await fs.readdirSync(`${directory}corrected-organisations/`);
  // 1. load organisation values
  const organisationsFileHeaders = ['Organisation','Organisation type','Cathedral city','Corrected organisation label'];
  var organisations = await new Promise((resolve,reject)=>{
    let results = [];
    fs.createReadStream(`${directory}organisations.csv`)
    .pipe(csvParser(organisationsFileHeaders))
    .on('data', (data) => results.push(data))
    .on('end', () => {
      resolve(results);
    });
  });
  organisations.splice(0,1);

  // 2. load files and update as necessary
  const titlePairs = [
    {0:'Adm.', 1:'Administrator'},
    {0:'Adm', 1:'Administrator'},
    {0:'C.C.', 1:'Curate'},
    {0:'C. Dip', 1:'Vatican Diplomat'},
    {0:'C.Dip', 1:'Vatican Diplomat'},
    {0:'Chap', 1:'Chaplain'},
    {0:'C.M.', 1:'Congregation of the Mission'},
    {0:'C.P.', 1:'Passionist Order'},
    {0:'C.S.S.P.', 1:'Holy Spirit Congregation'},
    {0:'Emer', 1:'Retired'},
    {0:'O. Cist.', 1:'Order of Cistercians'},
    {0:'O. Cist', 1:'Order of Cistercians'},
    {0:'O.Cist.', 1:'Order of Cistercians'},
    {0:'O.Cist', 1:'Order of Cistercians'},
    {0:'O.M.', 1:'Order of Minims'},
    {0:'O. Praem.', 1:'Order of Canons Regular of Prémontré'},
    {0:'O.Praem.', 1:'Order of Canons Regular of Prémontré'},
    {0:'O.Praem', 1:'Order of Canons Regular of Prémontré'},
    {0:'O.P.', 1:'Dominican Order'},
    {0:'O.S.A.', 1:'Order of St. Augustine'},
    {0:'P.E.', 1:'Retired Parish Priest'},
    {0:'P.E', 1:'Retired Parish Priest'},
    {0:'P.P.', 1:'Parish Priest'},
    {0:'Pres.', 1:'President'},
    {0:'Pres', 1:'President'},
    {0:'Prof', 1:'Professor'},
    {0:'R.A.F.', 1:'Royal Air Force Chaplain'},
    {0:'RAF', 1:'Royal Air Force Chaplain'},
    {0:'S.J.', 1:'Society of Jesus'},
    {0:'S.M.', 1:'Society of Mary'},
    {0:'S.M.A.', 1:'Society of African Missions'},
    {0:'S.P.S.', 1:'St. Patrick’s Missionary Society'},
    {0:'S.S.C.', 1:'St. Columban’s Missionary Society'},
    {0:'S.S.C', 1:'St. Columban’s Missionary Society'},
    {0:'S.D.B.', 1:'Salesians of Don Bosco'},
    {0:'V. Pres.', 1:'Vice-President'},
    {0:'V. Pres', 1:'Vice-President'},
    {0:'V.Pres', 1:'Vice-President'},
    {0:'V.G.', 1:'Vicar General'},
    {0:'Bursar', 1:'Bursar'},
    {0:'Bishop', 1:'Bishop'},
    {0:'Coadjutor Bishop', 1:'Coadjutor Bishop'},
  ];

  const seminaries = [
    "Congregation of the Mission",
    "Passionist Order",
    "Holy Spirit Congregation",
    "Order of Cistercians",
    "Order of Minims",
    "Order of Canons Regular of Prémontré",
    "Dominican Order",
    "Order of St. Augustine",
    "Royal Air Force Chaplain",
    "Society of Jesus",
    "Society of Mary",
    "Society of African Missions",
    "St. Patrick’s Missionary Society",
    "St. Columban’s Missionary Society",
    "Salesians of Don Bosco"
  ];
  const headers = ['First name','Middle name','Last name','Native of','App.','Title','Appointment','Died','Location of death','Native event','Appointment event','Death event'];
  for (let i=0;i<files.length; i++) {
    let file = files[i];
    if (!file.includes(".csv")|| file!=="11.csv") {
      continue;
    }
    let csv = await new Promise((resolve,reject)=>{
      let results = [];
      fs.createReadStream(`${directory}output-csv/${file}`)
      .pipe(csvParser(headers))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
    });
    let newCsv = [];

    // all transformation take place here
    for (let line in csv) {
      let row = csv[line];
      if (Number(line)===0) {
        continue;
      }
      let nativeOf = row['Native of'].trim();
      let nativeOfType = "";
      let nativeOfCathedralCity = "";
      let nativeDiocese = "";
      let appointment = row['Appointment'].trim();
      let appointmentType = "";
      let appointmentCathedralCity = "";
      let appointmentDiocese = "";
      let title = row['Title'].trim();
      let replaceTitle = title;

      if (nativeOf!=="") {
        let org = organisations.find(o=>o['0'].trim()===nativeOf);
        if (typeof org!=="undefined") {
          nativeOfType = org['1'];
          nativeOfCathedralCity = org['2'];
          nativeDiocese = org['3'];
          if (org['4']!=="") {
            nativeOf = org['3'].trim();
          }
        }
      }
      if (appointment!=="") {
        let org = organisations.find(o=>o['0']===appointment);
        if (typeof org!=="undefined") {
          appointmentType = org['1'];
          appointmentCathedralCity = org['2'];
          appointmentDiocese = org['3'];
          if (org['4']!=="") {
            appointment = org['3'].trim();
          }
        }
      }
      if (title!=="") {
        if (title.includes(",")) {
          let titles = title.split(",");
          let newTitleText = "";
          for (let i=0;i<titles.length; i++) {
            let newTitle = titles[i].trim();
            let rt = titlePairs.find(t=>t[0].toLowerCase()===newTitle.toLowerCase());
            if (i>0) newTitleText +="; ";
            newTitleText += rt[1];
          }
          replaceTitle = newTitleText;
        }
        else {
          let rt = titlePairs.find(t=>t[0].toLowerCase()===title.toLowerCase());
          replaceTitle = rt[1];
        }
      }
      row['Native of'] = nativeOf;
      row['Native of type'] = nativeOfType;
      row['Native of Cathedral city'] = nativeOfCathedralCity;
      row['Native Diocese'] = nativeDiocese;
      row['Title'] = replaceTitle;
      row['Appointment'] = appointment;
      row['Appointment type'] = appointmentType;
      row['Appointment Cathedral city'] = appointmentCathedralCity;
      row['Appointment Diocese'] = appointmentDiocese;

      // events
      let nativeEvent = "";
      if (nativeOf!=="") {
        nativeEvent = `${row['First name']} ${row['Middle name']} ${row['Last name']} was native of ${nativeOf} [${nativeOfType}]`;
        let nativeEventLocation = "";
        if (nativeOfCathedralCity!=="") {
          nativeEventLocation = `(${nativeDiocese} has it's episcopal see in ${nativeOfCathedralCity})`;
          nativeEvent += nativeEventLocation;
        }
        let affiliationEvent = "";
        if (nativeDiocese!=="") {
          affiliationEvent = `${row['First name']} ${row['Middle name']} ${row['Last name']} has affiliation ${nativeDiocese}`;
          nativeEvent += `; ${affiliationEvent}`;
        }
      }
      row['Native event'] = nativeEvent;

      let appointmentEvent = "";
      if (appointment!=="") {
        let appRelationType = "was appointed";
        let appTitle = "";
        if (replaceTitle!=="") {
          appTitle = `as ${replaceTitle}`
        }
        let appLocation = "";
        if (appointmentCathedralCity!=="") {
          appLocation = `(${nativeDiocese} has it's episcopal see in ${appointmentCathedralCity})`;
        }
        let appDate = "";
        if (row['App.']!=="") {
          appDate = `on ${row['App.']}[${normalizeDate(row['App.'])}]`;
          if (row['App.']==="1704") {
            appRelationType = "was serving";
          }
        }
        let appTitlePreposition = " of";
        if (appTitle==="Retired Parish Priest" || appTitle==="Retired") {
          appRelationType = "retired to";
        }
        let cleanTitle = appTitle.replace("as ","");
        let seminaryIndex = seminaries.indexOf(cleanTitle);
        if (appointmentType==="School" && seminaryIndex===-1) {
          appTitle = `to teaching post`;
          appTitlePreposition = " in";
        }
        let seminaryAffiliationEvent = "";
        if (seminaryIndex>-1) {
          seminaryAffiliationEvent = `; ${row['First name']} ${row['Middle name']} ${row['Last name']} hasAffiliation ${seminaries[seminaryIndex]}`;
          appTitle = `as Parish Priest`;
        }
        appTitle += appTitlePreposition;
        appointmentEvent = `${row['First name']} ${row['Middle name']} ${row['Last name']} ${appRelationType} ${appTitle} ${appointment}[${appointmentType}] ${appLocation} ${appDate}${seminaryAffiliationEvent}`;
      }
      row['Appointment event'] = appointmentEvent;

      let deathEvent = "";
      if (row['Died']!=="") {
        deathEvent = `${row['First name']} ${row['Middle name']} ${row['Last name']} died on ${row['Died']} [${normalizeDate(row['Died'])}]`;
      }
      row['Death event'] = deathEvent;
      newCsv.push(row);
    }
    let session = driver.session();
    let csvText = "#,ID,First name,Middle name,Last name,Native of,Native of type,Native of Cathedral city,Native  Diocese,App.,Title,Appointment,Appointment type,Appointment Cathedral city,Appointment Diocese,Died,Location of death,Native event,Appointment event,Death event\n";
    for (let i=0;i<newCsv.length; i++) {
      let row = newCsv[i];
      let rowText = `${i},,${row['First name']},${row['Middle name']},${row['Last name']},${row['Native of']},${row['Native of type']},${row['Native of Cathedral city']},${row['Native Diocese']},${row['App.']},${row['Title']},${row['Appointment']},${row['Appointment type']},${row['Appointment Cathedral city']},${row['Appointment Diocese']},${row['Died']},${row['Location of death']},${row['Native event']},${row['Appointment event']},${row['Death event']}\n`;
      csvText += rowText;

      // check db for entry
      let queryFN = row['First name'].slice(0, -1);
      let queryMN = row['Middle name'].slice(0, -1);
      let queryLN = row['Last name'].slice(0, -1);
      let query = `MATCH (n:Person) WHERE n.status='public' AND  toLower(n.firstName) =~ toLower("${queryFN}.*") AND toLower(n.middleName) =~ toLower("${queryMN}.*") AND toLower(n.lastName) =~ toLower("${queryLN}.*") RETURN n`;
      let nodesPromise = await session.writeTransaction(tx=>tx.run(query,{}))
      .then(result=> {
        return result.records;
      }).catch((error) => {
        console.log(error)
      });
      let nodes = helpers.normalizeRecordsOutput(nodesPromise, "n");
      for (let n=0;n<nodes.length;n++) {
        let node = nodes[n];
        let dnQuery = `MATCH (n:Person)-[r:hasAffiliation]->(rn:Organisation) WHERE id(n)=${node._id} AND rn.organisationType="Diocese" return rn`;
        let nodeDiocesePromise = await session.writeTransaction(tx=>tx.run(dnQuery,{}))
        .then(result=> {
          return result.records;
        }).catch((error) => {
          console.log(error)
        });

        let nodesDiocese = helpers.normalizeRecordsOutput(nodeDiocesePromise, "rn");
        let matchDiocese = nodesDiocese.find(nd=>nd.label.toLowerCase().trim()===row['Native Diocese'].toLowerCase().trim());
        if (typeof matchDiocese==="undefined") {
          continue;
        }
        let nodeDiocese = nodesDiocese.map(nd=>nd.label).join(";");
        let newRow = `,${node._id},${node.firstName},${node.middleName},${node.lastName},,,,${nodeDiocese},\n`;
        csvText += newRow;
      }

    }
    session.close();
    let csvPath = `${directory}processed-csv-db/${file}`;
    let writeFile = await new Promise ((resolve,reject)=> {
      fs.writeFile(csvPath, csvText, 'utf8', function(err) {
        if (err) {
          reject(err);
        } else {
          csvStatus = true;
          resolve(true);
        }
      });
    });

  }
  return resp.json({
    status: true,
    data: organisations,
    error: false,
    msg: '',
  })
}

const ingestProcessedItems = async(req,resp) => {
  var session = driver.session();
  var userId = req.decoded.id;

  const seminaries = [
    "Congregation of the Mission",
    "Passionist Order",
    "Holy Spirit Congregation",
    "Order of Cistercians",
    "Order of Minims",
    "Order of Canons Regular of Prémontré",
    "Dominican Order",
    "Order of St. Augustine",
    "Royal Air Force Chaplain",
    "Society of Jesus",
    "Society of Mary",
    "Society of African Missions",
    "St. Patrick’s Missionary Society",
    "St. Columban’s Missionary Society",
    "Salesians of Don Bosco"
  ];

  const directory = `${archivePath}documents/meath/`;
  const organisationsFileHeaders = ['Organisation','Organisation type','Cathedral city','Corrected organisation label'];
  var organisationsList = await new Promise((resolve,reject)=>{
    let results = [];
    fs.createReadStream(`${directory}organisations.csv`)
    .pipe(csvParser(organisationsFileHeaders))
    .on('data', (data) => results.push(data))
    .on('end', () => {
      resolve(results);
    });
  });
  organisationsList.splice(0,1);
  var organisationsNames = [];
  var organisations = [];

  const organisationTypesTaxonomy = new Taxonomy({systemType:"organisationTypes"});
  await organisationTypesTaxonomy.load();
  let organisationTypesPromise = await session.writeTransaction(tx=>
    tx.run(`MATCH (n:TaxonomyTerm)-[r:isChildOf]->(t) WHERE id(t)=${organisationTypesTaxonomy._id} RETURN n`,{})
  )
  .then(result=> {
    return result.records;
  });
  let organisationTypes = helpers.normalizeRecordsOutput(organisationTypesPromise, "n");

  for (let key in organisationsList) {
    let org = organisationsList[key];
    let oName = org["0"].trim();
    let oType = org["1"].trim();
    let oCity = org["2"].trim();
    oCity = oCity.replace(/ *\([^)]*\) */g, "").trim();
    if (org["4"]!=="") {
      oName = org["4"].trim();
    }
    if (organisationsNames.indexOf(oName)===-1) {
      organisationsNames.push(oName);;
      organisations.push({label:oName, type:oType, city:oCity});
    }
  }

  // 1. ingest organisations
  let newOrganisations = [];
  for (let key in organisations) {
    let org = organisations[key];
    if (org.label!=="") {
      let newOrganisation = await insertOrganisation(org,userId,organisationTypesTaxonomy);
      newOrganisations.push(newOrganisation);
    }

  }

  // 2. load resource of meath
  let resourceMeath = await session.writeTransaction(tx=>
    tx.run(`MATCH (n:Resource) WHERE n.label=~"History of the Diocese of Meath.*" RETURN n`,{})
  )
  .then(result=> {
    let records = result.records;
    if (records.length>0) {
      let record = records[0].toObject();
      let outputRecord = helpers.outputRecord(record.n);
      return outputRecord;
    }
    return null;
  });
  if (resourceMeath===null) {
    return resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'The Meath resource cannot be found in the database',
    });
  }

  const files = await fs.readdirSync(`${directory}source-csv/`);

  const headers = ['First name','Middle name','Last name','Native of','Native of type','Native of Cathedral city',
  'Native  Diocese','App.','Title','Appointment','Appointment type','Appointment Cathedral city','Appointment Diocese','Died','DB ID'];
  for (let i=0;i<files.length; i++) {
    let file = files[i];
    if (!file.includes(".csv")) {
      continue;
    }
    let csv = await new Promise((resolve,reject)=>{
      let results = [];
      fs.createReadStream(`${directory}source-csv/${file}`)
      .pipe(csvParser(headers))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
    });
    let newCsv = [];
    // all transformation take place here
    for (let line in csv) {
      let row = csv[line];
      console.log(file, line);
      if (Number(line)===0) {
        continue;
      }
      // 1. save person
      let person = null;
      if (row['DB ID']!=="") {
        person = new Person({_id:row['DB ID'].trim()});
        await person.load();
      }
      else {
        let personData = {
          firstName: row['First name'].trim(),
          middleName: row['Middle name'].trim(),
          lastName: row['Last name'].trim(),
          fnameSoundex: helpers.soundex(row['First name'].trim()),
          lnameSoundex: helpers.soundex(row['Last name'].trim()),
        }
        let personSave = new Person(personData);
        let personSaveData = await personSave.save(userId);
        person = personSaveData.data;
      }
      // 2. link person to meath resource
      let meathRef = {
        items: [
          {_id:person._id, type: "Person", role: ""},
          {_id:resourceMeath._id, type: "Resource", role: ""},
        ],
        taxonomyTermLabel: "isReferencedIn"
      };
      let addMeathReference = await updateReference(meathRef);

      // 3. link person to nativeOf organisation
      if (row['Native of'].trim()!=="") {
        let nativeOfOrg = await session.writeTransaction(tx=>
          tx.run(`MATCH (n:Organisation) WHERE n.label="${row['Native of'].trim()}" return n`,{})
        )
        .then(result=> {
          let records = result.records;
          if (records.length>0) {
            let record = records[0].toObject();
            let outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          }
          return null;
        });
        let affiliationTypes = ["Diocese","Religious order","Seminary","School","Hospital",];
        let nativeOfTypes = ["Parish","Townland"];

        // has affiliation
        if (affiliationTypes.indexOf(row['Native of type'])>-1) {
          let nativeAffiliationRef = {
            items: [
              {_id:person._id, type: "Person", role: ""},
              {_id:nativeOfOrg._id, type: "Organisation", role: ""},
            ],
            taxonomyTermLabel: "hasAffiliation"
          };
          let addNativeAffiliationReference = await updateReference(nativeAffiliationRef);
        }
        // native of
        if (nativeOfTypes.indexOf(row['Native of type'])>-1) {
          let nativeRef = {
            items: [
              {_id:person._id, type: "Person", role: ""},
              {_id:nativeOfOrg._id, type: "Organisation", role: ""},
            ],
            taxonomyTermLabel: "wasNativeOf"
          };
          let addNativeReference = await updateReference(nativeRef);
        }

      }

      // 4. appointment event
      let appointment = row['Appointment'].trim();
      let appointmentDate = row['App.'].trim();
      let appTitle = row['Title'].trim();
      let appointmentType = row['Appointment type'].trim();
      let appointmentCathedralCity = row['Appointment Cathedral city'].trim();
      let appointmentDiocese = row['Appointment Diocese'].trim();
      if (appointment!=="") {
        let appointmentOrg = await session.writeTransaction(tx=>
          tx.run(`MATCH (n:Organisation) WHERE n.label="${appointment}" return n`,{})
        )
        .then(result=> {
          let records = result.records;
          if (records.length>0) {
            let record = records[0].toObject();
            let outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          }
          return null;
        });
        let spatial = await helpers.loadRelations(appointmentOrg._id, "Organisation", "Spatial");
        appointmentOrg.spatial = spatial;
        let eventLabel = appTitle;
        if (eventLabel==="") eventLabel = "Parish Priest";
        let eventTypeLabel = "Appointment";
        let appRelationType = "wasAppointedAs";
        if (appointmentDate==="1704") {
          appRelationType = "wasServingAs";
        }
        if (appTitle==="Retired Parish Priest" || appTitle==="Retired") {
          eventLabel = `retired to ${appointmentOrg.label}`;
          eventTypeLabel = `Retirement`;
          appRelationType = "retiredTo";
        }
        if (appointmentType==="School" && seminaries.indexOf(appTitle)===-1) {
          eventLabel = "Teaching post";
          appRelationType = "wasAppointedTo";
        }
        if (seminaries.indexOf(appTitle)>-1) {
          eventLabel = "was appointed as Parish Priest";
        }
        // 1. add event
        // 1.1 save event
        let eventType = await session.writeTransaction(tx=>
          tx.run(`MATCH (n:TaxonomyTerm) WHERE n.labelId="${helpers.normalizeLabelId(eventTypeLabel)}" return n`,{})
        )
        .then(result=> {
          let records = result.records;
          if (records.length>0) {
            let record = records[0].toObject();
            let outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          }
          return null;
        });
        let eventData = {
          label: eventLabel,
          eventType: eventType._id
        }
        let newEvent = new Event(eventData);
        let newEventSave = await newEvent.save(userId);
        let event = newEventSave.data;

        // 1.2 relate event to person
        let eventPersonRef = {
          items: [
            {_id:person._id, type: "Person", role: ""},
            {_id:event._id, type: "Event", role: ""},
          ],
          taxonomyTermLabel: appRelationType
        };
        let addEventPersonReference = await updateReference(eventPersonRef);

        // 1.3 relate event to organisation
        let eventOrganisationRef = {
          items: [
            {_id:event._id, type: "Event", role: ""},
            {_id:appointmentOrg._id, type: "Organisation", role: ""},
          ],
          taxonomyTermLabel: "hasRelation"
        };
        let addEventOrganisationReference = await updateReference(eventOrganisationRef);

        // 1.4 relate event to time
        if (appointmentDate!=="") {
          let eventDate = await session.writeTransaction(tx=>
            tx.run(`MATCH (n:Temporal) WHERE n.label="${appointmentDate}" return n`,{})
          )
          .then(result=> {
            let records = result.records;
            if (records.length>0) {
              let record = records[0].toObject();
              let outputRecord = helpers.outputRecord(record.n);
              return outputRecord;
            }
            return null;
          });
          if (eventDate===null) {
            let dateRange = normalizeDate(appointmentDate);
            let startDate = appointmentDate;
            let endDate = null;
            if (dateRange.includes("-")) {
              let dateRangeArr = dateRange.split("-");
              startDate = dateRangeArr[0];
              endDate = dateRangeArr[1];
            }
            let eventDateData = {
              label:row['App.'].trim(),
              startDate: startDate,
              endDate: endDate
            }
            let newTemporal = new Temporal(eventDateData);
            let newTemporalSave = await newTemporal.save(userId);
            eventDate = newTemporalSave.data;
          }
          let eventTemporalRef = {
            items: [
              {_id:event._id, type: "Event", role: ""},
              {_id:eventDate._id, type: "Temporal", role: ""},
            ],
            taxonomyTermLabel: "hasTime"
          };
          let addEventTemporalReference = await updateReference(eventTemporalRef);
        }
        // 1.5. relate event to location
        let appointmentOrgSpatial = null;
        if (typeof appointmentOrg.spatial!=="undefined") {
          appointmentOrgSpatial = appointmentOrg.spatial[0];
          if (typeof appointmentOrgSpatial!=="undefined") {
            let eventSpatialRef = {
              items: [
                {_id:event._id, type: "Event", role: ""},
                {_id:appointmentOrgSpatial.ref._id, type: "Spatial", role: ""},
              ],
              taxonomyTermLabel: "hasLocation"
            };
            let addEventSpatialReference = await updateReference(eventSpatialRef);
          }
        }
        // 2. add seminary affiliation
        if (seminaries.indexOf(appTitle)>-1) {
          let personSeminaryRef = {
            items: [
              {_id:person._id, type: "Person", role: ""},
              {_id:appointmentOrg._id, type: "Organisation", role: ""},
            ],
            taxonomyTermLabel: "hasAffiliation"
          };
          let addPersonSeminaryReference = await updateReference(personSeminaryRef);
        }
      }
      if (row['Died']!=="") {
        let deathDate = row['Died'].trim();
        let deceasedEventData = {
          label: "Deceased",
          eventType: "Death"
        }
        let newDeceasedEvent = new Event(deceasedEventData);
        let newDeceasedEventSave = await newDeceasedEvent.save(userId);
        let deceasedEvent = newDeceasedEventSave.data;

        // relate deceased event to person
        let deceasedEventPersonRef = {
          items: [
            {_id:person._id, type: "Person", role: ""},
            {_id:deceasedEvent._id, type: "Event", role: ""},
          ],
          taxonomyTermLabel: "wasRecordedAs"
        };
        let addDeceasedEventPersonReference = await updateReference(deceasedEventPersonRef);

        // relate deceased event date
        let deceasedEventDate = await session.writeTransaction(tx=>
          tx.run(`MATCH (n:Temporal) WHERE n.label="${deathDate}" return n`,{})
        )
        .then(result=> {
          let records = result.records;
          if (records.length>0) {
            let record = records[0].toObject();
            let outputRecord = helpers.outputRecord(record.n);
            return outputRecord;
          }
          return null;
        });
        if (deceasedEventDate===null) {
          let deceasedDateRange = normalizeDate(deathDate);
          let deceasedStartDate = deathDate;
          let deceasedEndDate = null;
          if (deceasedDateRange.includes("-")) {
            let deceasedDateRangeArr = deceasedDateRange.split("-");
            deceasedStartDate = deceasedDateRangeArr[0];
            deceasedEndDate = deceasedDateRangeArr[1];
          }
          let deceasedEventDateData = {
            label:deathDate,
            startDate: deceasedStartDate,
            endDate: deceasedEndDate
          }
          let newDeceasedTemporal = new Temporal(deceasedEventDateData);
          let newDeceasedTemporalSave = await newDeceasedTemporal.save(userId);
          deceasedEventDate = newDeceasedTemporalSave.data;
        }
        let deceasedEventTemporalRef = {
          items: [
            {_id:deceasedEvent._id, type: "Event", role: ""},
            {_id:deceasedEventDate._id, type: "Temporal", role: ""},
          ],
          taxonomyTermLabel: "hasTime"
        };
        let addDeceasedEventTemporalReference = await updateReference(deceasedEventTemporalRef);
      }
    }
  }
  session.close();
  return resp.json({
    status: true,
    data: [],
    error: false,
    msg: '',
  })
}

const insertOrganisation = async(organisation, userId, organisationTypesTaxonomy) => {
  // 1. save new Organisation Type
  let newOrganisationType = await insertOrganisationType(organisation.type,userId,organisationTypesTaxonomy._id);

  // 2. save new city
  let newCity = await insertCathedralCity(organisation.city, userId);
  let organisationData = {
    label: organisation.label,
    labelSoundex: helpers.soundex(organisation.label),
    status: "public",
    organisationType: organisation.type
  }
  // 3. save organisation
  // check if exists
  let session = driver.session()
  let query = `MATCH (n:Organisation) WHERE n.label="${organisation.label}" return n`;
  let data = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    let records = result.records;
    if (records.length>0) {
      let record = records[0].toObject();
      let outputRecord = helpers.outputRecord(record.n);
      return outputRecord;
    }
    return null;
  });
  if (data===null) {
    let newOrganisation = new Organisation(organisationData);
    let newOrganisationSave = await newOrganisation.save(userId);
    data = newOrganisationSave.data;
  }
  // 4. add link to city
  let newRef = {
    items: [
      {_id:newCity._id, type: "Spatial", role: ""},
      {_id:data._id, type: "Organisation", role: ""},
    ],
    taxonomyTermLabel: "isTheEpiscopalSeeOf"
  }

  const addReference = await updateReference(newRef);
  data.ref = addReference;

  return data;
}

const insertOrganisationType = async(organisationType, userId, organisationTypesTaxonomyId) => {
  let organisationTypeData = {
    label: organisationType,
    labelId: helpers.normalizeLabelId(organisationType),
    inverseLabel: organisationType,
    inverseLabelId: helpers.normalizeLabelId(organisationType),
  }
  let newOrganisationType = new TaxonomyTerm(organisationTypeData);
  await newOrganisationType.load();
  let data = newOrganisationType;
  if (typeof newOrganisationType._id==="undefined" || newOrganisationType._id===null)  {
    let insertOrganisationTypeSave = await newOrganisationType.save(userId);
    data = insertOrganisationTypeSave.data;
    // relate to organisationTypes
    let newRef = {
      items: [
        {_id:data._id, type: "TaxonomyTerm", role: ""},
        {_id:organisationTypesTaxonomyId, type: "Taxonomy", role: ""},
      ],
      taxonomyTermLabel: "isChildOf"
    }
    const addReference = await updateReference(newRef);
    data.ref = addReference;
  }
  return data;
}

const insertCathedralCity = async(city, userId) => {
  if (city==="") {
    return null;
  }
  let session = driver.session()
  let query = `MATCH (n:Spatial) WHERE n.label="${city}" return n`;
  let data = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    let records = result.records;
    if (records.length>0) {
      let record = records[0].toObject();
      let outputRecord = helpers.outputRecord(record.n);
      return outputRecord;
    }
    return null;
  });
  if (data===null) {
    let newCityData = {label: city};
    let newCity = new Spatial(newCityData);
    let newCitySave = await newCity.save(userId);
    data = newCitySave.data;
  }
  return data;
}

const fixDBIDS = async(req, resp) => {
  const directory = `${archivePath}documents/meath/`;
  const files = await fs.readdirSync(`${directory}source-csv/`);
  const filesHeaders = ['First name','Middle name','Last name','Native of','Native of type','Native of Cathedral city','Native Diocese','App.','Title','Appointment','Appointment type','Appointment Cathedral city','Appointment Diocese','Died','DB ID'];
  const dbFilesHeaders = ['#','ID','First name','Middle name','Last name','Native of','Native of type','Native of Cathedral city','Native Diocese','App.','Title','Appointment','Appointment type','Appointment Cathedral city','Appointment Diocese','Died','Location of death','Native event','Appointment event','Death event'];

  for (let i=0;i<files.length; i++) {
    let file = files[i];
    if (!file.includes(".csv")) {
      continue;
    }
    let csv = await new Promise((resolve,reject)=>{
      let results = [];
      fs.createReadStream(`${directory}source-csv/${file}`)
      .pipe(csvParser(filesHeaders))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
    });

    let dbCsv = await new Promise((resolve,reject)=>{
      let results = [];
      fs.createReadStream(`${directory}xlsx/${file}`)
      .pipe(csvParser(dbFilesHeaders))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
    });
    for (let line in dbCsv) {
      let row = dbCsv[line];
      if (Number(line)===0) {
        continue;
      }
      if (row['ID']!=="") {
        let prevRowIndex = Number(line)-1;
        let prevRow = dbCsv[prevRowIndex];
        let index = Number(prevRow['0'])+1;
        let csvRow = csv[index];
        if (typeof csvRow==="undefined" || csvRow['DB ID']!=="") {
          continue;
        }
        csvRow['DB ID'] = row['1'];
      }
    }

    let csvData = "";
    for (let line in csv) {
      let row = csv[line];
      let lineText = "";
      for (let key in row) {
        lineText +=`${row[key]},`
      }
      lineText += `\n`;
      csvData += lineText;
    }
    let csvPath = `${directory}target-csv/${file}`;
    let writeFile = await new Promise ((resolve,reject)=> {
      fs.writeFile(csvPath, csvData, 'utf8', function(err) {
        if (err) {
          reject(err);
        } else {
          csvStatus = true;
          resolve(true);
        }
      });
    });

  }
  return resp.json({
    status: true,
    data: [],
    error: false,
    msg: '',
  })
}

module.exports = {
  ocrDocumentsDir: ocrDocumentsDir,
  identifyColumns: identifyColumns,
  exportToCsv: exportToCsv,
  exportOrganisations: exportOrganisations,
  correctOrganisations: correctOrganisations,
  processItems: processItems,
  compareToDBProcessedItems: compareToDBProcessedItems,
  ingestProcessedItems: ingestProcessedItems,
  fixDBIDS: fixDBIDS,
}
