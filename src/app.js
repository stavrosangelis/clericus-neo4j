if (process.env.NODE_ENV==="production") {
  require('dotenv').config({path:'.env.production'});
}
if (process.env.NODE_ENV==="development") {
  require('dotenv').config({path:'.env.development'});
}
const neo4j = require('neo4j-driver').v1;
const cors = require('cors');
const express = require("express");
const port = process.env.PORT;
const api = require('./routes/api');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', api);
// serve files from archive
app.use(express.static(process.env.ARCHIVEPATH));
/** start express server */
app.listen(port, () => {
    console.log(`Server started at port: ${port}`);
});
