const rjs = require("../../build/api");


const PORT = 7300;


module.exports.BEFORE = new Promise(async (resolve) => {
    new rjs.Server({
        port: PORT,
        cwd: require("path").join(__dirname, "../../../../test-app")
    })
    .on("online", () => {
        console.log(`Test server listening (:${PORT})…`);
        
        resolve();
    });
});


HTTPTest.configure({
    port: PORT
});