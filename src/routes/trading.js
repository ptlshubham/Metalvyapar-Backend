const express = require("express");
const router = express.Router();
const db = require("../db/db");
const multer = require('multer');
const path = require('path');
const config = require("../../config");
var midway = require('./midway');
const jwt = require('jsonwebtoken');
var crypto = require('crypto');
const nodemailer = require('nodemailer');
var handlebars = require("handlebars");
const fs = require('fs');
const schedule = require('node-schedule');
const axios = require('axios');

var rule = new schedule.RecurrenceRule();
rule.minute = new schedule.Range(0, 59, 1);

let sellerTrade1='st.Id as SellerOrderId, st.OrderId, st.SubOrderId, st.SellerName, st.SellerId, st.SellerQuantity, st.DeliveryTerms, st.TradeStatus, st.BuyerCommisionPay, st.SellerCommisionPay, st.BuyerTotalQuantity, st.BuyerRemainQuantity, st.BuyerId, st.MaterialImage, st.RejectedMessage, st.TransportDetailStatus, st.SellerRemainQuantity, st.DispatchDate, st.CreatedDate as TradeCreatedDate, st.UpdatedDate as SellerUpdatedDate, st.IsDeleted, st.DeleteReason ';
let buyerTrade='bt.Id as BuyerTradeId, bt.OrderId, bt.BuyerName, bt.BuyerId, bt.BuyerQuantity, bt.RemainingQuantity, bt.BuyerRate, bt.PaymentTerms, bt.BuyerQuality, bt.PaymentDays, bt.PaymentValidity, bt.IsActive, bt.CreatedDate as OrderCreatDate, bt.UpdatedDate, bt.IsDeleted, bt.DeleteReason'
let address='a.street,a.city,a.state,a.pincode,a.landmark'; 
let transportTrade='tt.Id as TransportId, tt.OrderId as TradeId, tt.StartDate, tt.EndDate, tt.DriverContact, tt.VehicleNo, tt.WeightSlip, tt.InvoiceImage, tt.MaterialQuantity, tt.InvoiceAmount, tt.DeliveryReceipt, tt.DeliveryStatus, tt.DeliveryDate, tt.DispatchedDate, tt.UtrNo, tt.PaymentImage, tt.PaymentDate, tt.DueDate, tt.CreatedDate, tt.UpdatedDate'
let sellerTrade2='st.OrderId, st.SubOrderId, st.SellerName, st.SellerId, st.SellerQuantity, st.DeliveryTerms, st.TradeStatus, st.BuyerCommisionPay, st.SellerCommisionPay, st.BuyerTotalQuantity, st.BuyerRemainQuantity, st.BuyerId, st.MaterialImage, st.RejectedMessage, st.TransportDetailStatus, st.SellerRemainQuantity, st.DispatchDate, st.CreatedDate as TradeCreatedDate, st.UpdatedDate as SellerUpdatedDate, st.IsDeleted, st.DeleteReason ';

//Scheduler to delete otp after 10 minutes automatically
schedule.scheduleJob(rule, function () {
    var date_ob = new Date();
    var hours = date_ob.getHours();
    var minutes = date_ob.getMinutes();
    var seconds = date_ob.getSeconds();
    var dateTime = hours + ":" + minutes + ":" + seconds;
    db.executeSql("delete from otp where createdtime <='" + dateTime + "' ;", function (data, err) {
        if (err) {
            console.log(err)
        } else {
            // console.log("deleted");
        }
    })

});

//Scheduler to set buyer trade inactive based on validity
schedule.scheduleJob('0 0 * * *', function () {
    var yesterday = new Date();
    yesterday = yesterday.getUTCFullYear() + '-' + ('00' + (yesterday.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + yesterday.getUTCDate()).slice(-2);
    db.executeSql("update buyer_trade set IsActive=false where PaymentValidity <'" + yesterday + "' ;", function (data, err) {
        if (err) {
            console.log(err)
        } else {
            // console.log("deleted");
        }
    })

});
//TO send SMS
function sendSMS(numbers, message) {
    const URL = 'http://sms.hspsms.com/sendSMS';
    const apiKey = "b0bfc4b1-6f8a-432d-b49e-c06ced19e1f9";
    const senderName = "NXTMTL";
    const smsType = "TRANS";
    const username = "Sanchit Ishpunani";

    axios.get(URL, {
        params: {
            apikey: apiKey,
            numbers: numbers,
            message: JSON.stringify(message),
            sendername: senderName,
            smstype: smsType,
            username: username,
        }
    })
        .then(response => {
            console.log(response);
        })
        .catch(error => {
            console.log(error);
        });
}

//To send mail
function mail(filename, data, toemail, subj, mailname) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com',
        port: 465, // or the appropriate port number
        secure: false, // Set to true if using SSL/TLS
        auth: {
            user: 'support@metalvyapar.com',
            pass: 'Nextgen@123',
        },
    });
    const filePath = 'src/assets/email/' + filename;
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    const replacements = data;
    const htmlToSend = template(replacements);

    const mailOptions = {
        from: '"support@metalvyapar.com"',
        subject: subj,
        to: toemail,
        Name: mailname,
        html: htmlToSend,
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
            // res.json("Errror");
        } else {
            console.log('Email sent: ' + info.response);
            // res.json(data);
        }
    });
}

//To save buyer order in to buyertrade 
router.post("/newTradeRequest", midway.checkToken, (req, res, next) => {
    db.executeSql("INSERT INTO `buyer_trade`( `OrderId`, `BuyerName`, `BuyerId`, `BuyerQuantity`,`RemainingQuantity`, `BuyerRate`, `PaymentTerms`, `BuyerQuality`, `PaymentDays`, `PaymentValidity`,`CreatedDate`) VALUES (null,'" + req.body.buyerName + "'," + req.body.buyerId + ",'" + req.body.quantity + "','" + req.body.quantity + "','" + req.body.buyerRate + "','" + req.body.payment_terms + "','" + req.body.material_quality + "'," + req.body.payment_days + ",'" + req.body.payment_validity + "',CURRENT_TIMESTAMP);", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            let str = new Date();
            let dd = str.getDate();
            let mm = str.getMonth() + 1;
            let yyyy = str.getFullYear();
            let orderId = dd + '' + mm + '' + yyyy + data.insertId;
            db.executeSql("update buyer_trade set OrderId =" + orderId + " where Id=" + data.insertId, function (data1, err) {
                if (err) {
                    console.log(err)
                } else {
                    db.executeSql("select * from user where id='" + req.body.buyerId + "'", function (data1, err) {
                        if (err) {
                            console.log(err)
                        } else {
                            sendSMS(data1[0].Phone, "Dear Customer, Your new request for trade with Order ID " + orderId + " has been submitted. We will notify you when a seller responds to your request.\r\n-NXTMTL");
                        }
                    })
                    return res.json('success');
                }
            })

        }
    });
});

//To Save transport data to transport_trade
router.post("/SaveTransporterDetails", midway.checkToken, (req, res, next) => {
    console.log(req.body);
    db.executeSql("update seller_trade set SellerRemainQuantity=" + req.body[0].remainQtySeller + " where SubOrderId='" + req.body[0].subOrderId + "';", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            for (let i = 0; i < req.body.length; i++) {
                var yesterday = new Date();
                console.log(req.body[i].DeliveryTerms);
                yesterday.setDate(yesterday.getDate() + req.body[i].DeliveryTerms);
                yesterday = yesterday.getUTCFullYear() + '-' + ('00' + (yesterday.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + yesterday.getUTCDate()).slice(-2) + ' ' + ('00' + yesterday.getUTCHours()).slice(-2) + ':' + ('00' + yesterday.getUTCMinutes()).slice(-2) + ':' + ('00' + yesterday.getUTCSeconds()).slice(-2);
                console.log(yesterday);
                db.executeSql("INSERT INTO `transport_trade`(`orderId`, `startDate`, `driverContact`, `vehicleNo`, `weightSlip`,`invoiceImage`, `materialQuantity`, `invoiceAmount`, `deliveryStatus`,`DispatchedDate`,`UtrNo`,`CreatedDate`) VALUES ('" + req.body[i].subOrderId + "',CURRENT_TIMESTAMP," + req.body[i].transporterContact + ",'" + req.body[i].transportVehicle + "','" + req.body[i].transportImage + "','" + req.body[i].invoiceImage + "','" + req.body[i].materialQuantity + "'," + req.body[i].invoiceAmount + ",'" + req.body[i].deliveryStatus + "','" + yesterday + "',null,CURRENT_TIMESTAMP);", function (data, err) {
                    if (err) {
                        console.log(err);
                    } else {
                        if (i + 1 == req.body.length) {
                            return res.json('success');
                        }
                    }
                });
            }
        }
    });


});

//To save delivery receipt data from buyer when material received
router.post("/SaveDeliveryRecieptData", midway.checkToken, (req, res, next) => {
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() + req.body.PaymentDays);
    yesterday = yesterday.getUTCFullYear() + '-' + ('00' + (yesterday.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + yesterday.getUTCDate()).slice(-2) + ' ' + ('00' + yesterday.getUTCHours()).slice(-2) + ':' + ('00' + yesterday.getUTCMinutes()).slice(-2) + ':' + ('00' + yesterday.getUTCSeconds()).slice(-2);
    db.executeSql("UPDATE `transport_trade` set `EndDate`=CURRENT_TIMESTAMP,`DeliveryReceipt`='" + req.body.DeliveryReceipt + "',`DeliveryStatus`='Delivered',`DeliveryDate`=CURRENT_TIMESTAMP,`DueDate`='" + yesterday + "',`UpdatedDate`=CURRENT_TIMESTAMP WHERE Id=" + req.body.Id, function (data, err) {
        if (err) {
            console.log(err);
        } else {
            db.executeSql("update seller_trade set TransportDetailStatus=true where SubOrderId='" + req.body.OrderId + "'", function (data1, err) {
                if (err) {
                    console.log(err)
                } else {
                    return res.json('success');
                }
            })

        }
    })
});

//To save buyer payment data
router.post("/SaveBuyerPaymentDetails", midway.checkToken, (req, res, next) => {
    db.executeSql("UPDATE `transport_trade` set `UtrNo`='" + req.body.UtrNo + "',`PaymentImage`='" + req.body.paymentImage + "',`PaymentDate`=CURRENT_TIMESTAMP,`UpdatedDate`=CURRENT_TIMESTAMP WHERE Id=" + req.body.TransportId, function (data, err) {
        if (err) {
            console.log(err);
        } else {
            db.executeSql("select * from user where id='" + req.body.SellerId + "'", function (data1, err) {
                if (err) {
                    console.log(err)
                } else {
                    sendSMS(data1[0].Phone, "Dear Customer, This is to inform you that payment of Rs." + req.body.InvoiceAmount + " has been transferred to your account. Please login for more details.\r\n-NXTMTL");
                    db.executeSql("select * from seller_trade where SubOrderId='" + req.body.OrderId + "' ;", function (data1, err) {
                        if (err) { console.log(err) }
                        else {
                            // return res.json('success');
                            db.executeSql("select SUM(MaterialQuantity) as totalPaidQunty, COUNT(*) as totalPaymentCount from transport_trade where OrderId='" + req.body.OrderId + "' and UtrNo != 'NULL' ;", function (data2, err) {
                                if (err) { console.log(err) }
                                else {
                                    if (data1[0].SellerQuantity == data2[0].totalPaidQunty) {
                                        db.executeSql("update seller_trade set TradeStatus='Completed' where SubOrderId='" + req.body.OrderId + "';", function (data2, err) {
                                            if (err) { console.log(err) }
                                            else {
                                                db.executeSql("update buyer_trade set IsActive=false where OrderId=" + data1[0].OrderId, function (data3, err) {
                                                    if (err) { console.log(err) }
                                                    else {
                                                        return res.json('success');
                                                    }
                                                })
                                            }
                                        })
                                    } else {
                                        // return res.json('success');
                                        let sq = data1[0].SellerQuantity - data2[0].totalPaidQunty;
                                        db.executeSql("update seller_trade set SellerRemainQuantity=" + sq + " where SubOrderId='" + req.body.OrderId + "';", function (data2, err) {
                                            if (err) { console.log(err) }
                                            else {
                                                const date = new Date();
                                                const formatDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-');
                                                const replacement = {
                                                    PaymentDate: formatDate,
                                                    UtrNo: req.body.UtrNo,
                                                    BuyerName: req.body.BuyerName,
                                                    Amount: req.body.InvoiceAmount,
                                                };
                                                console.log(data1[0].SellerId, 'trial')
                                                if (data1[0].SellerId) {
                                                    db.executeSql("select * from user where Id=" + data1[0].SellerId, function (da1, err) {
                                                        if (err) {
                                                            console.log(err)
                                                        } else {
                                                            mail('Payment-confirmation-mail.html', replacement, da1[0].Email, "Payment Confirmation", "Payment has been confirmed.");
                                                            db.executeSql("select * from user where Id=" + data1[0].BuyerId, function (da2, err) {
                                                                if (err) {
                                                                    console.log(err)
                                                                } else {
                                                                    mail('Payment-confirmation-mail.html', replacement, da2[0].Email, "Payment Confirmation", "Payment has been confirmed.");
                                                                }
                                                            })
                                                        }
                                                    })
                                                }
                                            }
                                        })
                                        return res.json('success');
                                    }
                                }
                            })
                            // return res.json('success');
                        }
                    })
                }
            })
        }
    })
});

//To update password for buyer and seller
router.post("/updatePasswordAccordingRole", (req, res, next) => {
    console.log(req.body)
    var salt = '7fa73b47df808d36c5fe328546ddef8b9011b2c6';
    var repass = salt + '' + req.body.password;
    var encPassword = crypto.createHash('sha1').update(repass).digest('hex');
    db.executeSql("UPDATE user SET Password='" + encPassword + "' WHERE Id=" + req.body.id + ";", function (data, err) {
        if (err) {
            console.log("Error in store.js", err);
        } else {
            return res.json("sucess");
        }
    });
});

//To check current password for chnage password functionality
router.post("/CheckExistingPassword", (req, res, next) => {
    var salt = '7fa73b47df808d36c5fe328546ddef8b9011b2c6';
    var repass = salt + '' + req.body.enteredPassword;
    var encPassword = crypto.createHash('sha1').update(repass).digest('hex');
    if (encPassword == req.body.oldPassword) {
        res.json('sucess')
    } else {
        res.json('err');
    }
})

//To get user details based on user Id
router.get("/getUserDetailById/:id", midway.checkToken, (req, res, next) => {
    db.executeSql("SELECT u.Id as UserId,u.Salutation,u.FirstName,u.LastName,u.Phone,u.Email,u.Password,u.Role,u.CompanyName,u.Designation,u.AvgMonthTrade,u.GSTNo,u.CompanyContact,u.MaterialQuality,u.BankName,u.BankAccNo,u.AccType,u.AccHolderName,u.ISFCCode,u.BranchName,u.CancelCheque,u.PANCard,u.KYCStatus,u.KYCDate,a.street,a.city,a.state,a.pincode,a.landmark FROM `user` u LEFT join address a on u.Id=a.uid where u.Id=" + req.params.id, function (data, err) {
        if (err) {
            console.log(err)
        }
        else {
            data[0]
            res.json(data)
        }
    })
})

//To get transportation data based on trade id for seller
router.post("/GetTransporterDetailsbyIdForSeller", midway.checkToken, (req, res, next) => {
    db.executeSql("SELECT * FROM `transport_trade` WHERE OrderId='" + req.body.tradeId + "';", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json(data);
        }
    })
});

//To reject trade by buyer
router.post("/rejectTradeFromBuyer", midway.checkToken, (req, res, next) => {
    db.executeSql("UPDATE `seller_trade` set `TradeStatus`='Rejected',`RejectedMessage`='" + req.body.RejectMessage + "',`UpdatedDate`=CURRENT_TIMESTAMP WHERE SubOrderId='" + req.body.SubOrderId + "'", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            db.executeSql("select * from user where Id=" + req.body.SellerId, function (data1, err) {
                if (err) {
                    console.log(err);
                } else {
                    sendSMS(data1[0].Phone, "Dear Customer, Your request for Trade ID " + req.body.SubOrderId + " has been rejected. Please login to place new trade request.\r\n-NXTMTL");
                    return res.json('success');
                }
            })

        }
    })

});

//To get All response on order from seller 
router.post("/getAllSellerResponse", midway.checkToken, (req, res, next) => {
    db.executeSql("select "+sellerTrade2+",a.street,a.city,a.state,a.pincode,a.landmark,"+buyerTrade+",u.CompanyName as sellerCompanyName, bt.CreatedDate as TradeDate from seller_trade st left join address a on st.SellerId=a.uid left join buyer_trade bt on bt.OrderId = st.OrderId join user u on u.id=st.SellerId where st.OrderId=" + req.body.orderId + ";", function (data1, err) {
        if (err) {
            console.log(err)
        } else {
            res.json(data1);
        }
    })
})

//To get material images
router.get("/GetMaterialsImages/:id", midway.checkToken, (req, res, next) => {
    db.executeSql("SELECT * FROM materialimage WHERE tradeId='" + req.params.id + "'", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            return res.json(data);
        }
    })
});

//To get all active trade for buyer
router.post("/getAllActiveTradingDatabyIdForBuyer", midway.checkToken, (req, res, next) => {
    var date;
    date = new Date();
    date = date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2) + ' ';
    console.log(req.body);
    db.executeSql("select "+buyerTrade+" from buyer_trade bt  where  bt.BuyerId=" + req.body.uid + " and bt.IsActive=true and bt.PaymentValidity>='" + date + "';", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    db.executeSql("select  st.Id ,  "+sellerTrade2+",u.CompanyName as sellerCompanyName from seller_trade st join user u on st.SellerId=u.id where OrderId=" + data[i].OrderId, function (data1, err) {
                        if (err) {
                            console.log(err)
                        } else {
                            if (data1.length > 0) {
                                // data[i].push(data1[0]);
                                data[i].TotalResponse = data1.length;
                                if (i + 1 == data.length) {
                                    res.json(data);
                                }
                            }
                            else {
                                data[i].TotalResponse = 0;
                                if (i + 1 == data.length) {
                                    res.json(data);
                                }
                            }
                        }
                    })
                }
            } else {
                res.json(null);
            }
        }
    })
});

//To get all trading data for buyer
router.post("/getAllTradingDatabyIdForBuyer", midway.checkToken, (req, res, next) => {
    var date;
    date = new Date();
    date = date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2) + ' ';
    console.log(date);
    db.executeSql("select "+buyerTrade+" from buyer_trade bt  where  bt.BuyerId=" + req.body.uid + ";", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    db.executeSql("select  st.Id ,  "+sellerTrade2+",u.CompanyName as sellerCompanyName from seller_trade st join user u on st.SellerId=u.id where OrderId=" + data[i].OrderId + " and st.IsDeleted=false;", function (data1, err) {
                        if (err) {
                            console.log(err)
                        } else {
                            let totalSell = 0;
                            if (data1.length > 0) {
                                // data[i].push(data1[0]);
                                data[i].TotalResponse = data1.length;
                                data[i].TradeStatus = null
                                data1.forEach(element => {
                                    if (element.TradeStatus == 'Accepted' || element.TradeStatus == 'Rejected') {
                                        data[i].TradeStatus = element.TradeStatus;
                                        if (element.TradeStatus == 'Accepted') {
                                            data[i].TradeStatus = element.TradeStatus;
                                            // data[i].RemainingQuantity = data[i].BuyerQuantity - totalSell;
                                        } else {

                                        }
                                    }
                                });
                                if (i + 1 == data.length) {
                                    res.json(data);
                                }
                            }
                            else {
                                data[i].TotalResponse = 0;
                                data[i].TradeStatus = null;
                                if (i + 1 == data.length) {
                                    res.json(data);
                                }
                            }
                        }
                    })
                }
            }
        }
    })
});

//To get billing trade data for buyer
router.post("/getBillTradingDataForBuyer", midway.checkToken, (req, res, next) => {
    db.executeSql("select "+buyerTrade+",st.SellerName,u.CompanyName as sellerCompanyName from buyer_trade bt left join seller_trade st on bt.OrderId=st.OrderId left join user u on u.id = st.SellerId   where  bt.BuyerId=" + req.body.userId + " and st.TransportDetailStatus=true;", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    db.executeSql("SELECT st.Id , "+sellerTrade2+", tt.Id as TransportId, tt.OrderId, tt.StartDate, tt.EndDate, tt.DriverContact, tt.VehicleNo, tt.WeightSlip, tt.InvoiceImage, tt.MaterialQuantity, tt.InvoiceAmount, tt.DeliveryReceipt, tt.DeliveryStatus, tt.UtrNo, tt.PaymentImage, tt.PaymentDate, tt.DueDate, tt.CreatedDate, tt.UpdatedDate,"+address+" from seller_trade st left join transport_trade tt on st.SubOrderId = tt.OrderId left join address a on a.uid=st.SellerId WHERE st.OrderId=" + data[i].OrderId + " and st.TransportDetailStatus=true and tt.DeliveryStatus='Delivered'", function (data1, err) {
                        if (err) {
                            console.log(err)
                        } else {
                            if (data1.length > 1) {
                                // data[i].push(data1[0]);
                                data[i].TotalResponse = data1.length;
                                data[i].TrasnportDetail = data1
                                data[i].TradeStatus = null;
                                let totalSell = 0;
                                data1.forEach(element => {
                                    totalSell = totalSell + element.SellerQuantity;
                                    if (element.TradeStatus == 'Accepted') {
                                        data[i].TradeStatus = element.TradeStatus;
                                    }
                                });
                                data[i].RemainingQuantity = data[i].BuyerQuantity - totalSell;
                                if ((i + 1) == data.length) {
                                    console.log("222222");
                                    res.json(data);
                                }
                            }
                            else if (data1.length == 1) {
                                data[i].TotalResponse = data1.length;
                                data[i].TrasnportDetail = data1
                                data[i].TradeStatus = null;
                                let totalSell = 0;
                                data1.forEach(element => {
                                    totalSell = totalSell + element.SellerQuantity;
                                    if (element.TradeStatus == 'Accepted') {
                                        data[i].TradeStatus = element.TradeStatus;
                                        data[i].RemainingQuantity = data[i].BuyerQuantity - totalSell;
                                    }
                                });

                                if ((i + 1) == data.length) {
                                    console.log("1111111");
                                    res.json(data);
                                }
                            }
                            else {
                                data[i].TotalResponse = 0;
                                data[i].RemainingQuantity = data[i].BuyerQuantity;
                                if (i + 1 == data.length) {
                                    res.json(data);
                                }
                            }
                        }
                    })
                }
            }
        }
    })
});

//To get billing data for seller
router.post("/getBillTradingDataForSeller", midway.checkToken, (req, res, next) => {
    db.executeSql("SELECT st.Id , "+sellerTrade2+", tt.Id as TransportId, tt.OrderId, tt.StartDate, tt.EndDate, tt.DriverContact, tt.VehicleNo, tt.WeightSlip, tt.InvoiceImage, tt.MaterialQuantity, tt.InvoiceAmount, tt.DeliveryReceipt, tt.DeliveryStatus, tt.UtrNo, tt.PaymentImage, tt.PaymentDate, tt.DueDate, tt.CreatedDate, tt.UpdatedDate ,u.FirstName as BuyerFirstName,u.LastName as BuyerLastName,u.CompanyName,"+address+",bt.BuyerQuality from seller_trade st left join transport_trade tt on st.SubOrderId = tt.OrderId left join user u on st.BuyerId=u.Id left join address a on a.uid=st.BuyerId join buyer_trade bt on bt.OrderId = st.OrderId WHERE st.SellerId=" + req.body.userId + " and st.TransportDetailStatus=true and tt.DeliveryStatus='Delivered' group by st.SubOrderId", function (data1, err) {
        if (err) {
            console.log(err)
        } else {
            if (data1.length > 0) {
                res.json(data1);
            }
        }
    })
});

//Get all trading data for seller
router.post("/getAllTradingDatabyIdForSeller", midway.checkToken, (req, res, next) => {
    db.executeSql("select "+sellerTrade2+","+address+",u.FirstName as BuyerFirstName,u.LastName as BuyerLastName,u.CompanyName,u.CompanyName as BuyerCompanyName,"+buyerTrade+",bt.CreatedDate as OrderCreatDate from seller_trade st left join user u on st.BuyerId = u.Id left join address a on st.buyerId = a.uid left join buyer_trade bt on st.OrderId=bt.OrderId where st.sellerId="+req.body.uid+";", function (data, err) {
        if (err) {
            console.log(err)
        } else {
            res.json(data);
        }
    })
});

//To save seller trade request
router.post("/saveSellerTradeRequest", midway.checkToken, (req, res, next) => {
    console.log(req.body)
    db.executeSql("SELECT COUNT(*) as totalTradeBySeller FROM seller_trade where OrderId=" + req.body.OrderId + " ", function (data, err) {
        if (err) {
            console.log(err)
        } else {
            let test = data[0].totalTradeBySeller + 1
            let subOrderId = req.body.OrderId + '-' + test;
            var yesterday = new Date();
            yesterday.setDate(yesterday.getDate() + req.body.diliveryTerms);
            yesterday = yesterday.getUTCFullYear() + '-' + ('00' + (yesterday.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + yesterday.getUTCDate()).slice(-2) + ' ' + ('00' + yesterday.getUTCHours()).slice(-2) + ':' + ('00' + yesterday.getUTCMinutes()).slice(-2) + ':' + ('00' + yesterday.getUTCSeconds()).slice(-2);
            console.log(yesterday);
            console.log("yesterday CHDIH JDIOJFIOD ");
            db.executeSql("INSERT INTO `seller_trade`( `OrderId`, `SubOrderId`, `SellerName`, `SellerId`, `SellerQuantity`, `DeliveryTerms`, `TradeStatus`,`BuyerTotalQuantity`, `BuyerRemainQuantity`, `BuyerId`,`MaterialImage`,`SellerCommisionPay`,`DispatchDate`,`CreatedDate`) VALUES (" + req.body.OrderId + ",'" + subOrderId + "','" + req.body.sellerName + "'," + req.body.sellerId + ",'" + req.body.sell_quantity + "','" + req.body.diliveryTerms + "','Pending'," + req.body.BuyerQuantity + "," + (req.body.BuyerQuantity - req.body.sell_quantity) + "," + req.body.BuyerId + ",'" + req.body.materialImage + "','" + req.body.sell_quantity + "','" + yesterday + "',CURRENT_TIMESTAMP);", function (data1, err) {
                if (err) {
                    console.log(err)
                } else {

                    if (req.body.materialMultiImage.length > 0) {
                        for (let i = 0; i < req.body.materialMultiImage.length; i++) {
                            db.executeSql("INSERT INTO `materialimage`(`tradeId`, `image`) VALUES ('" + subOrderId + "','" + req.body.materialMultiImage[i] + "');", function (data1, err) {
                                if (err) {
                                    res.json("error");
                                } else {
                                    if (i == (req.body.materialMultiImage.length - 1)) {
                                        res.json('success')
                                    }
                                }
                            });
                        }
                    } else {
                        db.executeSql("select * from user where id='" + req.body.userId + "'", function (data2, err) {
                            if (err) {
                                console.log(err)
                            } else {
                                // For Seller SMS
                                sendSMS(data2[0].Phone, "Dear Customer, Your request for trade with Trade ID " + subOrderId + " has been submitted. We will update you once it is approved.\r\n-NXTMTL");
                                db.executeSql("select * from user where id='" + req.body.BuyerId + "'", function (data4, err) {
                                    if (err) {
                                        console.log(err)
                                    } else {
                                        // For Buyer SMS
                                        sendSMS(data4[0].Phone, "Dear Customer, You have received a response for your Order ID " + req.body.OrderId + ". Please review it on the website.\r\n-NXTMTL");
                                    }
                                })
                            }
                        })
                        res.json('success')
                    }
                }
            })
        }
    })
})

//Get new trading request for seller based on their preffered quality
router.post("/getNewTradingReqForSeller", midway.checkToken, (req, res, next) => {
    let myArray = req.body.mat_qlty.split(',');
    console.log(myArray);
    var date;
    date = new Date();
    date = date.getUTCFullYear() + '-' + ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + date.getUTCDate()).slice(-2);
    if (myArray[0] == 'Select All') {
        db.executeSql("SELECT  u.FirstName as buyFirstName,u.CompanyName, u.LastName as buyLastName,"+buyerTrade+","+address+" from buyer_trade bt join user u on u.Id = bt.BuyerId join address a on a.uid = bt.BuyerId where   (bt.BuyerQuality='HR-CR (Low Carbon)' OR bt.BuyerQuality='HR-CR (High Carbon)' OR bt.BuyerQuality='Melting' OR bt.BuyerQuality='Piece to piece' OR bt.BuyerQuality='Turning' OR bt.BuyerQuality='Turning Bundle' ) and bt.BuyerQuantity >0 and bt.RemainingQuantity >'0' and bt.IsActive=true;", function (data, err) {
            if (err) {
                console.log(err);
            } else {
                res.json(data);
            }
        })
    }

    if (myArray.length == 1) {
        db.executeSql("SELECT  u.FirstName as buyFirstName,u.CompanyName, u.LastName as buyLastName,"+buyerTrade+","+address+" from buyer_trade bt join user u on u.Id = bt.BuyerId join address a on a.uid = bt.BuyerId where  bt.BuyerQuality='" + myArray[0] + "'and bt.PaymentValidity >='" + date + "' and bt.RemainingQuantity >'0'  and bt.IsActive=true;", function (data, err) {
            if (err) {
                console.log(err);
            } else {
                res.json(data);
            }
        })
    }
    else if (myArray.length == 2) {
        db.executeSql("SELECT  u.FirstName as buyFirstName,u.CompanyName, u.LastName as buyLastName,"+buyerTrade+","+address+" from buyer_trade bt join user u on u.Id = bt.BuyerId join address a on a.uid = bt.BuyerId where  (bt.BuyerQuality='" + myArray[0] + "' OR bt.BuyerQuality='" + myArray[1] + "') and bt.PaymentValidity >='" + date + "' and bt.RemainingQuantity >'0' and bt.IsActive=true;", function (data, err) {
            if (err) {
                console.log(err);
            } else {
                res.json(data);
            }
        })
    }
    else if (myArray.length == 3) {
        db.executeSql("SELECT  u.FirstName as buyFirstName,u.CompanyName, u.LastName as buyLastName,"+buyerTrade+","+address+" from buyer_trade bt join user u on u.Id = bt.BuyerId join address a on a.uid = bt.BuyerId where   (bt.BuyerQuality='" + myArray[0] + "' OR bt.BuyerQuality='" + myArray[1] + "' OR bt.BuyerQuality='" + myArray[2] + "') and bt.PaymentValidity >='" + date + "' and bt.RemainingQuantity >'0' and bt.IsActive=true;", function (data, err) {
            if (err) {
                console.log(err);
            } else {
                res.json(data);
            }
        })
    }
    else if (myArray.length == 4) {
        db.executeSql("SELECT  u.FirstName as buyFirstName,u.CompanyName, u.LastName as buyLastName,"+buyerTrade+","+address+" from buyer_trade bt join user u on u.Id = bt.BuyerId join address a on a.uid = bt.BuyerId where   (bt.BuyerQuality='" + myArray[0] + "' OR bt.BuyerQuality='" + myArray[1] + "' OR bt.BuyerQuality='" + myArray[2] + "' OR bt.BuyerQuality='" + myArray[3] + "') and bt.PaymentValidity >='" + date + "' and bt.RemainingQuantity >'0' and bt.IsActive=true;", function (data, err) {
            if (err) {
                console.log(err);
            } else {
                res.json(data);
            }
        })
    }
    else if (myArray.length == 5) {
        db.executeSql("SELECT  u.FirstName as buyFirstName,u.CompanyName, u.LastName as buyLastName,"+buyerTrade+","+address+" from buyer_trade bt join user u on u.Id = bt.BuyerId join address a on a.uid = bt.BuyerId where   (bt.BuyerQuality='" + myArray[0] + "' OR bt.BuyerQuality='" + myArray[1] + "' OR bt.BuyerQuality='" + myArray[2] + "' OR bt.BuyerQuality='" + myArray[3] + "'  OR bt.BuyerQuality='" + myArray[4] + "') and bt.PaymentValidity >='" + date + "' and bt.RemainingQuantity >'0'  and bt.IsActive=true;", function (data, err) {
            if (err) {
                console.log(err);
            } else {
                res.json(data);
            }
        })
    }
    else if (myArray.length == 6) {
        db.executeSql("SELECT  u.FirstName as buyFirstName,u.CompanyName, u.LastName as buyLastName,"+buyerTrade+","+address+" from buyer_trade bt join user u on u.Id = bt.BuyerId join address a on a.uid = bt.BuyerId where   (bt.BuyerQuality='" + myArray[0] + "' OR bt.BuyerQuality='" + myArray[1] + "' OR bt.BuyerQuality='" + myArray[2] + "' OR bt.BuyerQuality='" + myArray[3] + "'  OR bt.BuyerQuality='" + myArray[4] + "' OR bt.BuyerQuality='" + myArray[5] + "') and bt.PaymentValidity >='" + date + "' and bt.RemainingQuantity >'0'  and bt.IsActive=true;", function (data, err) {
            if (err) {
                console.log(err);
            } else {
                console.log(data);
                res.json(data);
            }
        })
    }

});

//To get material quality for buyer to display in new trade request drop down
router.post("/getQualityListBuyer", midway.checkToken, (req, res, next) => {
    db.executeSql("select MaterialQuality from user where Id=" + req.body.buyerId, function (data, err) {
        if (err) {
            console.log(err)
        } else {
            res.json(data)
        }
    })
})

//To get upcoming delivery for buyer
router.post("/getUpcomingDeliveryBuyer", midway.checkToken, (req, res, next) => {
    var date = new Date();
    date = date.getUTCFullYear() + '-' + ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + date.getUTCDate()).slice(-2);
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() + 4)
    yesterday = yesterday.getUTCFullYear() + '-' + ('00' + (yesterday.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + yesterday.getUTCDate()).slice(-2);
    db.executeSql("SELECT "+sellerTrade2+", bt.BuyerName FROM seller_trade st join buyer_trade bt on bt.OrderId= st.OrderId where st.BuyerId=" + req.body.buyerId + " and  st.DispatchDate <='" + yesterday + "' and st.TradeStatus ='Accepted' ;", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json(data);
        }
    })
})

//To delete order  by buyer
router.post("/deleteBuyerTrade", midway.checkToken, (req, res, next) => {
    db.executeSql("update buyer_trade set IsActive=false,IsDeleted=true,DeleteReason='"+req.body.msg+"' where OrderId="+req.body.OrderId, function(data, err) {
        if(err) {
            res.json('err')
        }else{
           db.executeSql("update seller_trade set  IsDeleted=true,DeleteReason='Buyer deleted order',TradeStatus='Deleted' where OrderId="+req.body.OrderId, function(data1, err){
            if(err) {
                res.json('err');
            }
            else{ 
                res.json('sucess');
            }
           })
        }
    })
});

//To delete trade by seller
router.post("/deleteSellerTrade", midway.checkToken, (req, res, next) => {
    console.log(req.body)
    db.executeSql("update seller_trade set IsDeleted=true,DeleteReason='" + req.body.msg + "', TradeStatus='Deleted' where SubOrderId='" + req.body.OrderId + "';", function (data, err) {
        (err) ? res.json('err') : res.json('sucess')
    })
});

//To get upcoming payment for buyer
router.post("/getUpcomingPaymentBuyer", midway.checkToken, (req, res, next) => {
    var date = new Date();
    date = date.getUTCFullYear() + '-' + ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + date.getUTCDate()).slice(-2);
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() + 4)
    yesterday = yesterday.getUTCFullYear() + '-' + ('00' + (yesterday.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + yesterday.getUTCDate()).slice(-2);
    db.executeSql("SELECT "+transportTrade+","+sellerTrade2+", bt.BuyerName FROM transport_trade tt join seller_trade st on tt.OrderId=st.SubOrderId join buyer_trade bt on bt.OrderId= st.OrderId where st.BuyerId=" + req.body.buyerId + " and tt.DueDate <='" + yesterday + "'  and tt.UtrNo Is null and tt.DeliveryStatus='Delivered';;", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json(data);
        }
    })
});

//To get all trades to show on dashboard for buyer
router.post("/GetAllTradeForDashboardBuyer", midway.checkToken, (req, res, next) => {
    db.executeSql("SELECT "+sellerTrade1+", "+buyerTrade+",a.street as SellerStreet,a.city as SellerCity,a.state as SellerState,a.pincode as SellerPincode,a.landmark as SellerLandmark FROM seller_trade st join buyer_trade bt on st.OrderId=bt.OrderId join address a on a.uid = st.SellerId where st.BuyerId=" + req.body.buyerId + " and (st.TradeStatus='Completed' || st.TradeStatus='Rejected')", function (data, err) {
        if (err) {
            console.log(err)
        }
        else {
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    db.executeSql("select * from address where uid=" + data[i].BuyerId, function (data1, err) {
                        if (err) {
                            console.log(err)
                        } else {
                            data[i].BuyerStreet = data1[0].street;
                            data[i].BuyerCity = data1[0].city;
                            data[i].BuyerState = data1[0].state;
                            data[i].BuyerPincode = data1[0].pincode;
                            data[i].BuyerLandmark = data1[0].landmark;
                            if (i == (data.length - 1)) {
                                console.log(data)
                                res.json(data);
                            }
                        }
                    })

                }
            }
            // res.json(data);
        }
    })
})

//To get all trades to show on dashboard for seller
router.post("/GetAllTradeForDashboardSeller", midway.checkToken, (req, res, next) => {
    db.executeSql("SELECT "+sellerTrade1+","+buyerTrade+",a.street as SellerStreet,a.city as SellerCity,a.state as SellerState,a.pincode as SellerPincode,a.landmark as SellerLandmark FROM seller_trade st join buyer_trade bt on st.OrderId=bt.OrderId join address a on a.uid = st.SellerId where st.SellerId=" + req.body.sellerId + " and (st.TradeStatus='Completed' OR st.TradeStatus='Rejected')", function (data, err) {
        if (err) {
            console.log(err)
        }
        else {
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    db.executeSql("select * from address where uid=" + data[i].BuyerId, function (data1, err) {
                        if (err) {
                            console.log(err)
                        } else {
                            data[i].BuyerStreet = data1[0].street;
                            data[i].BuyerCity = data1[0].city;
                            data[i].BuyerState = data1[0].state;
                            data[i].BuyerPincode = data1[0].pincode;
                            data[i].BuyerLandmark = data1[0].landmark;
                            if (i == (data.length - 1)) {
                                console.log(data)
                                res.json(data);
                            }
                        }
                    })

                }
            }
            // res.json(data);
        }
    })
})

//To get upcoming delivery for seller
router.post("/getUpcomingDeliverySeller", midway.checkToken, (req, res, next) => {
    var date = new Date();
    date = date.getUTCFullYear() + '-' + ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + date.getUTCDate()).slice(-2);
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() + 4)
    yesterday = yesterday.getUTCFullYear() + '-' + ('00' + (yesterday.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + yesterday.getUTCDate()).slice(-2);
    db.executeSql("SELECT "+sellerTrade2+", bt.BuyerName FROM seller_trade st join buyer_trade bt on bt.OrderId= st.OrderId where st.SellerId=" + req.body.sellerId + " and  st.DispatchDate <='" + yesterday + "' and st.TradeStatus='Accepted';", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json(data);
        }
    })
})

//To get upcoming payment data for seller
router.post("/getUpcomingPaymentSeller", midway.checkToken, (req, res, next) => {
    var date = new Date();
    date = date.getUTCFullYear() + '-' + ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + date.getUTCDate()).slice(-2);
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() + 4)
    yesterday = yesterday.getUTCFullYear() + '-' + ('00' + (yesterday.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + yesterday.getUTCDate()).slice(-2);
    db.executeSql("SELECT "+transportTrade+","+sellerTrade2+", bt.BuyerName FROM transport_trade tt join seller_trade st on tt.OrderId=st.SubOrderId join buyer_trade bt on bt.OrderId= st.OrderId where st.SellerId=" + req.body.sellerId + " and  tt.DueDate <='" + yesterday + "' and tt.UtrNo Is null and tt.DeliveryStatus='Delivered';", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json(data);
        }
    })
});

//To upload multiple material image 
router.post("/UploadMaterialMultiImage", midway.checkToken, (req, res, next) => {
    var imgname = generateUUID();
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'images/material-multi');
        },
        // By default, multer removes file extensions so let's add them back
        filename: function (req, file, cb) {

            cb(null, imgname + path.extname(file.originalname));
        }
    });
    let upload = multer({ storage: storage }).single('file');
    upload(req, res, function (err) {
        console.log("path=", config.url + 'images/material-multi/' + req.file.filename);

        if (req.fileValidationError) {
            console.log("err1", req.fileValidationError);
            return res.json("err1", req.fileValidationError);
        } else if (!req.file) {
            console.log('Please select an image to upload');
            return res.json('Please select an image to upload');
        } else if (err instanceof multer.MulterError) {
            console.log("err3");
            return res.json("err3", err);
        } else if (err) {
            console.log("err4");
            return res.json("err4", err);
        }
        return res.json('/images/material-multi/' + req.file.filename);


    });
});

//To upload material image 
router.post("/UploadMaterialImage", midway.checkToken, (req, res, next) => {
    var imgname = generateUUID();

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'images/material');
        },
        // By default, multer removes file extensions so let's add them back
        filename: function (req, file, cb) {

            cb(null, imgname + path.extname(file.originalname));
        }
    });
    let upload = multer({ storage: storage }).single('file');
    upload(req, res, function (err) {
        console.log("path=", config.url + 'images/material/' + req.file.filename);

        if (req.fileValidationError) {
            console.log("err1", req.fileValidationError);
            return res.json("err1", req.fileValidationError);
        } else if (!req.file) {
            console.log('Please select an image to upload');
            return res.json('Please select an image to upload');
        } else if (err instanceof multer.MulterError) {
            console.log("err3");
            return res.json("err3", err);
        } else if (err) {
            console.log("err4");
            return res.json("err4", err);
        }
        return res.json('/images/material/' + req.file.filename);


    });
});


//To update commision payment by buyer
router.post("/NewComissionPaymentForBuyer", midway.checkToken, (req, res, next) => {
    let date = new Date();
    let mnth = date.getMonth() + 1;
    console.log(req.body);
    db.executeSql("UPDATE `seller_trade` set `TradeStatus`='Accepted',`BuyerCommisionPay`=true,`UpdatedDate`=CURRENT_TIMESTAMP WHERE SubOrderId='" + req.body.SubOrderId + "'", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            let newRemain = req.body.RemainingQuantity - req.body.SellerQuantity;
            db.executeSql("insert into `buyer_commision`( `BuyerId`, `ComissionAmount`, `TradeId`, `CreatedDate`,`Month`) VALUES (" + req.body.BuyerId + ",'" + req.body.TotalCommision + "','" + req.body.SubOrderId + "',CURRENT_TIMESTAMP," + mnth + ");", function (data, err) {
                if (err) {
                    console.log(err);
                }
                else {
                }
            })

            if (newRemain == 0) {
                db.executeSql("update buyer_trade set RemainingQuantity='" + newRemain + "', IsActive=false  where OrderId=" + req.body.OrderId, function (data3, err) {
                    if (err) {
                        console.log(err)
                    } else {

                    }
                })
            } else {
                db.executeSql("update buyer_trade set RemainingQuantity='" + newRemain + "'  where OrderId=" + req.body.OrderId, function (data3, err) {
                    if (err) {
                        console.log(err)
                    } else {

                    }
                })
            }
            const date = new Date(req.body.TradeDate);
            const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-');

            const replacement = {
                Date: formattedDate,
                TradeID: req.body.SubOrderId,
                BuyerName: req.body.CompanyName,
                SellerName: req.body.SellerName,
                Quality: req.body.BuyerQuality,
                Quantity: req.body.SellerQuantity,
                Rate: req.body.BuyerRate,
                DeliveryTerms: req.body.DeliveryTerms,
                PaymentTerms: req.body.PaymentDays,
            };
            db.executeSql("select * from user where Id=" + req.body.SellerId, function (da1, err) {
                if (err) {
                    console.log(err)
                } else {
                    sendSMS(da1[0].Phone, "Dear Customer, Your order is confirmed. Confirmation letter for Trade ID " + req.body.SubOrderId + " has been sent on your email.\r\n-NXTMTL");
                    mail('Order-confirmation-mail.html', replacement, req.body.BuyerEmail, "Order Confirmation", "Order has been confirmed.");
                    mail('Order-confirmation-mail.html', replacement, da1[0].Email, "Order Confirmation", "Order has been confirmed.");
                    db.executeSql("select * from user where id='" + req.body.BuyerId + "'", function (data4, err) {
                        if (err) {
                            console.log(err)
                        } else {
                            // For Buyer SMS
                            sendSMS(data4[0].Phone, "Dear Customer, Your order is confirmed. Confirmation letter for Trade ID " + req.body.SubOrderId + " has been sent on your email.\r\n-NXTMTL");
                        }
                    })
                    res.json('success');
                }
            })
        }
    })
    // res.json('success');


})

//To update commision payment by seller
router.post("/NewComissionPaymentForSeller", midway.checkToken, (req, res, next) => {
    db.executeSql("UPDATE `trades` set `sellerComissionPay`=true,`updatedDate`=CURRENT_TIMESTAMP WHERE id=" + req.body.tradeId, function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json('success');
        }
    })
})

//To upload weight slip image
router.post("/UploadWeightSlipImage", midway.checkToken, (req, res, next) => {
    var imgname = generateUUID();

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'images/weight');
        },
        // By default, multer removes file extensions so let's add them back
        filename: function (req, file, cb) {

            cb(null, imgname + path.extname(file.originalname));
        }
    });
    let upload = multer({ storage: storage }).single('file');
    upload(req, res, function (err) {
        console.log("path=", config.url + 'images/weight/' + req.file.filename);

        if (req.fileValidationError) {
            console.log("err1", req.fileValidationError);
            return res.json("err1", req.fileValidationError);
        } else if (!req.file) {
            console.log('Please select an image to upload');
            return res.json('Please select an image to upload');
        } else if (err instanceof multer.MulterError) {
            console.log("err3");
            return res.json("err3", err);
        } else if (err) {
            console.log("err4");
            return res.json("err4", err);
        }
        return res.json('/images/weight/' + req.file.filename);


    });
});

//To upload invoice image
router.post("/InvoiceRecieptImageUpload", midway.checkToken, (req, res, next) => {
    var imgname = generateUUID();
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'images/invoice');
        },
        // By default, multer removes file extensions so let's add them back
        filename: function (req, file, cb) {
            cb(null, imgname + path.extname(file.originalname));
        }
    });
    let upload = multer({
        storage: storage,
        fileFilter: function (req, file, cb) {
            if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'application/pdf') {
                cb(null, true);
            } else {
                cb(new Error('Only JPEG, PNG, and PDF file types are allowed'));
            }
        }
    }).single('file');

    upload(req, res, function (err) {
        console.log("path=", config.url + 'images/invoice/' + req.file.filename);
        if (req.fileValidationError) {
            console.log("err1", req.fileValidationError);
            return res.json("err1", req.fileValidationError);
        } else if (!req.file) {
            console.log('Please select an image or PDF file to upload');
            return res.json('Please select an image or PDF file to upload');
        } else if (err instanceof multer.MulterError) {
            console.log("err3", err);
            return res.json("err3", err);
        } else if (err) {
            console.log("err4", err);
            return res.json("err4", err);
        }
        return res.json('/images/invoice/' + req.file.filename);


    });
});

//To upload delivery receipt image
router.post("/UploadDeliveryRecieptImage", midway.checkToken, (req, res, next) => {
    var imgname = generateUUID();
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'images/delivery-reciept');
        },
        // By default, multer removes file extensions so let's add them back
        filename: function (req, file, cb) {
            cb(null, imgname + path.extname(file.originalname));
        }
    });
    let upload = multer({ storage: storage }).single('file');
    upload(req, res, function (err) {
        console.log("path=", config.url + 'images/delivery-reciept/' + req.file.filename);
        if (req.fileValidationError) {
            console.log("err1", req.fileValidationError);
            return res.json("err1", req.fileValidationError);
        } else if (!req.file) {
            console.log('Please select an image to upload');
            return res.json('Please select an image to upload');
        } else if (err instanceof multer.MulterError) {
            console.log("err3");
            return res.json("err3", err);
        } else if (err) {
            console.log("err4");
            return res.json("err4", err);
        }
        return res.json('/images/delivery-reciept/' + req.file.filename);


    });
});

//To upload payment slip image
router.post("/UploadPaymentSlipImage", midway.checkToken, (req, res, next) => {
    var imgname = generateUUID();
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'images/payment');
        },
        // By default, multer removes file extensions so let's add them back
        filename: function (req, file, cb) {
            cb(null, imgname + path.extname(file.originalname));
        }
    });
    let upload = multer({ storage: storage }).single('file');
    upload(req, res, function (err) {
        console.log("path=", config.url + 'images/payment/' + req.file.filename);

        if (req.fileValidationError) {
            console.log("err1", req.fileValidationError);
            return res.json("err1", req.fileValidationError);
        } else if (!req.file) {
            console.log('Please select an image to upload');
            return res.json('Please select an image to upload');
        } else if (err instanceof multer.MulterError) {
            console.log("err3");
            return res.json("err3", err);
        } else if (err) {
            console.log("err4");
            return res.json("err4", err);
        }
        return res.json('/images/payment/' + req.file.filename);
    });
});

//To generate unique id for image name 
function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });

    return uuid;
}


module.exports = router;