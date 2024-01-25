const { fork } = require('node:child_process');
const { deepStrictEqual } = require("assert");
const { EventEmitter } = require("events");

const SHARED_MEMORY = require("../debug/process/thread/sharedmemory/sharedmemory");


if(!process.argv.slice(2).includes("child")) {
    // TEST

    const testFramework = require("./test");

    const inChildResponseEmitter = new EventEmitter();
    const inChild = fork(__filename, [ "child" ]);
    inChild.on("error", err => {
        throw err;
    });
    inChild.on("message", value => {
        inChildResponseEmitter.emit("respond", value);
    });
    
    global.SharedMemoryTest = class extends testFramework.ATest {
        constructor(label) {
            super(label);
        }
        
        eval(expression) {
            return (expression instanceof Function) ? expression() : expression;
        }
        
        compare(actual, expected) {
            try {
                deepStrictEqual(actual, expected);
            } catch {
                return {
                    isMismatch: true
                };
            }
            return {
                isMismatch: false
            };
        }
        
        io(key, value) {
            SHARED_MEMORY.write(key, value);
            inChildResponseEmitter.once("respond", value => {
                this.actual(SHARED_MEMORY.read(key)).expected(value);
            });
            inChild.send(key);
        }
    }
    

    testFramework.init("Shared Memory Tests", [ 4, 150, 255 ]);
} else {
    // CHILD

    process.on("message", key => {
        process.send(SHARED_MEMORY.read(key));
    });

    setInterval(() => {}, 1 << 30);
}