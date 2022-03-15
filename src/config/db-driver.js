const neo4j = require('neo4j-driver');
const { DB_URI, DB_USER, DB_PASS } = process.env;
const driver = neo4j.driver(DB_URI, neo4j.auth.basic(DB_USER, DB_PASS));

module.exports = driver;
