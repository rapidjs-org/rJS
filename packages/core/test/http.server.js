const rjsCore = require("../build/api");


module.exports.start = (port) => {
    return new Promise(async (resolve) => {
        await rjsCore.serve({ port });
        
        console.log("Test server listening...");
        
        resolve();
    });
};

module.exports.stop = () => {
    console.log("Test server inherently shuts down.");
};