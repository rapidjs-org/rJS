const { Test } = require("./Test");


const TEST_APP = process.argv.slice(2)[0];
switch(TEST_APP) {
    case "unit":
        require("./UnitTest");
        Test.init("Unit Tests", [ 159, 57, 219 ])
        break;
    case "request":
        require("./RequestTest");
        Test.init("Request Tests", [ 250, 218, 158 ]);
        break;    default: 
        throw new ReferenceError(`Unknown test apllication '${TEST_APP}'`);
}