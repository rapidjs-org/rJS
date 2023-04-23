const http = require("http");


global.TEST_SERVER = http
.createServer((req, res) => {
    res.write("Hello World");

    res.end();
})
.listen(8080, () => {
    console.log("Start test server");

    global.SETUP();
}); 