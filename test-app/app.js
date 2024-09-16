const rjs = require("../packages/rjs-server/build/api");


const PORT = 8000;

new rjs.createServer({
    port: PORT,
    cwd: __dirname
})
.then(() => {
    console.log(`Test server listening (:${PORT})…`);
});