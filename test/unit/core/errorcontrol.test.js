const { ErrorControl } = require("../../../debug/core/ErrorControl");


let testReference = false;

new ErrorControl(null, () => {
    testReference = true;
}, 50);


/* assertEquals("Ineffective error thrown (pre keep-alive)", new Promise(resolve => {
    setImmediate(() => resolve(testReference));
}), false);
assertEquals("Effective error thrown (post keep-alive)", new Promise(resolve => {
    setTimeout(() => {
        setImmediate(() => resolve(testReference));

        throw new Error("Effective Error");
    }, 100);
}), true); */