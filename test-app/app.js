const rjs = require("../packages/rjs/build/api");


const PORT = 8000;

new rjs.Server({
    port: PORT,
    cwd: __dirname
})
.on("online", () => {
    console.log(`Test server listening (:${PORT})…`);
});