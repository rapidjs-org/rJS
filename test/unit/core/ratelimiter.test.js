const { RateLimiter } = require("../../../debug/core/process/RateLimiter");


const testID = "test";
const testWindowSize = 25;
const testLimiter = new RateLimiter(1, testWindowSize);

const transientNormal = windowFraction => (windowFraction * testWindowSize) + testWindowSize;


frame("First window", () => {

    assertEquals("Grants", new Promise(resolve => {
        setTimeout(() => resolve(testLimiter.grantsAccess(testID)), transientNormal(0));
    }), true);
    assertEquals("Denies", new Promise(resolve => {
        setTimeout(() => resolve(testLimiter.grantsAccess(testID)), transientNormal(0.75));
    }), false);

});

frame("Second window", () => {

    assertEquals("Denies: exceeds sliding window (weighted sum)", new Promise(resolve => {
        setTimeout(() => resolve(testLimiter.grantsAccess(testID)), transientNormal(1.75));
    }), false);

});

frame("Third window", () => {

    assertEquals("Grants: sliding window (weighted sum)", new Promise(resolve => {
        setTimeout(() => resolve(testLimiter.grantsAccess(testID)), transientNormal(3.76));
    }), true);
    assertEquals("Denies: sliding window (weighted sum)", new Promise(resolve => {
        setTimeout(() => resolve(testLimiter.grantsAccess(testID)), transientNormal(4.5));
    }), false);

});