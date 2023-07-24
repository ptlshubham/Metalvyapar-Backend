const express = require("express");
const router = express.Router();
const db = require("../db/db");
var crypto = require('crypto');
const jwt = require('jsonwebtoken');
var user;
const auth = () => {
    return (req, res, next) => {
        next()
    }
}
let secret = 'NexetgenMetals123';
//For buyer and seller login  
router.post('/UserLogin', (req, res, next) => {
    console.log("hello  im here");
    const body = req.body;
    var salt = '7fa73b47df808d36c5fe328546ddef8b9011b2c6';
    var repass = salt + '' + body.pass;
    var encPassword = crypto.createHash('sha1').update(repass).digest('hex');
    console.log(encPassword);
    db.executeSql("select * from user where Email='" +req.body.email + "' and Role='" + req.body.role + "';", function (data, err) {
        if (data.length > 0) {
            db.executeSql("select * from user where Email='" + req.body.email + "' and Password='" + encPassword + "'  and Role='" + req.body.role + "' ;", function (data, err) {
                // console.log(data);
                if (data.length > 0) {
                    if(data[0].IsSubscribe){
                        db.executeSql("select * from login_track where  IsLogin = true and Uid=" + data[0].Id + " order by CreatedDate DESC;", function (data12, err) {
                            if (err) {
                                console.log("papapapa-----" + err);
                            }
                            else {
                                if (data12.length > 0) {
                                    db.executeSql("update login_track set IsLogin=false where Id=" + data12[0].Id, function (da1, err) {
                                        if (err) { }
                                        else {
                                            db.executeSql("INSERT INTO `login_track`(`Uid`, `IsLogin`, `CreatedDate`) VALUES ('" + data[0].Id + "',true,'CURRENT_TIMESTAMP');", function (data1, err) {
                                                if (err) {
                                                    console.log("cdkjcdijid/////" + err);
                                                } else {
                                                    // console.log(data[0]);
                                                    let token = jwt.sign({ username: data[0].Email, password: data[0].Password, loginId: data1.insertId },
                                                        secret,
                                                        {
                                                            expiresIn: '1h' // expires in 24 hours
                                                        }
                                                    );
                                                    console.log(token)
                                                    db.executeSql("update login_track set Token='" + token + "' where Id=" + data1.insertId, function (da, err) {
                                                        if (err) {
                                                            console.log(err)
                                                        }
                                                        else {
                                                            module.exports.user = {
                                                                username: data[0].Email,
                                                                password: data[0].Password,
                                                                loginId: data1.insertId,
                                                                Uid: data[0].Id
                                                            }
                                                            console.log("token=", token);
                                                            data[0].token = token;
                                                            res.cookie('auth', token);
                                                            res.json(data);
                                                        }
                                                    })
    
                                                }
                                            })
                                        }
    
                                    })
                                }
                                else {
                                    db.executeSql("INSERT INTO `login_track`(`Uid`, `IsLogin`, `CreatedDate`) VALUES ('"+data[0].Id+"',true,'CURRENT_TIMESTAMP');", function (data1, err) {
                                        if (err) {
                                            console.log("cdkjcdijid/////" + err);
                                        } else {
                                            let token = jwt.sign({ username: data[0].Email, password: data[0].Password, loginId: data1.insertId },
                                                secret,
                                                {
                                                    expiresIn: '1h' // expires in 24 hours
                                                }
                                            );
                                            // console.log(token)
                                            db.executeSql("update login_track set Token='" + token + "' where Id=" + data1.insertId, function (da, err) {
                                                if (err) {
                                                    console.log(err)
                                                }
                                                else {
                                                    module.exports.user = {
                                                        username: data[0].Email,
                                                        password: data[0].Password,
                                                        loginId: data1.insertId,
                                                        Uid: data[0].id
                                                    }
                                                    console.log("token=", token);
                                                    data[0].token = token;
                                                    res.cookie('auth', token);
                                                    res.json(data);
                                                }
                                            })
    
                                        }
                                    })
                                }
                            }
                        })
                    }
                    else{
                        return res.json(5);
                    } 
                }
                else {
                    return res.json(2);
                }
            });
        }
        else {
            return res.json(1);
        }
    });
});

//For admin login
router.post('/adminLogin', (req, res, next) => {
    console.log("hello  im here admin");
    const body = req.body;
    var salt = '7fa73b47df808d36c5fe328546ddef8b9011b2c6';
    var repass = salt + '' + body.pass;
    var encPassword = crypto.createHash('sha1').update(repass).digest('hex');
    console.log(body);
    db.executeSql("select * from adminuser where email='" + body.email + "';", function (data, err) {
        console.log(data);
        if (data.length > 0) {
            db.executeSql("select * from adminuser where email='" + body.email + "' and password='" + encPassword + "';", function (data0, err) {
                console.log(data0);
                if (data0.length > 0) {
                    db.executeSql("select * from login_track_admin where  IsLogin = true and Uid="+data0[0].id+" order by CreatedDate DESC;", function (data12, err) {
                        if (err) {
                            console.log("papapapa-----" + err);
                        }
                        else {
                            if (data12.length > 0) {
                                db.executeSql("update login_track_admin set IsLogin=false;", function (da1, err) {
                                    if (err) { }
                                    else {
                                        db.executeSql("INSERT INTO login_track_admin(`Uid`, `IsLogin`, `CreatedDate`) VALUES ('" + data[0].id + "',true,'CURRENT_TIMESTAMP');", function (data1, err) {
                                            if (err) {
                                                console.log("cdkjcdijid/////" + err);
                                            } else {
                                                let token = jwt.sign({ username: data[0].email, password: data[0].password, loginId: data1.insertId },
                                                    secret,
                                                    {
                                                        expiresIn: '1h' // expires in 24 hours
                                                    }
                                                );
                                                console.log(token)
                                                db.executeSql("update login_track_admin set Token='"+token+"' where Id=" +data1.insertId, function (da, err) {
                                                    if (err) {
                                                        console.log(err)
                                                    }
                                                    else {
                                                        module.exports.admin = {
                                                            username: data[0].email,
                                                            password: data[0].password,
                                                            loginId: data1.insertId,
                                                            Uid: data[0].Id
                                                        }
                                                        console.log("token=", token);
                                                        data[0].token = token;
                                                        res.cookie('auth', token);
                                                        res.json(data);
                                                    }
                                                })

                                            }
                                        })
                                    }

                                })
                            }
                            else {
                                db.executeSql("INSERT INTO login_track_admin(`Uid`, `IsLogin`, `CreatedDate`) VALUES ('" + data[0].Id + "',true,'CURRENT_TIMESTAMP');", function (data1, err) {
                                    if (err) {
                                        console.log("cdkjcdijid/////" + err);
                                    } else {
                                        let token = jwt.sign({ username: data[0].Email, password: data[0].Password, loginId: data1.insertId },
                                            secret,
                                            {
                                                expiresIn: '1h' // expires in 24 hours
                                            }
                                        );
                                        // console.log(token)
                                        db.executeSql("update login_track_admin set Token='" + token + "' where Id=" + data1.insertId, function (da, err) {
                                            if (err) {
                                                console.log(err)
                                            }
                                            else {
                                                module.exports.admin = {
                                                    username: data[0].Email,
                                                    password: data[0].Password,
                                                    loginId: data1.insertId,
                                                    Uid: data[0].id

                                                }
                                                console.log("token=", token);
                                                data[0].token = token;
                                                res.cookie('auth', token);
                                                res.json(data);
                                            }
                                        })

                                    }
                                })
                            }
                        }
                    })
                }
                else {
                    return res.json(2);
                }
            });
        }
        else {
            return res.json(1);
        }
    });
});



module.exports = router;