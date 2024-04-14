const rJS = require("../debug/api");

require("http")
.createServer((req, res) => {
    rJS.handle(req, res);
})
.listen(8000);