if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: '../../../.env.production' });
} else {
  require('dotenv').config({ path: '../../../.env.development' });
}
const Canvas = require('canvas');
const yargs = require('yargs');
const axios = require('axios');
// const schedule = require('node-schedule');
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);

/*
 *
 * node cli-ocr.js ocr -i=/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/archive/documents/rj-hunter-2/261-EG.jpg -o=/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/archive/documents/rj-hunter-2/ -l=en -t=read/analyze
 *
 */
const argv = yargs
  .command(
    'ocr',
    'Execute OCR in a document. The document must be an image file'
  )
  .option('input', {
    alias: 'i',
    description: 'Provide the absolute path to the file',
    type: 'string',
  })
  .option('output', {
    alias: 'o',
    description: 'Provide the absolute path a directory for the ocr results',
    type: 'string',
  })
  .option('language', {
    alias: 'l',
    description: 'Provide the language of the text depicted on the image',
    type: 'string',
  })
  .option('type', {
    alias: 't',
    description: 'One of ocr | analyze',
    type: 'string',
  })
  .help('h')
  .alias('help', 'h').argv;

const visionKey = process.env.CLOUD_VISION_KEY;
const visionURL = process.env.CLOUD_VISION_ENDPOINT;

const delay = (t, val) => {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(val);
    }, t);
  });
};

const highlightText = async (inputFile, text, outputFile) => {
  const lines = text.readResults[0].lines;
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
    if (typeof line.words !== 'undefined') {
      for (let wordKey in line.words) {
        let word = line.words[wordKey];
        words.push(word);
      }
    }
  }
  words.forEach((word) => {
    context.beginPath();
    const boundingBox = word.boundingBox;
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
  const jpgStream = canvas.createJPEGStream();

  await new Promise((resolve) => {
    jpgStream.pipe(writeStream);
    writeStream.on('finish', () => {
      resolve(true);
      console.log('The JPEG file was created.');
    });
  });
};

const exportText = async (inputFile, text, outputFile) => {
  const lines = text.readResults[0].lines;
  let newText = '';
  for (let key in lines) {
    let line = lines[key];
    const words = line.words;
    if (typeof words !== 'undefined') {
      for (let wordKey in words) {
        const word = words[wordKey];
        newText += word.text;
        if (typeof words[Number(wordKey) + 1] !== 'undefined') {
          newText += ' ';
        } else {
          newText += '\n';
        }
      }
    }
  }

  // Write the result to a file
  console.log(`Writing to file ${outputFile}`);
  await new Promise((resolve, reject) => {
    fs.writeFile(outputFile, newText, 'utf8', (error) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        console.log('Text has been saved successfully!');
        resolve(true);
      }
    });
  });
};

const resultToCsv = async (input = '', output = '', fileName = '') => {
  if (input === '') {
    console.log('Please provide a valid input path to continue.');
    process.exit();
  }
  if (output === '') {
    console.log('Please provide a valid output path to continue.');
    process.exit();
  }
  const readFile = promisify(fs.readFile);
  const src = `${output}/${fileName}-text.json`;

  const json = await readFile(src);
  const jsonData = JSON.parse(json);
  const results = jsonData.readResults[0];
  const { lines } = results;
  const words = [];
  const { length: linesLength } = lines;
  const rows = [];
  for (let i = 0; i < linesLength; i += 1) {
    const line = lines[i];
    const { boundingBox } = line;
    const y = boundingBox[1];
    const height = boundingBox[5] - boundingBox[1];
    line.y = y;
    line.height = height;
    words.push(line);
    rows.push({ y, height });
  }
  // identify unique rows
  const newRows = [];
  const rowsLength = rows.length;
  for (let i = 0; i < rowsLength; i += 1) {
    const r = rows[i];
    const { y, height } = r;
    const halfHeight = height / 2;
    const topBoundary = y - halfHeight;
    const bottomBoundary = y + halfHeight;
    const findRow =
      newRows.find((r) => r.y > topBoundary && r.y < bottomBoundary) || null;
    if (findRow === null) {
      newRows.push(r);
    }
  }

  // fetch row text
  const resultRows = [];
  const newRowsLength = newRows.length;
  for (let i = 0; i < newRowsLength; i += 1) {
    const nr = newRows[i];
    const { y, height } = nr;
    const halfHeight = height / 2;
    const topBoundary = y - halfHeight;
    const bottomBoundary = y + halfHeight;
    const filterLines =
      lines.filter(
        (l) =>
          l.boundingBox[1] > topBoundary && l.boundingBox[1] < bottomBoundary
      ) || [];
    const rowText = filterLines.map((t) => `"${t.text}"`).join(',');
    resultRows.push(rowText);
  }

  const csvPath = `${output}/${fileName}-data.csv`;
  const csvText = resultRows.join('\n');
  await new Promise((resolve, reject) => {
    fs.writeFile(csvPath, `\ufeff${csvText}`, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  console.log(`${fileName}-data.csv written successfully`);
  return true;
};

const queryResults = async (input = '', output = '', fileName = '') => {
  if (input === '') {
    console.log('Please provide a valid input path to continue.');
    process.exit();
  }
  if (output === '') {
    console.log('Please provide a valid output path to continue.');
    process.exit();
  }
  const statusPath = `${output}/${fileName}-text-status.json`;
  // 1. check if text analysis is complete
  const readFile = promisify(fs.readFile);
  const statusFile = await readFile(statusPath);
  const statusData = JSON.parse(statusFile);
  const textData = await axios({
    method: 'get',
    url: statusData.url,
    crossDomain: false,
    headers: {
      'Ocp-Apim-Subscription-Key': visionKey,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      console.log('error');
      console.log(error.response.data);
    });
  if (textData?.data?.status === 'succeeded') {
    // fetch data and write them to a file
    const outputTextFile = `${output}/${fileName}-text.json`;

    await new Promise((resolve, reject) => {
      fs.writeFile(
        outputTextFile,
        JSON.stringify(textData.data.analyzeResult),
        'utf8',
        (error) => {
          if (error) {
            console.log(error);
            reject(error);
          } else {
            console.log('Text has been saved successfully!');
            resolve(true);
          }
        }
      );
    });

    // update status  doc
    const textDataFile = {
      url: statusData.url,
      completed: true,
    };

    await new Promise((resolve, reject) => {
      fs.writeFile(
        statusPath,
        JSON.stringify(textDataFile),
        'utf8',
        (error) => {
          if (error) {
            console.log(error);
            reject(error);
          } else {
            console.log('Text status saved successfully!');
            resolve(true);
          }
        }
      );
    });

    // create image with highlights
    const imgOutput = `${output}/${fileName}-text.jpg`;
    await highlightText(input, textData.data.analyzeResult, imgOutput);

    // create simple text file
    const textOutput = `${output}/${fileName}-text.txt`;
    await exportText(input, textData.data.analyzeResult, textOutput);
  } else {
    await delay(5000);
    await queryResults(input, output, fileName);
  }
  await resultToCsv(input, output, fileName);
  return 'Completed successfully';
};

const ocr = async () => {
  const {
    input: inputParam = '',
    output: outputParam = '',
    language = 'en',
    type = 'read/analyze',
  } = argv;
  if (inputParam === '') {
    console.log('Please provide a valid input path to continue.');
    process.exit();
  }
  if (outputParam === '') {
    console.log('Please provide a valid output path to continue.');
    process.exit();
  }
  const input =
    inputParam.charAt(inputParam.length - 1) === '/'
      ? inputParam.slice(0, -1)
      : inputParam;
  const output =
    outputParam.charAt(outputParam.length - 1) === '/'
      ? outputParam.slice(0, -1)
      : outputParam;
  if (!input.includes('.jpg')) {
    console.log(`The input file must have a '.jpg' extension`);
    process.exit();
  }
  const inputFile = await readFile(input);
  const inputPathParts = input.split('/');
  let fileName = inputPathParts[inputPathParts.length - 1];
  fileName = fileName.replace('.jpg', '');

  // make an output dir specific for the fileName
  const outputDir = `${output}/${fileName}`;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const params = {
    mode: 'Printed',
    language,
    detectOrientation: false,
    readingOrder: 'natural',
  };
  const ocrText = await axios({
    method: 'post',
    url: `${visionURL}vision/v3.2/${type}`,
    data: inputFile,
    params,
    crossDomain: false,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Ocp-Apim-Subscription-Key': visionKey,
    },
  })
    .then((response) => {
      let resp = '';
      if (type === 'read/analyze') {
        resp = response.headers['operation-location'];
      }
      return resp;
    })
    .catch((error) => {
      console.log(`error ${fileName}\n`);
      console.log(error.response.data);
      return false;
    });
  if (ocrText !== false) {
    if (type === 'read/analyze') {
      const fileStatus = {
        url: ocrText,
        completed: false,
      };
      const statusPath = `${outputDir}/${fileName}-text-status.json`;
      await new Promise((resolve, reject) => {
        fs.writeFile(
          statusPath,
          JSON.stringify(fileStatus),
          'utf8',
          (error) => {
            if (error) {
              reject(error);
            } else {
              resolve(true);
              console.log('Text status saved successfully!');
            }
          }
        );
      });
    }
  } else {
    console.log({ status: false, error: 'error' });
  }
  await queryResults(input, outputDir, fileName);
  process.exit();
};

if (argv._.includes('ocr')) {
  ocr();
}
