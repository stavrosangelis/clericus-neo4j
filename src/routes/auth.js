const jwt = require('jsonwebtoken');
const fs = require('fs');

const { PRIVATE_KEY } = process.env;
const privateKey = fs.readFileSync(PRIVATE_KEY, 'utf8');

const activeToken = (token) => {
  let active = false;
  if (token !== null) {
    jwt.verify(token, privateKey, (error) => {
      if (!error) {
        active = true;
      }
    });
  }
  return active;
};

const checkAdminToken = (req, resp, next) => {
  const { headers } = req;
  const { authorization = '' } = headers;
  if (authorization === '') {
    return resp.status(401).json({
      status: false,
      data: [],
      errors: ['The provided authorisation token is not valid'],
    });
  }
  let token = null;
  if (authorization.split(' ')[0] === 'Bearer') {
    token = authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }
  if (token !== null && token !== 'null') {
    jwt.verify(token, privateKey, (error, decoded = null) => {
      // check if token has expired
      if (decoded !== null) {
        const today = new Date();
        const expiresIn = new Date(decoded.expiresIn);
        if (today > expiresIn) {
          error = 'Session expired. Please login again to continue.';
        }
        if (decoded.isAdmin === false) {
          error = 'Unauthorised access!';
        }
      }
      if (error) {
        return resp.status(401).json({
          status: false,
          data: [],
          errors: [error],
        });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return resp.status(401).json({
      status: false,
      data: [],
      errors: ['Unauthorised'],
    });
  }
};

const adminActiveToken = (token) => {
  let active = false;
  if (token !== null) {
    jwt.verify(token, privateKey, (error, decoded = null) => {
      // check if token has expired
      if (decoded !== null) {
        const today = new Date();
        const expiresIn = new Date(decoded.expiresIn);
        if (today <= expiresIn && decoded.isAdmin) {
          active = true;
        }
      }
    });
  }
  return active;
};

module.exports = {
  activeToken,
  checkAdminToken,
  adminActiveToken,
};
