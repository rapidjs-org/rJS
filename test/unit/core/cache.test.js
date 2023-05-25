const { Cache } = require("../../../debug/core/thread/Cache");


const testKey = "key";
const testValue = "value";

const testCache = new Cache(25, key => key.toUpperCase());


frame("Missing entry", () => {

    assertEquals("Check", testCache.exists(testKey), false);
    assertEquals("Read", testCache.read(testKey), null);

});

assertEquals("Write", testCache.write(testKey, testValue), undefined);

frame("Existing entry", () => {

    assertEquals("Check", testCache.exists(testKey), true);
    assertEquals("Read", testCache.read(testKey), testValue);
    assertEquals("Check (isomorphic key)", testCache.exists(`${testKey.charAt(0).toUpperCase()}${testKey.slice(1)}`), true);

});

frame("Exceeded entry", () => {

    assertEquals("Check", new Promise(resolve => {
        setTimeout(() => resolve(testCache.exists(testKey), 50));
    }), false);
    
    assertEquals("Read", new Promise(resolve => {
        setTimeout(() => resolve(testCache.read(testKey), 50));
    }), null);

});