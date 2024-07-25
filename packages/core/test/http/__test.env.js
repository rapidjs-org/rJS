const rjsCore = require("../../build/api");


module.exports.BEFORE = new Promise(async (resolve) => {
    await rjsCore.serve({
        port: 7979
    });
    console.log("Test server listening...");
    resolve();
});

module.exports.AFTER = () => {
    console.log("Test server inherently shuts down.");
};


HTTPTest.configure({
    port: 7979
});