const jwt = require('jsonwebtoken');
const fs = require('fs');
const privateKey = fs.readFileSync('./src/config/.private.key', 'utf8');

let activeToken = (token) => {
  let active = false;
  if (token!==null) {
    jwt.verify(token, privateKey, (error, decoded) => {
      if (!error) {
        active = true;
      }
    });
  }
  return active;
}

let checkToken = (req, resp, next) => {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    token =  req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token =  req.query.token;
  }
  if (token!==null && token!=="null") {
    jwt.verify(token, privateKey, (error, decoded) => {
      if (error) {
        return resp.json({
          status: false,
          data: [],
          error: "Invalid authorization token",
          msg: "",
        });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  }
  else {
    return resp.json({
      status: false,
      data: [],
      error: "Authorization token not supplied",
      msg: "",
    });
  }
}

let checkAdminToken = (req, resp, next) => {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    token =  req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token =  req.query.token;
  }
  if (token!==null && token!=="null") {
    jwt.verify(token, privateKey, (error, decoded) => {
      if (typeof decoded!=="undefined") {
        if (decoded.isAdmin===false) {
          error = "Unauthorised access.";
        }
      }
      if (error) {
        return resp.json({
          status: false,
          data: [],
          error: "Invalid authorization token",
          msg: "",
        });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  }
  else {
    return resp.json({
      status: false,
      data: [],
      error: "Authorization token not supplied",
      msg: "",
    });
  }
}

module.exports = {
  activeToken: activeToken,
  checkToken: checkToken,
  checkAdminToken: checkAdminToken,
}
