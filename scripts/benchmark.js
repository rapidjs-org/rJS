const { loadTest } = require("loadtest");


let mode;
while(mode = process.argv.slice(2).pop()) {
    if([ "-s", "-m", "-l" ].includes(mode)) {
        break;
    }
}


// TODO