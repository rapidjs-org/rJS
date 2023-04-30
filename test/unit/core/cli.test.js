process.argv = process.argv.slice(0, 2).concat([ "test" ]);


const { CLI } = require("../../../debug/CLI");


let testReference = false;

CLI.registerCommand("test", () => { 
    testReference = true;
});


assertEquals("CLI evaluation pending", testReference, false);

CLI.eval();

assertEquals("CLI evaluation done", testReference, true);