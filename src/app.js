const { NODE_ENV } = process.env;
// load the appropriate environment variables
let envPath;
switch (NODE_ENV) {
  case 'production':
    envPath = '.env.production';
    break;
  case 'development':
    envPath = '.env.development';
    break;
  case 'development.ssl':
    envPath = '.env.development.ssl';
    break;
  case 'devserver':
    envPath = '.env.develserver';
    break;
  default:
    envPath = '.env.production';
    break;
}

require('dotenv').config({ path: envPath });

const compression = require('compression');
const cors = require('cors');
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const api = require('./routes/api');

const {
  ARCHIVEPATH,
  PORT: port,
  SERVERURL,
  RESOURCESPATH,
  UPLOADSPATH,
} = process.env;

const app = express();
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb', extended: true }));
app.use(
  express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 1000 })
);
app.use('/api', api);

// serve files from archive
app.use(express.static(ARCHIVEPATH));
// serve resources
app.use(express.static(RESOURCESPATH));
// serve uploads
app.use(express.static(UPLOADSPATH));

// add https support and start server
if (NODE_ENV === 'development.ssl') {
  const key = fs.readFileSync(
    path.resolve(__dirname, './cert/localhost-key.pem'),
    'utf8'
  );
  const cert = fs.readFileSync(
    path.resolve(__dirname, './cert/localhost.pem'),
    'utf8'
  );

  const options = {
    key: key,
    cert: cert,
  };
  /** start express server */
  https.createServer(options, app).listen(port, () => {
    console.log(`HTTPS-enabled server started at: ${SERVERURL}api`);
  });
} else {
  http.createServer(app).listen(port, () => {
    console.log(`Server started at: ${SERVERURL}api`);
  });
}
