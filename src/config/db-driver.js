const dotenv = require('dotenv');
const neo4j = require('neo4j-driver');

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
dotenv.config({ path: envPath });
const { DB_URI, DB_USER, DB_PASS, SSL_CERT_DIRECTORY } = process.env;
const hasSSL = ['development.ssl', 'production'];
const config =
  hasSSL.indexOf(NODE_ENV) > -1
    ? {
        // encrypted: 'ENCRYPTION_ON',
        // trust: 'TRUST_ALL_CERTIFICATES',
        trustedCertificates: [`${SSL_CERT_DIRECTORY}/public.crt`],
      }
    : {};
const driver = neo4j.driver(DB_URI, neo4j.auth.basic(DB_USER, DB_PASS), config);

module.exports = driver;
