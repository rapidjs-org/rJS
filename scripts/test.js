"use strict";


const { join, basename } = require("path");
const { existsSync, readdir } = require("fs");


const TEST_PATH = join(process.cwd(), process.argv.slice(2)[0] || "");
if(!existsSync(TEST_PATH)) throw new ReferenceError(`ATest directory not found '${TEST_PATH}'`);
const BEFORE_SCRIPT_FILENAME = "_before.js";
const AFTER_SCRIPT_FILENAME = "_after.js";
const START_TIME = Date.now();


let progressInterval;

const _stdoutWrite = {
    origMethod: process.stdout.write.bind(process.stdout),
    modify: true
};
process.stdout.write = (message, encoding, callback) => {
    if(message.trim().length === 0) return;
    
    _stdoutWrite.modify && clearProgressLog();
    
    _stdoutWrite.origMethod(_stdoutWrite.modify ? `\x1b[2m  >> ${message}\x1b[0m` : message, encoding, callback);
};


function writeOrig(messageOrCallback) {
    _stdoutWrite.modify = false;

    (messageOrCallback instanceof Function)
    ? messageOrCallback()
    : process.stdout.write(messageOrCallback);

    _stdoutWrite.modify = true;
}


const evalIntermediateScript = (scriptFilename) => {
    if(!existsSync(join(TEST_PATH, scriptFilename))) return Promise.resolve();

    writeOrig(`\n\x1b[2m→ \x1b[1mINTERMEDIATE SCRIPT\x1b[22m\x1b[2m ${scriptFilename}\x1b[0m\n\n`);
        
    return new Promise(resolve => {
        let exp = require(join(TEST_PATH, scriptFilename));
        exp = (exp instanceof Function) ? exp() : exp;
        return (!(exp instanceof Promise)
        ? Promise.resolve()
        : exp)
        .then(() => {
            resolve();
        });
    });
};
const clearProgressLog = () => {
    writeOrig(() => {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write("\x1b[?25h");
    });
};
process.on("exit", async code => {
    clearInterval(progressInterval);
    clearProgressLog();

    if(code !== 0) {
        evalIntermediateScript(AFTER_SCRIPT_FILENAME);

        return code;
    }

    const counter = {
        success: 0,
        failure: 0
    };

    ATest.instances
    .forEach(instance => {
        counter.success += instance.records.filter(record => !record.isMismatch).length;
        counter.failure += instance.records.filter(record => record.isMismatch).length;
        
        writeOrig(() => {
            console.log(`\n• ${instance.label}\x1b[0m`);

            instance.records
            .forEach((record, index) => {
                if(!record.isMismatch) {
                    console.log(`\x1b[32m✔ ∟ ${index}\x1b[0m`);
                    return;
                }

                const printObj = (obj) => {
                    if([ "string", "number", "boolean" ].includes(typeof(obj))){
                        return `\x1b[34m${obj}\x1b[0m`;
                    }
                    const color = (code, str) => `\x1b[0m\x1b[${code}m${str}\x1b[0m\x1b[2m`;
                    return `\x1b[2m${
                        JSON.stringify(obj, null, 2)
                        .replace(/:( *("|').*\2 *)(,?\n)/g, `:${color(34, "$1")}$3`)
                        .replace(/:( *[0-9]+(\.[0-9]+)? *)(,?\n)/g, `:${color(33, "$1")}$3`)
                        .replace(/:( *(true|false) *)(,?\n)/g, `:${color(33, "$1")}$3`)
                        .replace(/(\n *("|')*.*\2):/g, `${color(35, "$1")}:`)
                    }\x1b[0m`;
                };

                console.log(`\x1b[31m✘ \x1b[1m∟ ${index}\x1b[0m${record.position ? ` \x1b[2m(${record.position})\x1b[0m` : ""}\n`);
                console.log("\x1b[1m\x1b[2mEXPECTED:\x1b[0m\n");
                console.log(printObj(record.expected));
                console.log("\n\x1b[1m\x1b[2mACTUAL:\x1b[0m\n");
                console.log(printObj(record.actual));
                console.log(`\x1b[0m\x1b[2m${Array.from({ length: instance.label.length + 2 }, () => "–").join("")}\x1b[0m`);
            });
        });
    });

    writeOrig(`\n${
        !counter.failure
        ? `\x1b[32m✔ Test suite \x1b[1msucceeded\x1b[22m`
        : `\x1b[31m✘ Test suite \x1b[1mfailed\x1b[22m`
    } (${
        Math.round((counter.success / (counter.success + counter.failure) || 1) * 100)
    }% (${counter.success}/${counter.success + counter.failure}) successful, ${
        Math.round((Date.now() - START_TIME) * 0.001)
    }s)\x1b[0m\n`);

    await evalIntermediateScript(AFTER_SCRIPT_FILENAME);

    return counter.failure ? 1 : 0;
});
[ "SIGINT", "SIGTERM", "SIGQUIT", "SIGUSR1", "SIGUSR2" ]
.forEach(signal => {
    process.on(signal, () => process.exit(1));
});
process.on("uncaughtException", err => {
    clearProgressLog();
    writeOrig(() => {
        console.error(`\n\x1b[31m\x1b[1m${err.name}\x1b[22m: ${err.message}\n\n${err.stack}\x1b[0m\n`);
    });

    process.exit(1);
});


class ATest {
    static instances = [];
    static openTestCases = 0;
    static endTimeout = setTimeout(() => {
        if(ATest.openTestCases) return;
        process.exit(0);
    }, 500);

    constructor(label, endTimeout = 0) {
        this.label = label;
        this.endTimeout = endTimeout;
        this.records = [];
        
        ATest.instances.push(this);
    }

    eval(...args) {
        throw new SyntaxError("Missing implementation of abstract method 'eval()'");
    }

    compare(actual, expected) {
        throw new SyntaxError("Missing implementation of abstract method 'compare()'");
    }

    actual(...args) {
        ATest.openTestCases++;

        let position;
        try {
            throw new Error();
        } catch(err) {
            try {
                position = err.stack
                .split(/\n/g)[2]
                .match(/(\/[^/ ]*)+/g)[0]
                .slice(0, -1);
            } catch {}
        }

        const actual = this.eval(...args);

        return {
            expected: (expected) => {
                (!(actual instanceof Promise)
                ? new Promise(r => r(actual))
                : actual)
                .then(actual => {
                    if(!--ATest.openTestCases) {
                        clearTimeout(ATest.endTimeout);
                        ATest.endTimeout = setTimeout(() => {
                            if(ATest.openTestCases) return;
                            process.exit(0);
                        }, this.endTimeout);
                    }
                    
                    const comparison = this.compare(actual, expected);
                    this.records.push({
                        position,

                        isMismatch: comparison.isMismatch,

                        actual: comparison.actual || actual,
                        expected: comparison.expected || expected
                    });
                });

                return this;
            }
        };
    }
}

module.exports.ATest = ATest;
module.exports.init = function(title, badgeColorRGB) {
    writeOrig(`\n\x1b[1m\x1b[48;2;${badgeColorRGB.join(";")}m\x1b[38;5;231m ${title.toUpperCase()} \x1b[0m\n`);

    const traversePath = (path) => {
        readdir(path, {
            withFileTypes: true
        }, (err, dirents) => {
            if(err) throw err;

            dirents.forEach(dirent => {
                const filePath = join(path, dirent.name);

                if(dirent.isDirectory()) {
                    traversePath(filePath);

                    return;
                }
                if(!/^[^#].*\.test\.js$/.test(basename(filePath))) return;

                require(filePath);
            });
        });
    };
    evalIntermediateScript(BEFORE_SCRIPT_FILENAME)
    .then(() => {
        const symLength = 3;
        const maxLength = title.length + 2;
        let i = -1;
        progressInterval = setInterval(() => {
            i = ++i % (maxLength + (2 * symLength));
            
            writeOrig(() => {
                process.stdout.clearLine(1);
                process.stdout.cursorTo(0);
                process.stdout.write("\x1b[?25l");
                process.stdout.write(`\x1b[1m\x1b[38;2;200;180;0m${
                    `${
                        Array.from({ length: i }, () => " ").join("")
                    }${
                        Array.from({ length: symLength }, () => ".").join("")
                    }`
                    .slice(symLength, maxLength + symLength)
                }\x1b[0m`);
            });
        }, 75)
        .unref();

        traversePath(TEST_PATH);
    });
};