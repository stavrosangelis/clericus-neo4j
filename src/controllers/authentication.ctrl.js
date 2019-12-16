const passport = require('passport');
const LocalStrategy = require("passport-local").Strategy;
const activeToken = require("../routes/auth.js").activeToken;
const driver = require("../config/db-driver");
const helpers = require("../helpers");
const User = require("./user.ctrl").User;

// set passport strategy
const passportLocal = new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  async function(username, password, done) {
    let session = driver.session()
    let query = "MATCH (u:User {email: $email})-[:belongsToUserGroup]->(ug) RETURN u,ug";
    let params = {
      email: username
    }
    let user = await session.writeTransaction(tx=>
      tx.run(query,params)
    )
    .then(result=> {
      session.close();
      let outputRecord = null;
      if (result.records.length>0) {
        let resultData = result.records[0].toObject();
        let userData = resultData.u;
        let userGroupData = resultData.ug;
        outputRecord = helpers.outputRecord(userData);
        outputRecord.usergroup = helpers.outputRecord(userGroupData);
      }
      return outputRecord;
    });
    if (user===null) {
      return done('Please provide a valid email address', false, { message: 'Please provide a valid email address' });
    }
    if (Object.entries(user.usergroup).length===0) {
      return done('The user is not assigned to a usergroup', false, { message: 'The user is not assigned to a usergroup' });
    }
    let newUser = new User(user);
    let validatePassword = await newUser.validatePassword(password);
    if (!validatePassword) {
      return done('Incorrect password.', false, { message: 'Incorrect password.' });
    }
    return done(null, newUser, {});
  }
);

const passportAdmin = new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  async function(username, password, done) {
    let session = driver.session();
    let query = "MATCH (u:User {email: $email})-[:belongsToUserGroup]->(ug) RETURN u,ug";
    let params = {
      email: username
    }
    let user = await session.writeTransaction(tx=>
      tx.run(query,params)
    )
    .then(result=> {
      session.close();
      let outputRecord = null;
      if (result.records.length>0) {
        let resultData = result.records[0].toObject();
        let userData = resultData.u;
        let userGroupData = resultData.ug;
        outputRecord = helpers.outputRecord(userData);
        outputRecord.usergroup = helpers.outputRecord(userGroupData);
      }
      return outputRecord;
    });
    if (user===null) {
      return done('Please provide a valid email address', false, { message: 'Please provide a valid email address' });
    }
    if (Object.entries(user.usergroup).length===0) {
      return done('The user is not assigned to a usergroup', false, { message: 'The user is not assigned to a usergroup' });
    }
    if (!user.usergroup.isAdmin) {
      return done('You are not authorised to access this page', false, { message: 'You are not authorised to access this page' });
    }
    let newUser = new User(user);
    let validatePassword = await newUser.validatePassword(password);
    if (!validatePassword) {
      return done('Incorrect password.', false, { message: 'Incorrect password.' });
    }
    return done(null, newUser, {});
  }
);

passport.use('local', passportLocal);
passport.use('admin', passportAdmin);

const loginUser = async (req, resp) => {
  let postData = req.body;
  if(!postData.email) {
    return resp.json({
      status: false,
      data: [],
      error: "Please enter a valid email address to continue",
      msg: "",
    });
  }

  if(!postData.password) {
    return resp.json({
      status: false,
      data: [],
      error: "Please enter your password to continue",
      msg: "",
    });
  }
  return passport.authenticate('local', { session: false }, (error, passportUser, info) => {
    if(error) {
      return resp.json({
        status: false,
        data: [],
        error: error,
        msg: "",
      });
    }

    if(passportUser) {
      const user = passportUser;
      user.token = passportUser.generateJWT();

      let returnUser = new UserClass(user._id, user.firstName, user.lastName, user.email, null, user.token);
      resp.json({
        status: true,
        data: returnUser,
        error: [],
        msg: "",
      });
    }
    if (!passportUser) {
      return resp.json({
        status: false,
        data: [],
        error: "The email/password you provided don't match with a user",
        msg: "",
      });
    }
  })(req, resp);
}

const loginAdmin = async (req, resp) => {
  let postData = req.body;
  if(!postData.email) {
    return resp.json({
      status: false,
      data: [],
      error: "Please enter a valid email address to continue",
      msg: "",
    });
  }

  if(!postData.password) {
    return resp.json({
      status: false,
      data: [],
      error: "Please enter your password to continue",
      msg: "",
    });
  }
  
  return passport.authenticate('admin', { session: false }, (error, passportUser, info) => {
    if(error) {
      return resp.json({
        status: false,
        data: [],
        error: error,
        msg: "",
      });
    }

    if(passportUser) {
      const user = passportUser;
      user.token = passportUser.generateJWT();
      delete user.password;
      resp.json({
        status: true,
        data: user,
        error: [],
        msg: "",
      });
    }
    if (!passportUser) {
      return resp.json({
        status: false,
        data: [],
        error: "The email/password you provided don't match with a user",
        msg: "",
      });
    }
  })(req, resp);
}

const registerUser = async (req, resp) => {
  let postData = req.body;
  let user = new UserClass();
  for (let key in postData) {
    if (postData[key]!==null) {
      user[key] = postData[key];
    }
  }
  let insertUserPromise = await user.insert();
  resp.json({
    status: true,
    data: insertUserPromise,
    error: [],
    msg: "",
  });
}

const activeSession = async (req, resp) => {
  let parameters = req.body;
  if (typeof parameters.token==="undefined" || parameters.token==="") {
    resp.json({
      status: false,
      data: [],
      error: true,
      msg: "Please provide a valid token to continue",
    });
  }
  else {
    let token = parameters.token;
    resp.json({
      status: true,
      data: token,
      error: false,
      msg: "Token successfully verified",
    });
  }
}

module.exports = {
  loginUser: loginUser,
  loginAdmin: loginAdmin,
  activeSession: activeSession,
  registerUser: registerUser,
  passportLocal: passportLocal
}
