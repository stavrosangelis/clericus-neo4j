const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const driver = require('../config/db-driver');
const { outputRecord } = require('../helpers');
const { User } = require('./user.ctrl');
const { adminActiveToken } = require('../routes/auth');

// set passport strategy for login in administrators
const passportAdmin = new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
  },
  async function (username, password, done) {
    const session = driver.session();
    const query = `MATCH (u:User {email: $email})-[:belongsToUserGroup]->(ug) RETURN u,ug`;
    const params = {
      email: username,
    };
    const user = await session
      .writeTransaction((tx) => tx.run(query, params))
      .then((result) => {
        session.close();
        const { records } = result;
        if (records.length > 0) {
          const record = records[0].toObject();
          const { u: userData = null, ug: usergroupData = null } = record;
          const output = outputRecord(userData);
          output.usergroup = outputRecord(usergroupData);
          return output;
        }
        return null;
      })
      .catch((error) => {
        console.log(error);
      });
    if (user === null) {
      return done('Please provide a valid email address', false, {
        message: 'Please provide a valid email address',
      });
    }
    if (user.usergroup === null) {
      return done('The user is not assigned to a usergroup', false, {
        message: 'The user is not assigned to a usergroup',
      });
    }
    if (!user.usergroup.isAdmin) {
      return done('You are not authorised to access this page', false, {
        message: 'You are not authorised to access this page',
      });
    }
    user.isAdmin = user.usergroup.isAdmin;
    const newUser = new User(user);
    const validatePassword = await newUser.validatePassword(password);
    if (!validatePassword) {
      return done('Incorrect password.', false, {
        message: 'Incorrect password.',
      });
    }
    return done(null, newUser, {});
  }
);
passport.use('admin', passportAdmin);

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
    "errors": [],
}
*/
const loginAdmin = async (req, resp) => {
  const { body: postData } = req;
  const { email = '', password = '' } = postData;
  if (email === '') {
    return resp.status(403).json({
      status: false,
      data: [],
      errors: ['Please enter a valid email address to continue'],
    });
  }

  if (password === '') {
    return resp.status(403).json({
      status: false,
      data: [],
      errors: ['Please enter your password to continue'],
    });
  }

  return passport.authenticate(
    'admin',
    { session: false },
    (error, passportUser) => {
      if (error) {
        return resp.status(403).json({
          status: false,
          data: [],
          errors: [error],
        });
      }

      if (passportUser) {
        const user = passportUser;
        user.token = passportUser.generateJWT();
        delete user.password;
        return resp.status(200).json({
          status: true,
          data: user,
          errors: [],
        });
      }
      if (!passportUser) {
        return resp.status(403).json({
          status: false,
          data: [],
          errors: [`The provided email/password does not match with a user`],
        });
      }
    }
  )(req, resp);
};

// registration endpoint is not activated
const registerUser = async (req, resp) => {
  const { body: postData } = req;
  const emailRegEx = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
  const { email = '' } = postData;
  if (email === '' || email.search(emailRegEx) === -1) {
    return resp.status(200).json({
      status: false,
      data: [],
      errors: ['Please enter a valid email address to continue'],
    });
  }
  const user = new User();
  for (let key in postData) {
    if (postData[key] !== null) {
      user[key] = postData[key];
    }
  }
  const insertUserPromise = await user.insert();
  return resp.status(201).json({
    status: true,
    data: insertUserPromise,
    errors: [],
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
  const { body: postData } = req;
  const { token = null } = postData;
  const active = adminActiveToken(token);
  if (!active) {
    return resp.status(403).json({
      status: false,
      data: [],
      errors: ['Unauthorised access'],
    });
  } else {
    return resp.status(200).json({
      status: true,
      data: 'Session active',
      errors: [],
    });
  }
};

module.exports = {
  loginAdmin,
  activeSession,
  registerUser,
};
