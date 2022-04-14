if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: '.env.production' });
}
if (process.env.NODE_ENV === 'development') {
  require('dotenv').config({ path: '.env.development' });
}
if (process.env.NODE_ENV === 'development.ssl') {
  require('dotenv').config({ path: '.env.development.ssl' });
}
if (process.env.NODE_ENV === 'devserver') {
  require('dotenv').config({ path: '.env.develserver' });
}
const compression = require('compression');
const cors = require('cors');
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
// const bodyParser = require('body-parser')
const api = require('./routes/api');
const port = process.env.PORT;
const app = express();
app.use(compression());

app.use(cors());
app.use(express.json({ limit: '50mb', extended: true }));
app.use(
  express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 1000 })
);

app.use('/api', api);
// serve files from archive
app.use(express.static(process.env.ARCHIVEPATH));
// serve resources
app.use(express.static(process.env.RESOURCESPATH));
// serve uploads
app.use(express.static(process.env.UPLOADSPATH));
// set json & file limit
// app.use(bodyParser.json({limit: '50mb',extended: true}));
// app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 1000}));

// add https support
if (process.env.NODE_ENV === 'development.ssl') {
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
    // passphrase: 'localhost',
  };
  /** start express server */
  https.createServer(options, app).listen(port, () => {
    console.log(`HTTPS-enabled server started at port: ${port}`);
  });
} else {
  http.createServer(app).listen(port, () => {
    console.log(`Server started at port: ${port}`);
  });
}
