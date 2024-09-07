const server = require("../http.server");


const PORT = 7300;


module.exports.BEFORE = () => server.start(PORT);


HTTPTest.configure({
    port: PORT
});