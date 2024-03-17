const { Test } = require("./Test");


const TEST_APP = process.argv.slice(2)[0];
switch(TEST_APP) {
    case "unit":
        require("./UnitTest");
        init("Unit Tests", [ 159, 57, 219 ])
        break;
    case "request":
        require("./RequestTest");
        init("Request Tests", [ 250, 218, 158 ]);
        break;
    /* case "shm":
        require("./shm-test");
        init("Shared Memory Tests", [ 4, 150, 255 ]);
        break; */
    default: 
        throw new ReferenceError(`Unknown test apllication '${TEST_APP}'`);
}


function init(title, badgeColorRGB) {
    console.log(`\n\x1b[1m\x1b[48;2;${badgeColorRGB.join(";")}m\x1b[38;5;231m ${title.toUpperCase()} \x1b[0m`);

    Test.init();
};