const { FileServer } = require("../../build/api");

const PORT = 7201;


module.exports.BEFORE = new Promise(resolve => {
    new FileServer({
        privateDirectoryPath: require("path").join(__dirname, "../../../../test-app/plugins"),
        publicDirectoryPath: require("path").join(__dirname, "../../../../test-app/public")
    })
    .listen(PORT)
    .then(() => {
        console.log(`Test server listening (:${PORT})…`);
        
        resolve();
    });
});


HTTPTest.configure({
    port: PORT
});