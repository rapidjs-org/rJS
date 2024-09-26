const { FileServer } = require("../../build/api");

const PORT = 7201;


module.exports.BEFORE = new Promise(resolve => {
    new FileServer({
        port: PORT,
        cwd: require("path").join(__dirname, "../../../../test-app/")
    })
    .on("online", () => {
        console.log(`Test server listening (:${PORT})…`);
        
        resolve();
    });
});


HTTPTest.configure({
    port: PORT
});