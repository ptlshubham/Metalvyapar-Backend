const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
var corsoption = {
    origin: "*",
    // origin: "http://localhost:4300"
}
app.use(cors(corsoption));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const adminRoutes = require('./src/routes/admin');
const auth = require('./src/routes/authenticate');
const trading = require('./src/routes/trading');
app.use("/admin", adminRoutes);
app.use("/authenticate", auth);
app.use("/trading",trading)
// parse application/x-www-form-urlencoded
app.use(express.static('public'));
//Serves all the request which includes /images in the url from Images folder
app.use('/images', express.static(__dirname + '/images'));
//const DbConnectionString = 'mssql://'+ process.env.SQL_USER +':'+ process.env.SQL_PASSWORD +'@192.168.1.112:54161/'+process.env.SQL_DATABASE;
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin , X-Requested-With, Content-Type, Accept, Authorization');
    if (res.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, PATCH, DELETE');
        return res.status(200).json({});
    }
    next();
})
app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status(404);
    next(error);
});
app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            massage: error.message
        }
    });
});
module.exports = app;