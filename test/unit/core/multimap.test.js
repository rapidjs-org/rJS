const { MultiMap } = require("../../../debug/core/MultiMap");


const testKeys = [ "key1", "key2" ];
const testValue = "value";

const testMap = new MultiMap();


frame("Missing entry", () => {

    assertEquals("Check (single)", testMap.has(testKeys[0]), false);
    assertEquals("Read (single)", testMap.get(testKeys[1]), undefined);
    assertEquals("Check (multiple)", testMap.has(testKeys), false);
    assertEquals("Read (multiple)", testMap.get(testKeys), undefined);

});

assertEquals("Write single-key entry", testMap.set(testKeys[0], testValue), undefined);

frame("Single-key entry", () => {

    assertEquals("Check (single, exists)", testMap.has(testKeys[0]), true);
    assertEquals("Read (single, exists)", testMap.get(testKeys[0]), testValue);
    assertEquals("Check (single, missing)", testMap.has(testKeys[1]), false);
    assertEquals("Read (single, missing)", testMap.get(testKeys[1]), undefined);
    assertEquals("Check (multiple)", testMap.has(testKeys), true);
    assertEquals("Read (multiple)", testMap.get(testKeys), testValue);

});

assertEquals("Write multiple-key entry", testMap.set(testKeys, testValue), undefined);

frame("Multiple-key entry", () => {

    assertEquals("Check (single)", testMap.has(testKeys[0]), true);
    assertEquals("Read (single)", testMap.get(testKeys[1]), testValue);
    assertEquals("Check (multiple)", testMap.has(testKeys), true);
    assertEquals("Read (multiple)", testMap.get(testKeys), testValue);

});

assertEquals("Delete single-key wise entry", testMap.delete(testKeys[0]), undefined);

frame("Partially deleted entry", () => {

    assertEquals("Check (single, exists)", testMap.has(testKeys[1]), true);
    assertEquals("Read (single, exists)", testMap.get(testKeys[1]), testValue);
    assertEquals("Check (single, missing)", testMap.has(testKeys[0]), false);
    assertEquals("Read (single, missing)", testMap.get(testKeys[0]), undefined);
    assertEquals("Check (multiple)", testMap.has(testKeys), true);
    assertEquals("Read (multiple)", testMap.get(testKeys), testValue);

});

assertEquals("Delete multiple-key wise entry", testMap.delete(testKeys), undefined);

frame("Entirely deleted entry", () => {

    assertEquals("Check (single)", testMap.has(testKeys[0]), false);
    assertEquals("Read (single)", testMap.get(testKeys[1]), undefined);
    assertEquals("Check (multiple)", testMap.has(testKeys), false);
    assertEquals("Read (multiple)", testMap.get(testKeys), undefined);

});

testMap.set(testKeys[0], testValue);
testMap.set(testKeys, testValue);

assertEquals("Read size", testMap.size(), 1);
assertEquals("Read keys", testMap.keys(), [ testKeys ]);