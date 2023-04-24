const http = require("http");


global.TEST_SERVER = http
.createServer((req, res) => {
    res.write((req.url === "/abc") ? "def" : 123);
    
    res.end();
})
.listen(8080, () => {
    console.log("Start test server");

    global.SETUP();
}); 