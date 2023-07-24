const http = require("http");
const app = require("./app");
const config = require("./config");
const port = config.port || 5000;
console.log(port); 
 http.createServer(app).listen(port);

// app.listen(config.port , () => console.log('Server is listening on http://localhost:' + config.port));


