let jwt = require('jsonwebtoken');
// const config = require('./config.js');
let admin = require('./authenticate');
const db = require("../db/db");

//To validate admin authentication token
let checkTokenAdmin = (req, res, next) => {
  let token = req.headers['x-access-token'] || req.headers['authorization']; // Express headers are auto converted to lowercase
  if (token) {
    jwt.verify(token, 'NexetgenMetals123', (err, decoded) => {
      if (err) {
        console.log("erroe here");
        //  res.json({ status: 401, error: { message: 'Unauthorised' } });
        let err = new Error('unautherize');
        err.status = 401;
        throw err;
      }
      else {
        if (admin.admin != undefined) {
          if ((admin.admin.username == decoded.username) && (admin.admin.password == decoded.password)) {
            db.executeSql("select * from login_track_admin where Id=" + decoded.loginId, function (data, err) {
              if (err) {
                console.log( err);
              }
              else {
                if (data.length > 0) {
                  console.log("asasasaADA");
                  req.decoded = decoded;
                  next();
                }
                else {
                  console.log("aaaaADA")
                  let err = new Error('unautherize');
                  err.status = 401;
                  res.status(err.status || 500);
                  res.json({
                    error: {
                      status: 401,
                      massage: err.message
                    }
                  });
                }
              }
            })
          }
          else {
            console.log("bbbbADA")
            let err = new Error('unautherize');
            err.status = 401;
            res.status(err.status || 500);
            res.json({
              error: {
                status: 401,
                massage: err.message
              }
            });
          }
        }
        else {
          console.log("dddddADA")
          let err = new Error('unautherize');
          err.status = 401;
          res.status(err.status || 500);
          res.json({
            error: {
              status: 401,
              massage: err.message
            }
          });
        }
      }
    });
  } else {
    console.log("erroe here123");
    let err = new Error('noToken');
    err.status = 111;
    throw err;
  }
};

module.exports = {
    checkTokenAdmin: checkTokenAdmin
}