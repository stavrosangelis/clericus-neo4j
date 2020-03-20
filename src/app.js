if (process.env.NODE_ENV==="production") {
  require('dotenv').config({path:'.env.production'});
}
if (process.env.NODE_ENV==="development") {
  require('dotenv').config({path:'.env.development'});
}
if (process.env.NODE_ENV==="devserver") {
  require('dotenv').config({path:'.env.develserver'});
}
const neo4j = require('neo4j-driver');
const cors = require('cors');
const express = require("express");
const bodyParser = require('body-parser')
const port = process.env.PORT;
const api = require('./routes/api');
const app = express();
const Promise = require("bluebird");

app.use(cors());
app.use(express.json());

app.use('/api', api);
// serve files from archive
app.use(express.static(process.env.ARCHIVEPATH));
// serve resources
app.use(express.static(process.env.RESOURCESPATH));
// serve uploads
app.use(express.static(process.env.UPLOADSPATH));
// set json & file limit
app.use(bodyParser.json({limit: '50mb',extended: true}));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 1000}));

/** start express server */
app.listen(port, () => {
  console.log(`Server started at port: ${port}`);
});
