"Use strict";

const dotenv = require("dotenv");
const assert = require("assert");

dotenv.config();

const{
    HOST,
    PORT,
    HOST_URL,
    SQL_SERVER,
    SQL_DATABASE,
    SQL_USER,
    SQL_PASSWORD,
   
}= process.env;

const sqlEncrypt = process.env.SQL_ENCRYPT === "true" ;

assert(PORT, "PORT is required"); 
assert(HOST, "HOST is required"); 

module.exports={
    port: 9000,
    host: HOST,
    url: HOST_URL,
    sql:{
        server: SQL_SERVER ,
        database: SQL_DATABASE , 
        user : SQL_USER , 
        password: SQL_PASSWORD,
        options:{
            encrypt: sqlEncrypt , 
            enableArithAbort: true
        }
    },
 
}