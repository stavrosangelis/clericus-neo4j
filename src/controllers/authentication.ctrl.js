const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const driver = require('../config/db-driver');
const helpers = require('../helpers');
const User = require('./user.ctrl').User;
const adminActiveToken = require('../routes/auth').adminActiveToken;

// set passport strategy
const passportLocal = new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
  },
  async function (username, password, done) {
    let session = driver.session();
    let query =
      'MATCH (u:User {email: $email})-[:belongsToUserGroup]->(ug) RETURN u,ug';
    let params = {
      email: username,
    };
    let user = await session
      .writeTransaction((tx) => tx.run(query, params))
      .then((result) => {
        session.close();
        let outputRecord = null;
        if (result.records.length > 0) {
          let resultData = result.records[0].toObject();
          let userData = resultData.u;
          let userGroupData = resultData.ug;
          outputRecord = helpers.outputRecord(userData);
          outputRecord.usergroup = helpers.outputRecord(userGroupData);
        }
        return outputRecord;
      });
    if (user === null) {
      return done('Please provide a valid email address', false, {
        message: 'Please provide a valid email address',
      });
    }
    if (Object.entries(user.usergroup).length === 0) {
      return done('The user is not assigned to a usergroup', false, {
        message: 'The user is not assigned to a usergroup',
      });
    }
    let newUser = new User(user);
    let validatePassword = await newUser.validatePassword(password);
    if (!validatePassword) {
      return done('Incorrect password.', false, {
        message: 'Incorrect password.',
      });
    }
    return done(null, newUser, {});
  }
);

const passportAdmin = new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
  },
  async function (username, password, done) {
    const session = driver.session();
    const query = `MATCH (u:User)-[:belongsToUserGroup]->(ug) WHERE u.email="${username}" RETURN u,ug`;
    const user = await session
      .writeTransaction((tx) => tx.run(query, {}))
      .then((result) => {
        session.close();
        let outputRecord = null;
        if (result.records.length > 0) {
          let resultData = result.records[0].toObject();
          let userData = resultData.u;
          let userGroupData = resultData.ug;
          outputRecord = helpers.outputRecord(userData);
          outputRecord.usergroup = helpers.outputRecord(userGroupData);
        }
        return outputRecord;
      })
      .catch((error) => {
        console.log(error);
      });
    if (user === null) {
      return done('Please provide a valid email address', false, {
        message: 'Please provide a valid email address',
      });
    }
    if (Object.entries(user.usergroup).length === 0) {
      return done('The user is not assigned to a usergroup', false, {
        message: 'The user is not assigned to a usergroup',
      });
    }
    if (!user.usergroup.isAdmin) {
      return done('You are not authorised to access this page', false, {
        message: 'You are not authorised to access this page',
      });
    }
    let newUser = new User(user);
    let validatePassword = await newUser.validatePassword(password);
    if (!validatePassword) {
      return done('Incorrect password.', false, {
        message: 'Incorrect password.',
      });
    }
    return done(null, newUser, {});
  }
);

passport.use('local', passportLocal);
passport.use('admin', passportAdmin);

const loginUser = async (req, resp) => {
  let postData = req.body;
  if (!postData.email) {
    return resp.json({
      status: false,
      data: [],
      error: 'Please enter a valid email address to continue',
      msg: '',
    });
  }

  if (!postData.password) {
    return resp.json({
      status: false,
      data: [],
      error: 'Please enter your password to continue',
      msg: '',
    });
  }
  return passport.authenticate(
    'local',
    { session: false },
    (error, passportUser) => {
      if (error) {
        return resp.json({
          status: false,
          data: [],
          error: error,
          msg: '',
        });
      }

      if (passportUser) {
        const user = passportUser;
        user.token = passportUser.generateJWT();

        let returnUser = new User(
          user._id,
          user.firstName,
          user.lastName,
          user.email,
          null,
          user.token
        );
        resp.json({
          status: true,
          data: returnUser,
          error: [],
          msg: '',
        });
      }
      if (!passportUser) {
        return resp.json({
          status: false,
          data: [],
          error: "The email/password you provided don't match with a user",
          msg: '',
        });
      }
    }
  )(req, resp);
};

/**
* @api {post} /admin-login Admin login
* @apiName admin-login
* @apiGroup Session
* @apiPermission admin
*
* @apiParam {string} email The user email
* @apiParam {string} password The user password
*
* @apiSuccessExample {json} Success-Response:
{
    "status": true,
    "data": {
        "_id": "260",
        "firstName": "Admin",
        "lastName": "",
        "email": "admin@test.com",
        "usergroup": {
            "description": "This group has access to the back-end",
            "isDefault": false,
            "isAdmin": true,
            "label": "Administrator",
            "_id": "401"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3N1ZXIiOiJDbGVyaWN1cyBhcHAiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwiaWQiOiIyNjAiLCJleHBpcmVzSW4iOiIyMDIwLTAxLTE1VDExOjQ1OjM5LjYwOVoiLCJhbGdvcml0aG0iOiJSUzI1NiIsImlzQWRtaW4iOnRydWUsImlhdCI6MTU3OTAwMjMzOX0.LJsBRcM3J5d_wvm4wneQCRDeN3mBRArmCgaosMQzl-0",
        "createdBy": null,
        "createdAt": null,
        "updatedBy": null,
        "updatedAt": null
    },
    "error": [],
    "msg": ""
}
*/
const loginAdmin = async (req, resp) => {
  let postData = req.body;
  if (!postData.email) {
    return resp.json({
      status: false,
      data: [],
      error: 'Please enter a valid email address to continue',
      msg: '',
    });
  }

  if (!postData.password) {
    return resp.json({
      status: false,
      data: [],
      error: 'Please enter your password to continue',
      msg: '',
    });
  }

  return passport.authenticate(
    'admin',
    { session: false },
    (error, passportUser) => {
      if (error) {
        return resp.json({
          status: false,
          data: [],
          error: error,
          msg: '',
        });
      }

      if (passportUser) {
        const user = passportUser;
        user.token = passportUser.generateJWT();
        delete user.password;
        resp.json({
          status: true,
          data: user,
          error: [],
          msg: '',
        });
      }
      if (!passportUser) {
        return resp.json({
          status: false,
          data: [],
          error: "The email/password you provided don't match with a user",
          msg: '',
        });
      }
    }
  )(req, resp);
};

const registerUser = async (req, resp) => {
  let postData = req.body;
  let emailRegEx = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
  if (
    typeof postData.email === 'undefined' ||
    postData.email === '' ||
    postData.email.search(emailRegEx) === -1
  ) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please enter a valid email address to continue',
    });
    return false;
  }
  let user = new User();
  for (let key in postData) {
    if (postData[key] !== null) {
      user[key] = postData[key];
    }
  }
  let insertUserPromise = await user.insert();
  resp.json({
    status: true,
    data: insertUserPromise,
    error: [],
    msg: '',
  });
};

/**
* @api {post} /admin-session Admin session
* @apiName admin-session
* @apiGroup Session
* @apiPermission admin
*
* @apiParam {string} token An active jwt token
*
* @apiSuccessExample {json} Success-Response:
{
  "status":true,
  "data":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3N1ZXIiOiJDbGVyaWN1cyBhcHAiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwiaWQiOiIyNjAiLCJleHBpcmVzSW4iOiIyMDIwLTAxLTE1VDExOjU2OjEwLjQ3OFoiLCJhbGdvcml0aG0iOiJSUzI1NiIsImlzQWRtaW4iOnRydWUsImlhdCI6MTU3OTAwMjk3MH0.O1i9yxQDjeBt0XMaqNzLnAiuBQvtoA3GEo0JDEAdn3M",
  "error":false,
  "msg":"Token successfully verified"
}
*/
const activeSession = async (req, resp) => {
  const parameters = req.body;
  const token = parameters.token || null;
  const active = adminActiveToken(token);
  if (!active) {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: 'Please provide a valid token to continue',
    });
  } else {
    resp.json({
      status: true,
      data: token,
      error: false,
      msg: 'Token successfully verified',
    });
  }
};

module.exports = {
  loginUser: loginUser,
  loginAdmin: loginAdmin,
  activeSession: activeSession,
  registerUser: registerUser,
  passportLocal: passportLocal,
};
