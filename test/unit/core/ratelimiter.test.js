const { RateLimiter } = require("../../../debug/core/process/RateLimiter");


const testID = "test";

const testLimiter = new RateLimiter(1, 25);


frame("First window", () => {

    assertEquals("Grants", new Promise(resolve => {
        setTimeout(() => resolve(testLimiter.grantsAccess(testID), 25));
    }), true);
    assertEquals("Denies", new Promise(resolve => {
        setTimeout(() => {
            testLimiter.grantsAccess(testID);   // Fill to activate weights
            
            resolve(testLimiter.grantsAccess(testID), 26);
        });
    }), false);

});

frame("Second window", () => {

    assertEquals("Denies upon window shift, due to weighted slide", new Promise(resolve => {
        setTimeout(() => resolve(testLimiter.grantsAccess(testID), 50));
    }), false);
    assertEquals("Grants within subsequent window, due to weighted slide", new Promise(resolve => {
        setTimeout(() => resolve(testLimiter.grantsAccess(testID), 75));
    }), true);

});