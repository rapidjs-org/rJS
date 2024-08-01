process.chdir(__dirname);


const server = require("../http.server");


const PORT = 7978;


module.exports.BEFORE = () => server.start(PORT);

module.exports.AFTER = server.stop;


HTTPTest.configure({
    port: PORT
});