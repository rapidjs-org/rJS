const { AsyncMutex } = require("../../../debug/core/AsyncMutex");


const testMutex = new AsyncMutex();

let testReference = false;


assertEquals("Eventual mutex lock", testMutex.lock(_ =>{
    return new Promise(resolve => {
        setTimeout(_ => {
            testReference = false;

            resolve(testReference);
        }, 200);
    });
}), false);

assertEquals("Immediate mutex lock", testMutex.lock(_ =>{
    testReference = true;
    
    return(testReference);
}), true);