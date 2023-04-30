const { ErrorControl } = require("../../../debug/core/ErrorControl");


process.on("uncaughtException", () => {});


let testReference = false;

new ErrorControl(() => {
    testReference = true;
}, 50, true);

setImmediate(() => {
    throw new Error("Ineffective Error");
});


assertEquals("Ineffective error thrown (pre keep-alive)", new Promise(resolve => {
    setImmediate(() => resolve(testReference));
}), false);
assertEquals("Effective error thrown (post keep-alive)", new Promise(resolve => {
    setTimeout(() => {
        setImmediate(() => resolve(testReference));

        throw new Error("Effective Error");
    }, 100);
}), true);