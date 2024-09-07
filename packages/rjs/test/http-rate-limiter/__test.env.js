const server = require("../http.server");


const PORT = 7301;


module.exports.BEFORE = () => server.start(PORT);


HTTPTest.configure({
    port: PORT
});