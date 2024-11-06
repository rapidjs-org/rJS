const rjs = require("../../../build/api");

const PORT = 7203;


module.exports.BEFORE = new Promise(async (resolve) => {
    await new rjs.createServer({
        port: PORT,
        cwd: require("path").join(__dirname, "../../../../test-app"),
        apiDirPath: "./api",
        sourceDirPath: "./src",
        publicDirPath: "./public"
    }, {
        processes: 2,
        threads: 2
    });
    
    console.log(`Test server listening (:${PORT})…`);
    
    resolve();
});


HTTPTest.configure({
    port: PORT
});