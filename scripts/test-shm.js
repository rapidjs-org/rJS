const { join } = require("path");
const { readFileSync } = require("fs");
const { fork } = require("child_process");
const { EventEmitter } = require("events");

const sharedmemory = require(join("../debug/", readFileSync(join(__dirname, ".shmpath")).toString(), "./api.sharedmemory"));
//console.log(sharedmemory.read("foo"))

if(!process.argv.slice(2).includes("child")) {
    // TEST

    const testFramework = require("./test");

    const childResponseEmitter = new EventEmitter();
    const child = fork(__filename, [ "child" ]);
    child.on("error", err => {
        throw err;
    });
    child.on("message", value => {
        childResponseEmitter.emit("respond", (value === null) ? undefined : value);
    });
    process.on("exit", () => child.kill());
    
    global.SharedMemoryTest = class extends testFramework.ATest {
        constructor(title) {
            super(title);
        }
        
        eval(command, key, value = null) {
            switch(command) {
                case "write":
                    sharedmemory.write(key, value);
                    break;
                case "free":
                    sharedmemory.free(key);
                    break;
                default:
                    throw new SyntaxError(`Invalid shared memory command '${command}'`);
            }

            return new Promise(resolve => {
                childResponseEmitter.once("respond", value => {
                    resolve({
                        intraProcess: sharedmemory.read(key),
                        interProcess: value
                    });
                });
                child.send(key);
            })
        }
        
        compare(actual, expected) {
            const filteredActual = Object.assign({}, actual);
            if(actual.intraProcess == expected) {
                delete filteredActual.intraProcess;
            }
            if(actual.interProcess == expected) {
                delete filteredActual.interProcess;
            }

            return {
                isMismatch: !!Object.keys(filteredActual).length,
                actual: filteredActual
            };
        }
    }


    testFramework.init("Shared Memory Tests", [ 4, 150, 255 ]);
} else {
    // CHILD

    process.on("message", key => {
        process.send(sharedmemory.read(key) || null);
    });

    setInterval(() => {}, 1 << 30);
}