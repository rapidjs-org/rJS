process.argv = process.argv.slice(0, 2).concat([
    "pos1", "pos2", "--flag", "--option1", "123", "--option2", "456", "-O", "789"
]);


const { Args } = require("../../../debug/SArgs");


frame("Positional argument", () => {

    assertEquals("Position one", Args.global.parsePositional(0), "pos1");
    assertEquals("Position two", Args.global.parsePositional(1), "pos2");

});

frame("Flag argument", () => {

    assertEquals("Flag", Args.global.parseFlag("flag"), true);

});

frame("Option argument", () => {

    assertEquals("Option", Args.global.parseOption("option1").string, "123");
    assertEquals("Option by most significant (rightmost, shorthand)", Args.global.parseOption("option2", "O").number, 789);

});