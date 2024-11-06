const rjs = require("../../../build/api");

const SOURCE_PORT = 7901;
const TARGET_PORT = 7902;


module.exports.BEFORE = new Promise(async (resolve) => {
    await new rjs.createTLSRedirectServer(SOURCE_PORT, TARGET_PORT);
    
    console.log(`Test redirect server listening (HTTP:${SOURCE_PORT} → HTTPS:${TARGET_PORT})…`);
    
    resolve();
});


HTTPTest.configure({
    port: SOURCE_PORT
});