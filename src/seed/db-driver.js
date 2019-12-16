const neo4j = require('neo4j-driver').v1;

const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "Clericu$"));

module.exports = driver;
