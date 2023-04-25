const http = require("http");


global.TEST_SERVER = http
.createServer((req, res) => {
    if(req.method.toUpperCase() === "GET") {
        res.write(String((req.url.match(/\/[^/]*$/)[0] === "/abc") ? "def" : 123));

        res.statusCode = 200;
    } else {
        res.statusCode = 405;
    }
    
    res.end();
})
.listen(8080, () => {
    console.log("Start test server");

    global.SETUP();
}); 