const express = require("express");
const router = express.Router();
const db = require("../db/db");
const multer = require('multer');
const path = require('path');
const config = require("../../config");
var midway = require('../routes/adminmidway');
const jwt = require('jsonwebtoken');
var crypto = require('crypto');
const nodemailer = require('nodemailer');
var handlebars = require("handlebars");
const fs = require('fs');
const schedule = require('node-schedule');
// import node-fetch
const axios = require('axios');
const { json } = require("body-parser");

let sellerTrade='st.Id as SellerOrderId, st.OrderId, st.SubOrderId, st.SellerName, st.SellerId, st.SellerQuantity, st.DeliveryTerms, st.TradeStatus, st.BuyerCommisionPay, st.SellerCommisionPay, st.BuyerTotalQuantity, st.BuyerRemainQuantity, st.BuyerId, st.MaterialImage, st.RejectedMessage, st.TransportDetailStatus, st.SellerRemainQuantity, st.DispatchDate, st.CreatedDate as TradeCreatedDate, st.UpdatedDate as SellerUpdatedDate, st.IsDeleted, st.DeleteReason ';
let buyerTrade='bt.Id as BuyerTradeId, bt.OrderId, bt.BuyerName, bt.BuyerId, bt.BuyerQuantity, bt.RemainingQuantity, bt.BuyerRate, bt.PaymentTerms, bt.BuyerQuality, bt.PaymentDays, bt.PaymentValidity, bt.IsActive, bt.CreatedDate as OrderCreatDate, bt.UpdatedDate, bt.IsDeleted, bt.DeleteReason'
let address='a.street,a.city,a.state,a.pincode,a.landmark';

//To send mail
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
        secure: true, // Set to true if using SSL/TLS
        auth: {
            user: 'test@metalvyapar.com',
            pass: 'Prnv@123',
        },
    });

    const filePath = 'src/assets/email/' + filename;
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    const replacements = data;
    const htmlToSend = template(replacements);

    const mailOptions = {
        from: '"test@metalvyapar.com"',
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
//To send attachment mail
function mailAttach(filename, data, toemail, subj, mailname) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            // for Sent Mail Enter Your Email Address 
            user: 'Enter Your Email Address',   
            pass: 'Enter Your Password',
        },
    });
    const filePath = 'src/assets/email/' + filename;
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    const replacements = data;
    const htmlToSend = template(replacements);
    const mailOptions = {
        from: 'support@metalvyapar.com',
        subject: subj,
        to: toemail,
        Name: mailname,
        html: htmlToSend,
        attachments: [
            {
                filename: 'attachment.pdf', // Specify the filename for the attachment
                path: 'https://metalvyapar.com/metal_email/Customer-Agreement.pdf', // Provide the path to the static PDF file
            },
        ],
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
            // Handle the error accordingly
        } else {
            console.log('Email sent: ' + info.response);
            // Handle the successful email sending
        }
    });
}

// API to get data for master  table based on date range selected
router.post("/getMasterDataByDateRangeList", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT st.Id as SellerOrderId, st.OrderId, st.SubOrderId,st.DispatchDate, st.SellerName, st.SellerId, st.SellerQuantity, st.DeliveryTerms, st.TradeStatus, st.BuyerCommisionPay, st.SellerCommisionPay, st.BuyerTotalQuantity, st.BuyerRemainQuantity, st.BuyerId, st.MaterialImage, st.TransportDetailStatus, st.CreatedDate as SellerCreatedDate, st.UpdatedDate as SellerUpdatedDate, bt.Id as BuyerTradeId,  bt.BuyerName, bt.BuyerId, bt.BuyerQuantity, bt.BuyerRate, bt.PaymentTerms, bt.BuyerQuality, bt.PaymentDays, bt.PaymentValidity, bt.IsActive, bt.CreatedDate, bt.UpdatedDate,a.street as SellerStreet,a.city as SellerCity,a.state as SellerState,a.pincode as SellerPincode,a.landmark as SellerLandmark FROM seller_trade st join buyer_trade bt on st.OrderId=bt.OrderId join address a on a.uid = st.SellerId where bt.CreatedDate >='" + req.body.from + "' and bt.createdDate <='" + req.body.to + "' ;", function (data, err) {
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
            else {
                res.json(null)
            }
            // res.json(data);
        }
    })
});

// Get all trading data for seller for admin side user detail
router.post("/getAllTradingDatabyIdForSeller", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("select "+sellerTrade+","+address+",u.FirstName as BuyerFirstName,u.LastName as BuyerLastName,u.CompanyName as BuyerCompanyName,"+buyerTrade+" from seller_trade st left join user u on st.BuyerId = u.Id left join address a on st.buyerId = a.uid left join buyer_trade bt on st.OrderId=bt.OrderId where t.sellerId=" + req.body.uid + ";", function (data, err) {
        if (err) {
            console.log(err)
        } else {
            res.json(data);
        }
    })
});

// To Register new user
router.post("/RegisterNewUser", (req, res, next) => {
    db.executeSql("select * from user where Email='" + req.body.email + "'", function (data, err) {
        if (data != null && data.length > 0) {
            res.json('duplicate email');
        } else {
            db.executeSql("select * from user where GSTNo='" + req.body.gstno + "'", function (data3, err) {
                if (data3 != null && data3.length > 0) {
                    res.json('duplicate GST');
                }
                else {
                    db.executeSql("INSERT INTO `user`(`Salutation`, `FirstName`, `LastName`, `Phone`, `Email`, `Role`, `CompanyName`, `Designation`,`AvgMonthTrade`, `GSTNo`, `CompanyContact`, `MaterialQuality`,`PANCard`, `KYCStatus`, `CreatedDate`,`ProfileUpdation`) VALUES ('" + req.body.select + "','" + req.body.fname + "','" + req.body.lname + "','" + req.body.contact + "','" + req.body.email + "','" + req.body.regAs + "','" + req.body.companyname + "','" + req.body.desgination + "','" + req.body.avg_mnth_trade + "','" + req.body.gstno + "','" + req.body.workphone + "','" + req.body.multiDefaultOption + "','" + req.body.pancard + "',false,CURRENT_TIMESTAMP,false)", function (data, err) {
                        if (err) {
                            res.json("error");
                        } else {
                            console
                            db.executeSql("INSERT INTO `address`(`uid`, `street`, `city`, `state`, `pincode`, `landmark`, `createddate`) VALUES (" + data.insertId + ",'" + req.body.address + "','" + req.body.city + "','" + req.body.selectState + "','" + req.body.pincode + "','" + req.body.landmark + "',CURRENT_TIMESTAMP)", function (data, err) {
                                if (err) {
                                    res.json("error");
                                } else {
                                    const replacement = {
                                        userName: req.body.companyname,
                                    };
                                    return res.json('sucess');
                                }
                            });
                        }
                    });
                }
            })
        }
    })
});

// To save data from front-end website contact enquiry
router.post("/SaveContactData", (req, res, next) => {
    console.log(req.body);
    db.executeSql("INSERT INTO `contact`(`userid`, `role`, `email`, `name`, `subject`, `message`, `isactive`,`btn`,`bg_color`,`createddate`) VALUES (" + req.body.userid + ",'" + req.body.role + "','" + req.body.email + "','" + req.body.name + "','" + req.body.subject + "','" + req.body.message + "',true,'" + req.body.btn + "','" + req.body.bg_color + "',CURRENT_TIMESTAMP)", function (data, err) {
        if (err) {
            res.json("error");
        } else {
            return res.json('success');
        }
    });

});

// To get Transportation detail for admin
router.post("/GetTransporterDetailsbyIdForAdmin", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT * FROM `transport_trade` WHERE OrderId='" + req.body.tradeId + "';", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json(data);
        }
    })
});

// To save seller subscription data
router.post("/SaveSubscriptionData", (req, res, next) => {
    let startDateString = req.body.startDate;
    let startDate = new Date(startDateString);
    let startdate = startDate.toISOString();
    let endDateString = req.body.endDate;
    let endDate = new Date(endDateString);
    let enddate = endDate.toISOString();
    console.log(req.body);
    db.executeSql("INSERT INTO `subscription`(`uid`, `startdate`, `enddate`, `remainingdays`, `status`, `isactive`, `createddate`) VALUES (" + req.body.uid + ",'" + startdate + "','" + enddate + "'," + req.body.remainingdays + ",'" + req.body.status + "'," + req.body.isactive + ",CURRENT_TIMESTAMP)", function (data, err) {
        if (err) {
            console.log(err);
            res.json("error");
        } else {
            db.executeSql("update user set IsSubscribe=true where Id=" + req.body.uid, function (data1, err) {
                if (err) {
                    console.log(err);
                } else {
                    return res.json('success');
                }
            })

        }
    });
});

// To get data for subscribed data
router.get("/GetMembershipData", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT s.id,s.uid,s.startdate,s.enddate,s.remainingdays,s.status,s.isactive,s.createddate,s.updateddate,u.id as userId,u.CompanyName,u.Role,a.uid as addressId,a.street,a.city,a.pincode,a.landmark from subscription s join user u on s.uid=u.id join address a on a.uid=u.id;", function (data, err) {
        if (err) {
            console.log(err)
        }
        else {
            res.json(data);
        }
    });
});

// To get contact for enquiry for display on admin dashboard
router.get("/GetContactData", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT * from contact ORDER BY createddate DESC", function (data, err) {
        if (err) {
            console.log(err)
        }
        else {
            res.json(data);
        }
    });
});

// To set contact us enquiry mark as read
router.post("/UpdateContactMarkAsRead", midway.checkTokenAdmin, (req, res, next) => {
    console.log(req.body)
    db.executeSql("UPDATE `contact` SET `isactive`=false WHERE id=" + req.body.id, function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json('success');
        }
    })
})
// To set contact us enquiry mark as un-read
router.post("/updateContactMarkAsUnread", midway.checkTokenAdmin, (req, res, next) => {
    console.log(req.body)
    db.executeSql("UPDATE `contact` SET `isactive`=true WHERE id=" + req.body.id, function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json('success');
        }
    })
})


// To remove contact us enquiry from list
router.get("/RemoveEmailFromList/:id", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("DELETE FROM `contact` WHERE id=" + req.params.id, function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json('success');
        }
    })
})

// To get all trading data for master table
router.get("/GetAllTradeForDashboard", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT "+sellerTrade+", "+buyerTrade+",a.street as SellerStreet,a.city as SellerCity,a.state as SellerState,a.pincode as SellerPincode,a.landmark as SellerLandmark FROM seller_trade st join buyer_trade bt on st.OrderId=bt.OrderId join address a on a.uid = st.SellerId;", function (data, err) {
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
                                // console.log(data)
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

// To Complete user profile from Admin Bank details etc
router.post("/completeProfile", midway.checkTokenAdmin, (req, res, next) => {
    console.log(req.body)
    console.log("req.body")
    db.executeSql("UPDATE `user` SET `FirstName`='" + req.body.FirstName + "',`LastName`='" + req.body.LastName + "',`Phone`='" + req.body.Phone + "',`Email`='" + req.body.Email + "',`CompanyName`='" + req.body.CompanyName + "',`Designation`='" + req.body.Designation + "',`AvgMonthTrade`='" + req.body.AvgMonthTrade + "',`GSTNo`='" + req.body.GSTNo + "',`CompanyContact`='" + req.body.CompanyContact + "',`MaterialQuality`='" + req.body.MaterialQuality + "',`BankName`='" + req.body.BankName + "',`BankAccNo`='" + req.body.newAccNo + "',`AccType`='" + req.body.AccType + "',`AccHolderName`='" + req.body.AccHolderName + "',`ISFCCode`='" + req.body.ISFCCode + "',`BranchName`='" + req.body.BranchName + "',`CancelCheque`='" + req.body.CancelCheque + "',`PANCard`='" + req.body.PANCard + "',`UpdatedDate`=CURRENT_TIMESTAMP,`ProfileUpdation`=true WHERE Id=" + req.body.uid, function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json('success');
        }
    })
})

// to send Welcome mail from admin
router.post("/SendEmailDocumentFromAdmin", (req, res, next) => {
    console.log(req.body, 'document')
    sendSMS(req.body.Phone, "Welcome to MetalVyapar! We are delighted to have you onboard. Please check your email for more details. Reach out on contactus@metalvyapar.com for assistance - NXTMTL");

    const replacements = {
        email: req.body.Email,
    };
    mailAttach('Onboarding-mail​.html', replacements, req.body.Email, "Welcome to Metalvyapar", "We are excited to have you onboard.");
    res.json('success');
});

//To cancel KYC from admin
router.post("/sendCancelKYCMsgAdmin", midway.checkTokenAdmin, (req, res, next) => {
    console.log(req.body)
    db.executeSql("update user set KYCRejectMsg='" + req.body.msg + "',IsActive=false where Id=" + req.body.uid, function (data, err) {
        if (err) {
            console, log(err)
        } else {
            res.json('sucess');
        }
    })
})

// To complete KYC
router.post("/completeKYCUser", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("update user set KYCStatus=true where Id=" + req.body.UserId, function (data, err) {
        if (err) {
            console.log(err)
        }
        else {
            res.json('success');
        }
    })
})

// To get user details by user Id
router.get("/getUserDetailById/:id", midway.checkTokenAdmin, (req, res, next) => {
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

// To get all trading data by user Id for Buyer
router.post("/GetAllTradesByUseridForBuyer", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("select * from buyer_trade where BuyerId=" + req.body.buyerId, function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json(data);
        }
    })
})

//To get upcoming delivery for admin dashboard
router.get("/GetUpcomingDeliveryForDashboard", midway.checkTokenAdmin, (req, res, next) => {
    var date = new Date();
    date = date.getUTCFullYear() + '-' + ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + date.getUTCDate()).slice(-2);
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() + 4)
    yesterday = yesterday.getUTCFullYear() + '-' + ('00' + (yesterday.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + yesterday.getUTCDate()).slice(-2);
    db.executeSql("SELECT st.SubOrderId,st.DispatchDate,st.SellerName,st.SellerId,st.SellerQuantity,st.DeliveryTerms,st.TradeStatus,st.BuyerCommisionPay,st.SellerCommisionPay,st.BuyerId,st.MaterialImage,st.CreatedDate as TradeCreatedDate, bt.BuyerName FROM seller_trade st join buyer_trade bt on bt.OrderId= st.OrderId where  st.DispatchDate <='" + yesterday + "' and st.TradeStatus='Accepted';", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json(data);
        }
    })
});

// Top get upcoming payment for admin dashboard
router.get("/GetUpcomingPaymentForDashboard", midway.checkTokenAdmin, (req, res, next) => {
    var date = new Date();
    date = date.getUTCFullYear() + '-' + ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + date.getUTCDate()).slice(-2);
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() + 4)
    yesterday = yesterday.getUTCFullYear() + '-' + ('00' + (yesterday.getUTCMonth() + 1)).slice(-2) + '-' + ('00' + yesterday.getUTCDate()).slice(-2);
    db.executeSql("SELECT tt.Id as TransportId, tt.OrderId as TradeId, tt.StartDate, tt.EndDate, tt.DriverContact, tt.VehicleNo, tt.WeightSlip, tt.InvoiceImage, tt.MaterialQuantity, tt.InvoiceAmount, tt.DeliveryReceipt, tt.DeliveryStatus, tt.DeliveryDate, tt.UtrNo, tt.PaymentImage, tt.PaymentDate, tt.DueDate, tt.CreatedDate, tt.UpdatedDate,st.OrderId,st.SubOrderId,st.SellerName,st.SellerId,st.SellerQuantity,st.DeliveryTerms,st.TradeStatus,st.BuyerCommisionPay,st.SellerCommisionPay,st.BuyerId,st.MaterialImage,st.CreatedDate as TradeCreatedDate, bt.BuyerName FROM transport_trade tt join seller_trade st on tt.OrderId=st.SubOrderId join buyer_trade bt on bt.OrderId= st.OrderId where tt.DeliveryStatus='Delivered' and tt.DueDate<='" + yesterday + "' and tt.UtrNo Is null;", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json(data);
        }
    })
});

//get top traded quality for pie-chart
router.get("/GetTopTradeQualityMaterial", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT SUM(st.SellerQuantity)as totalQuantityTrade, bt.BuyerQuality  FROM `seller_trade` st join buyer_trade bt on st.OrderId = bt.OrderId WHERE (st.TradeStatus ='Accepted' or st.TradeStatus ='Completed') and bt.IsDeleted=false and st.IsDeleted=false GROUP BY BuyerQuality ORDER BY totalQuantityTrade DESC; ", function (data, err) {
        if (err) {
            console.log(err)
        } else {
            res.json(data);
        }
    })
});

//To get list for rejected KYC users
router.get("/getRejectedKYCList", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT * FROM user u JOIN address a ON u.Id = a.uid where u.IsActive=false and u.KYCRejectMsg IS NOT null; ", function (data, err) {
        if (err) {
            console.log(err)
        } else {
            res.json(data);
        }
    })
});

//To get Traded status for Pie-chart
router.get("/GetTopTradeStatus", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT COUNT(TradeStatus)as totalTrade, TradeStatus  FROM seller_trade GROUP BY TradeStatus ORDER BY COUNT(TradeStatus) DESC;", function (data, err) {
        if (err) {
            console.log(err)
        } else {
            // db.executeSql("select COUNT(TradeId) as totalTrade from seller_trade where ")
            res.json(data)
        }
    })
})

//To get total commision amount to display in KPI
router.get("/GetTotalCommision", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT SUM(ComissionAmount) as TotalCom FROM buyer_commision;", function (data, err) {
        if (err) {
            console.log(err)
        } else {
            res.json(data);
        }
    })
})

//To get detailed list for paid commision
router.get("/GetCommisionSummaryList", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT  "+sellerTrade+", "+buyerTrade+",a.street as SellerStreet,a.city as SellerCity,a.state as SellerState,a.pincode as SellerPincode,a.landmark as SellerLandmark,bc.ComissionAmount,bc.CreatedDate as CommisionDate FROM seller_trade st join buyer_trade bt on st.OrderId=bt.OrderId join address a on a.uid = st.SellerId join buyer_commision  bc on bc.TradeId = st.SubOrderId ;", function (data, err) {
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
        }
    })
});

//To close trade from admin dashboard
router.post("/closeTradeFromAdmin", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("update seller_trade set TradeStatus='Completed' where SubOrderId='" + req.body.OrderId + "';", function (data, err) {
        if (err) {
            console.log(err)
        } else {
            db.executeSql("select * from seller_trade where SubOrderId='" + req.body.OrderId + "'", function (da2, err) {
                if (err) {
                    console.log(err)
                } else {
                    db.executeSql("select * from user where Id=" + da2[0].SellerId, function (da1, err) {
                        if (err) {
                            console.log(err)
                        } else {
                            const replacements = {
                                TradeID: req.body.OrderId,
                                userName: da1[0].CompanyName,
                            };
                            sendSMS(da1[0].Phone, "Dear Customer, This is to inform you that your Trade ID " + req.body.OrderId + " is successfully closed.\r\n-NXTMTL");
                            mail('Completed-trade-mail.html', replacements, da1[0].Email, "Trade Completed", "Trade has been completed.");
                            db.executeSql("select * from user where Id=" + da2[0].BuyerId, function (da, err) {
                                if (err) {
                                    console.log(err)
                                } else {
                                    const replacements = {
                                        TradeID: req.body.OrderId,
                                        userName: da[0].CompanyName,
                                    };
                                    mail('Completed-trade-mail.html', replacements, da[0].Email, "Trade Completed", "Trade has been completed.");
                                    res.json('sucess');
                                }
                            })
                        }
                    })
                }
            })
        }
    })
});

//To get initiated order from buyer
router.get("/GetInitiatedOrderForAdmin", midway.checkTokenAdmin, (req, res, next) => {
    var date;
    date = new Date();
    date = date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2) + ' ';
    console.log(date);
    db.executeSql("select t.OrderId,t.BuyerName,t.RemainingQuantity,t.BuyerId,t.BuyerQuality,t.BuyerQuantity,t.PaymentTerms,t.Paymentdays,t.PaymentValidity,t.BuyerRate,t.RemainingQuantity,t.CreatedDate,t.UpdatedDate,t.IsActive,t.IsDeleted,t.DeleteReason, a.city,a.street,a.city,a.state,a.pincode,a.landmark from buyer_trade t join address a on a.uid = t.BuyerId  where t.PaymentValidity>='" + date + "' ;", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            console.log(data);
            if (data.length > 0) {
                console.log(data);
                for (let i = 0; i < data.length; i++) {
                    db.executeSql("select  st.Id ,  st.OrderId ,  st.SubOrderId ,  st.SellerName ,  st.SellerId ,  st.SellerQuantity ,  st.DeliveryTerms ,  st.TradeStatus ,  st.BuyerCommisionPay ,  st.SellerCommisionPay ,  st.BuyerTotalQuantity ,  st.BuyerRemainQuantity ,  st.BuyerId ,  st.MaterialImage ,  st.TransportDetailStatus ,  st.CreatedDate ,  st.UpdatedDate,u.CompanyName as sellerCompanyName from seller_trade st join user u on st.SellerId=u.id where OrderId=" + data[i].OrderId, function (data1, err) {
                        if (err) {
                            console.log(err)
                        } else {
                            if (data1.length > 0) {
                                data[i].TotalResponse = data1.length;
                            }
                            else {
                                data[i].TotalResponse = 0;
                            }

                            if (i + 1 == data.length) {
                                res.json(data);
                            }

                        }
                    });
                }
            } else {
                res.json([])
            }
        }
    })
});

//To get older initiated order based on date range
router.post("/getOlderInitiatedOrderAdmin", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("select t.OrderId,t.BuyerName,t.RemainingQuantity,t.BuyerId,t.BuyerQuality,t.BuyerQuantity,t.PaymentTerms,t.Paymentdays,t.PaymentValidity,t.BuyerRate,t.RemainingQuantity,t.CreatedDate,t.UpdatedDate,t.isActive, a.city,a.street,a.city,a.state,a.pincode,a.landmark    from buyer_trade t join address a on a.uid = t.BuyerId  where  t.PaymentValidity>='" + req.body.from + "' and  t.PaymentValidity<='" + req.body.to + "';", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    db.executeSql("select  st.Id ,  st.OrderId ,  st.SubOrderId ,  st.SellerName ,  st.SellerId ,  st.SellerQuantity ,  st.DeliveryTerms ,  st.TradeStatus ,  st.BuyerCommisionPay ,  st.SellerCommisionPay ,  st.BuyerTotalQuantity ,  st.BuyerRemainQuantity ,  st.BuyerId ,  st.MaterialImage ,  st.TransportDetailStatus ,  st.CreatedDate ,  st.UpdatedDate,u.CompanyName as sellerCompanyName from seller_trade st join user u on st.SellerId=u.id where OrderId=" + data[i].OrderId, function (data1, err) {
                        if (err) {
                            console.log(err)
                        } else {
                            if (data1.length > 0) {
                                data[i].TotalResponse = data1.length;
                            }
                            else {
                                data[i].TotalResponse = 0;
                            }
                            if (i + 1 == data.length) {
                                res.json(data);
                            }
                        }
                    });
                }
            } else {
                return res.json([]);
            }
        }
    })
})

//To get order detail by order Id
router.post("/getOrderDetailAdmin", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("select t.OrderId,t.SubOrderId,t.BuyerId,t.BuyerTotalQuantity,t.SellerName,t.IsDeleted,t.SellerId,t.SellerQuantity,t.DeliveryTerms,t.TradeStatus,t.BuyerCommisionPay,t.MaterialImage,t.SellerCommisionPay,t.CreatedDate,t.DeleteReason,a.street,a.city,a.state,a.pincode,a.landmark,u.FirstName as SellerFirstName,u.LastName as SellerLastName,u.CompanyName as SellerCompanyName,bt.BuyerQuantity,bt.BuyerRate,bt.BuyerQuality from seller_trade t  join user u on t.SellerId = u.Id  join address a on t.SellerId = a.uid join buyer_trade bt on bt.BuyerId = t.BuyerId  where t.OrderId=" + req.body.OrderId + "  GROUP BY t.SubOrderId;", function (data, err) {
        if (err) {
            console.log(err)
        } else {
            res.json(data);
        }
    })
});

//To get top commision paid buyer for Pie-chart
router.get("/GetTopBuyerByCommision", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT SUM(ComissionAmount) as CommisionAmount,BuyerId FROM buyer_commision GROUP BY BuyerId ORDER BY ComissionAmount ASC LIMIT 10;", function (data, err) {
        if (err) {
            console.log(err)
        } else {
            for (let i = 0; i < data.length; i++) {
                if (data[i].CommisionAmount != null && data[i].BuyerId != null) {
                    db.executeSql("SELECT * FROM user u JOIN address a ON u.Id = " + data[i].BuyerId, function (data1, err) {
                        if (err) {
                            S
                            console.log(err);
                        } else {
                            data[i].userRecord = data1[0];
                            // return res.json(data);
                        }
                        if ((i + 1) == data.length) {
                            res.json(data);
                        }
                    })
                }
            }
            // res.json(data);
        }
    })
});

//To get detail data for top traded quality pie-chart
router.post("/getTradeOnQuality", midway.checkTokenAdmin, (req, res, next) => {
    console.log("usduyduydddddyddddddddd");
    console.log(req.body);
    db.executeSql("SELECT "+sellerTrade+", "+buyerTrade+",a.street as SellerStreet,a.city as SellerCity,a.state as SellerState,a.pincode as SellerPincode,a.landmark as SellerLandmark FROM seller_trade st join buyer_trade bt on st.OrderId=bt.OrderId join address a on a.uid = st.SellerId where bt.BuyerQuality='" + req.body.data + "' and (st.TradeStatus='Accepted' OR st.TradeStatus='Completed');", function (data, err) {
        if (err) {
            console.log(err)
        }
        else {
            console.log(data);
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
                                // console.log(data)
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

//To get list of all users
router.get("/getAllUser", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT * FROM user u JOIN address a ON u.Id = a.uid ;", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            return res.json(data);
        }
    })
});

//To set user active or inactive
router.post("/changeStateUser", midway.checkTokenAdmin, (req, res, next) => {
    console.log(req.body)
    if (req.body.status == 1) {
        db.executeSql("update user  set IsActive=false where Id=" + req.body.uid, function (data, err) {
            if (err) {
                console.log(err);
            } else {
                return res.json('sucess');
            }
        })
    }
    else {
        db.executeSql("update user  set IsActive=true where Id=" + req.body.uid, function (data, err) {
            if (err) {
                console.log(err);
            } else {
                return res.json('sucess');
            }
        })
    }

});

//To get all trades
router.get("/getAllTrades", midway.checkTokenAdmin, (req, res, next) => {

    db.executeSql("select t.OrderId,t.BuyerName,t.BuyerId,t.BuyerQuality,t.BuyerQuantity,t.PaymentTerms,t.Paymentdays,t.PaymentValidity,t.BuyerRate,t.CreatedDate,t.UpdatedDate,t.isActive from buyer_trade t  where   t.isActive=true;", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    db.executeSql("select * from seller_trade where OrderId=" + data[i].OrderId, function (data1, err) {
                        if (err) {
                            console.log(err)
                        } else {
                            if (data1.length > 1) {
                                // data[i].push(data1[0]);
                                data[i].TotalResponse = data1.length;
                                data[i].TradeStatus = null;
                                let totalSell = 0;
                                if (i + 1 == data.length) {
                                    res.json(data);
                                }
                            } else if (data1.length == 1) {
                                data[i].TotalResponse = data1.length;
                                data[i].TradeStatus = null;
                                let totalSell = 0;


                                if (i + 1 == data.length) {
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
})

//To get all buyer list
router.get("/getAllBuyer", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT * FROM user u JOIN address a ON u.Id = a.uid where u.Role='Buyer' and u.KYCStatus=true and  u.IsActive=true;", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            return res.json(data);
        }
    })
});

//To get all seller list
router.get("/getAllSeller", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT * FROM user u JOIN address a ON u.Id = a.uid where u.Role='Seller' and u.KYCStatus=true and  u.IsActive=true;", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            console.log(data)
            return res.json(data);
        }
    })
});

//Top get list for KYC pending user
router.get("/getAllKYCPendingUser", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT * FROM user u JOIN address a ON u.Id = a.uid where u.KYCStatus=false and u.IsActive=true;", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            return res.json(data);
        }
    })
});

//To get list for completed trades
router.get("/GetCompletedTradesForDashboard", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT "+sellerTrade+", "+buyerTrade+",a.street as SellerStreet,a.city as SellerCity,a.state as SellerState,a.pincode as SellerPincode,a.landmark as SellerLandmark FROM seller_trade st join buyer_trade bt on st.OrderId=bt.OrderId join address a on a.uid = st.SellerId where st.TransportDetailStatus=true and st.TradeStatus='Completed';", function (data, err) {
        if (err) {
            console.log(err);
        } else {
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
        }
    })
});

//To update KYC of user
router.post("/updateKYCUser", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("update user set KYCStatus=true, KYCDate=CURRENT_TIMESTAMP where Id=" + req.body.id, function (data, err) {
        if (err) {
            console.log(err);
        } else {
            db.executeSql("select * from user where Id=" + req.body.id, function (data1, err) {
                if (err) {
                    console.log(er);
                } else {
                    const comp = data1[0].CompanyName;
                    const letter1 = comp.substring(0, 1).toUpperCase() + comp.substring(1, 2).toLowerCase(); //First Letter Capital Second Small Eg. Xy
                    const first = data1[0].FirstName;
                    const letter2 = first.substring(0, 2).toLowerCase(); //Two letter small Eg. xy
                    const contact = data1[0].Phone;
                    const letter3 = contact.substring(0, 4).toLowerCase(); //First four digit of number. 8141
                    const FormatedPassword = letter1 + letter2 + '@' + letter3;
                    console.log(FormatedPassword);
                    const replacements = {
                        userName: data1[0].CompanyName,
                        userpassword: FormatedPassword,
                        email: data1[0].Email,
                        id: req.body.idgetAllTrades
                    };
                    sendSMS(data1[0].Phone, "Dear Customer, Your profile is ready. Please check your email for login details.\r\n-NXTMTL");
                    mail('User-ID-password​.html', replacements, data1[0].Email, "Your Credentials", "Your account has been activated.​");
                    var salt = '7fa73b47df808d36c5fe328546ddef8b9011b2c6';
                    var repass = salt + '' + FormatedPassword;
                    var encPassword = crypto.createHash('sha1').update(repass).digest('hex');
                    db.executeSql("UPDATE user SET Password='" + encPassword + "' WHERE Id=" + req.body.id + ";", function (data, err) {
                        if (err) {
                            console.log("Error in store.js", err);
                        } else {
                            return res.json('success');
                        }
                    });
                }
            })

            // return res.json('success');
        }
    })
});

//To get seller response for based on order Id
router.post("/getAllSellerResponse", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("select st.OrderId,st.SubOrderId,st.SellerName,st.SellerId,st.SellerQuantity,st.DeliveryTerms,st.TradeStatus,st.BuyerCommisionPay,st.RejectedMessage,st.SellerCommisionPay,st.BuyerId,st.IsDeleted,st.MaterialImage,a.street,a.city,a.state,a.pincode,a.landmark,bt.BuyerQuantity,bt.BuyerRate,bt.PaymentTerms,bt.BuyerQuality,bt.PaymentDays,bt.PaymentValidity,bt.RemainingQuantity,u.CompanyName as sellerCompanyName, bt.CreatedDate as TradeDate from seller_trade st left join address a on st.SellerId=a.uid left join buyer_trade bt on bt.OrderId = st.OrderId join user u on u.id=st.SellerId where st.OrderId=" + req.body.orderId + ";", function (data1, err) {
        if (err) {
            console.log(err)
        } else {
            res.json(data1);
        }
    })
})

//To get transportation details based on trade Id
router.post("/GetTransporterDetailsbyIdForSeller", midway.checkTokenAdmin, (req, res, next) => {
    db.executeSql("SELECT * FROM `transport_trade` WHERE OrderId='" + req.body.tradeId + "';", function (data, err) {
        if (err) {
            console.log(err);
        } else {
            res.json(data);
        }
    })
});

//For password change and checking current password of admin matches or not
router.post("/CheckExistingPasswordAdmin", (req, res, next) => {
    console.log(req.body);
    var salt = '7fa73b47df808d36c5fe328546ddef8b9011b2c6';
    var repass = salt + '' + req.body.enteredPassword;
    var encPassword = crypto.createHash('sha1').update(repass).digest('hex');
    console.log(encPassword)
    if (encPassword == req.body.oldPassword) {
        res.json('sucess')
    } else {
        res.json('err');
    }
})

//To upload image for cancel cheque
router.post("/UploadCancelCheckImage", midway.checkTokenAdmin, (req, res, next) => {
    var imgname = generateUUID();

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'images/cancelcheck');
        },
        // By default, multer removes file extensions so let's add them back
        filename: function (req, file, cb) {

            cb(null, imgname + path.extname(file.originalname));
        }
    });
    let upload = multer({ storage: storage }).single('file');
    upload(req, res, function (err) {
        console.log("path=", config.url + 'images/cancelcheck/' + req.file.filename);

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
        return res.json('/images/cancelcheck/' + req.file.filename);


    });
});

//For forgot password and to send otp through mail for user
router.post("/ForgotPassword", (req, res, next) => {
    let otp = Math.floor(100000 + Math.random() * 900000);
    db.executeSql("select * from user where Email='" + req.body.email + "';", function (data, err) {
        if (err) {
            console.log("Error in store.js", err);
            return res.json('err');
        } else {
            db.executeSql("INSERT INTO `otp`(`userid`, `otp`, `createddate`, `createdtime`,`role`,`isactive`) VALUES (" + data[0].Id + "," + otp + ",CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'" + data[0].Role + "',true)", function (data1, err) {
                if (err) {
                    console.log(err);
                } else {
                    const replacements = {
                        otp: otp,
                        userName: data[0].CompanyName,
                    };
                    mail('OTP-for-password-change.html', replacements, req.body.email, "Re-setting Password", "OTP for password change");
                }
            })
        }
        res.json(data);
    });
});

//To get otp for forgot password functionality for User
router.post("/GetOneTimePassword", (req, res, next) => {
    console.log(req.body)
    db.executeSql("select * from otp where userid = " + req.body.id + " and otp = " + req.body.otp + " ", function (data, err) {
        if (err) {
            console.log("Error in store.js", err);
        } else {
            return res.json(data);
        }
    });
});

//For forgot password and to send otp through mail for Admin
router.post("/AdminForgotPassword", (req, res, next) => {
    let otp = Math.floor(100000 + Math.random() * 900000);
    db.executeSql("select * from adminuser where email='" + req.body.email + "';", function (data, err) {
        if (err) {
            console.log("Error in store.js", err);
            return res.json('err');
        } else {
            db.executeSql("INSERT INTO `otp`(`userid`, `otp`, `createddate`, `createdtime`,`role`,`isactive`) VALUES (" + data[0].id + "," + otp + ",CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'" + data[0].role + "',true)", function (data1, err) {
                if (err) {
                    console.log(err);
                } else {
                    const replacements = {
                        otp: otp,
                        userName: data[0].firstName ,
                    };
                    mail('OTP-for-password-change.html', replacements, req.body.email, "Re-setting Password", "OTP for password change");
                }
            })
        }
        res.json(data);
    });
});

//To get otp for forgot password functionality for Admin
router.post("/GetAdminOneTimePassword", (req, res, next) => {
    db.executeSql("select * from otp where userid = " + req.body.id + " and otp = " + req.body.otp + "", function (data, err) {
        if (err) {
            console.log("Error in store.js", err);
        } else {
            return res.json(data);
        }
    });
});

//To update password for admin
router.post("/updatePasswordAccordingRole", (req, res, next) => {
    var salt = '7fa73b47df808d36c5fe328546ddef8b9011b2c6';
    var repass = salt + '' + req.body.password;
    var encPassword = crypto.createHash('sha1').update(repass).digest('hex');
    db.executeSql("UPDATE adminuser SET password='" + encPassword + "' WHERE id=" + req.body.id + ";", function (data, err) {
        if (err) {
            console.log("Error in store.js", err);
        } else {
            return res.json("sucess");
        }
    });
});

var today = new Date();
var dd = String(today.getDate()).padStart(2, '0');
var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
var yyyy = today.getFullYear();

today = yyyy + '-' + mm + '-' + dd;
//To generate unique Id for image name
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