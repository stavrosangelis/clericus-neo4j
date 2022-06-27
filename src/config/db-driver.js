const neo4j = require('neo4j-driver');
const path = require('path');

const { DB_URI, DB_USER, DB_PASS, SSL_CERT_PATH } = process.env;

const config = {
  encrypted: 'ENCRYPTION_ON',
  trust: 'TRUST_ALL_CERTIFICATES',
  trustedCertificates: [path.resolve(__dirname, SSL_CERT_PATH)],
};
const driver = neo4j.driver(DB_URI, neo4j.auth.basic(DB_USER, DB_PASS), config);

module.exports = driver;
