const rjs = require("../build/api");


module.exports.start = (port) => {
    return new Promise(async (resolve) => {
        new rjs.Server({
            port,
            cwd: require("path").join(__dirname, "../../../test-app")
        })
        .on("online", () => {
            console.log(`Test server listening (:${port})…`);
            
            setImmediate(resolve);
        });
    });
};