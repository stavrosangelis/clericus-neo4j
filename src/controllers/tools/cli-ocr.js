if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: '../../../.env.production' });
} else {
  require('dotenv').config({ path: '../../../.env.development' });
}
const Canvas = require('canvas');
const yargs = require('yargs');
const axios = require('axios');
const schedule = require('node-schedule');
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);

const argv = yargs
  .command(
    'ocr',
    'Execute OCR in a document. The document must be an image file'
  )
  .command('results', 'Async Query OCR results')
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
    description: 'One of read/ocr',
    type: 'string',
  })
  .help('h')
  .alias('help', 'h').argv;

const visionKey = process.env.CLOUD_VISION_KEY;
const visionURL = process.env.CLOUD_VISION_ENDPOINT;

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
        console.log(typeof wordKey);
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

const queryResults = async () => {
  const { input, output } = argv;
  if (input === '') {
    console.log('Please provide a valid input path to continue.');
    process.exit();
  }
  if (output === '') {
    console.log('Please provide a valid output path to continue.');
    process.exit();
  }
  const inputPathParts = input.split('/');
  let fileName = inputPathParts[inputPathParts.length - 1];
  fileName = fileName.replace('.jpg', '');
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
  if (
    typeof textData.data.status !== 'undefined' &&
    textData.data.status === 'succeeded'
  ) {
    // fetch data and write them to a file
    const outputTextFile = `${output}${fileName}-text.json`;

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
    const imgOutput = `${output}${fileName}-text.jpg`;
    await highlightText(input, textData.data.analyzeResult, imgOutput);

    // create simple text file
    const textOutput = `${output}${fileName}-text.txt`;
    await exportText(input, textData.data.analyzeResult, textOutput);

    console.log('Completed successfully');
    process.exit();
  } else {
    console.log('Completed with error');
  }
  process.exit();
};

const ocr = async () => {
  const { input, output } = argv;
  const { language } = argv || 'unk';
  const { type } = argv || 'ocr';
  if (input === '') {
    console.log('Please provide a valid input path to continue.');
    process.exit();
  }
  if (output === '') {
    console.log('Please provide a valid output path to continue.');
    process.exit();
  }
  if (!input.includes('.jpg')) {
    console.log(`The input file must have a '.jpg' extension`);
    process.exit();
  }
  const inputFile = await readFile(input);
  const inputPathParts = input.split('/');
  let fileName = inputPathParts[inputPathParts.length - 1];
  fileName = fileName.replace('.jpg', '');
  let results = {};
  const params = {
    mode: 'Printed',
    language,
    detectOrientation: false,
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
      const statusPath = `${output}/${fileName}-text-status.json`;
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
    results = { status: false, error: 'error' };
  }
  console.log(results);
  process.exit();
};

if (argv._.includes('ocr')) {
  ocr();
}
if (argv._.includes('results')) {
  queryResults();
}
