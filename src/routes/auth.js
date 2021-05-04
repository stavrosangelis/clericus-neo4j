const jwt = require('jsonwebtoken');
const fs = require('fs');
const privateKey = fs.readFileSync('./src/config/.private.key', 'utf8');

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

const checkToken = (req, resp, next) => {
  let token = null;
  if (
    req.headers.authorization &&
    req.headers.authorization.split(' ')[0] === 'Bearer'
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }
  if (token !== null && token !== 'null') {
    jwt.verify(token, privateKey, (error, decoded) => {
      if (error) {
        return resp.json({
          status: false,
          data: [],
          error: 'Invalid authorization token',
          msg: '',
        });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return resp.json({
      status: false,
      data: [],
      error: 'Authorization token not supplied',
      msg: '',
    });
  }
};

const checkAdminToken = (req, resp, next) => {
  let token = null;
  if (
    req.headers.authorization &&
    req.headers.authorization.split(' ')[0] === 'Bearer'
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }
  if (token !== null && token !== 'null') {
    jwt.verify(token, privateKey, (error, decoded) => {
      // check if token has expired
      if (typeof decoded === 'undefined') {
        error = '';
      } else {
        let today = new Date();
        let expiresIn = new Date(decoded.expiresIn);
        if (today > expiresIn) {
          error = 'Session expired. Please login again to continue.';
        }
        if (typeof decoded !== 'undefined') {
          if (decoded.isAdmin === false) {
            error = 'Unauthorised access!';
          }
        }
      }
      if (error) {
        return resp.json({
          status: false,
          data: [],
          error: error,
          msg: '',
        });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return resp.json({
      status: false,
      data: [],
      error: '',
      msg: '',
    });
  }
};

const adminActiveToken = (token) => {
  let active = false;
  if (token !== null) {
    jwt.verify(token, privateKey, (error, decoded) => {
      // check if token has expired
      if (typeof decoded !== 'undefined') {
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
  activeToken: activeToken,
  checkToken: checkToken,
  checkAdminToken: checkAdminToken,
  adminActiveToken: adminActiveToken,
};
