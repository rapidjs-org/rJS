const rjs = require("../packages/rjs/build/api");


const PORT = 8000;

new rjs.createFileServer({
    port: PORT,
    cwd: __dirname
})
.then(() => {
    console.log(`Test server listening (:${PORT})…`);
});