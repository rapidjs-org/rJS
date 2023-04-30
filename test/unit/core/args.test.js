const testArgs = [
    "pos1", "pos2", "--flag", "--option1", "123", "--option2", "456", "-O", "789"
];

process.argv = process.argv.slice(0, 2).concat(testArgs);


const { Args } = require("../../../debug/Args");


frame("Global scope", () => {

    assertEquals("Position one", Args.global.parsePositional(0), testArgs[0]);
    assertEquals("Position two", Args.global.parsePositional(1), testArgs[1]);
    assertEquals("Option", Args.global.parseOption("option1").string, testArgs[4]);
    assertEquals("Option by most significant (rightmost, shorthand)", Args.global.parseOption("option2", "O").number, parseInt(testArgs[8]));

});

const testArgParser = new Args(testArgs);

frame("Individual scope", () => {

    assertEquals("Position one", testArgParser.parsePositional(0), testArgs[0]);
    assertEquals("Position two", testArgParser.parsePositional(1), testArgs[1]);
    assertEquals("Option", testArgParser.parseOption("option1").string, testArgs[4]);
    assertEquals("Option by most significant (rightmost, shorthand)", testArgParser.parseOption("option2", "O").number, parseInt(testArgs[8]));

});