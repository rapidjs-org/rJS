const rjsCore = require("../build/api");


module.exports.start = (port) => {
    return new Promise(async (resolve) => {
        new rjsCore.Server(process.cwd(), { port })
        .on("online", () => {
            console.log("Test server listening...");
            
            resolve();
        });
    });
};

module.exports.stop = () => {
    console.log("Test server inherently shuts down.");
};