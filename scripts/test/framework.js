const { join } = require("path");
const { existsSync, readdirSync, lstatSync } = require("fs");


setImmediate(() => process.on("exit", (code) => {
    if(TestFramework.intermediateErrors.length) {
        console.log();
        
        TestFramework.intermediateErrors.forEach(err => {
            console.error(`\x1b[31m${err.stack ? err.stack : `${err.name}: ${err.message}`}\x1b[0m\n`);
        });

        code = 1;
    }

    if(code) return code;

    const totalAssertions = TestFramework.stats.failed + TestFramework.stats.successful;

    if(!totalAssertions) return;

    const resultsStr = `(${TestFramework.stats.successful}/${totalAssertions}) ~ ${Math.round((TestFramework.stats.successful / Math.max(totalAssertions, 1)) * 100)}% successful`;

    console.log();

    TestFramework.stats.failed
    ? console.log(`\x1b[1m\x1b[2m→\x1b[0m \x1b[31mTest suite failed: ${resultsStr}\x1b[0m`)
    : console.log(`\x1b[1m\x1b[2m→\x1b[0m \x1b[32mTest suite successfully completed: ${resultsStr}\x1b[0m`);

    console.log();

    return TestFramework.stats.failed ? 1 : 0;
}));


class TestFramework {

    static stats = {
        failed: 0,
        successful: 0
    };
    static testPath = join(process.cwd(), process.argv.slice(2)[0] ?? "test");
    static evalQueue = [];
    static lastWasFramed = false;
    static frameID = 0;
    static consumedFrameIDs = [];
    static suppressError = false;
    static intermediateErrors = [];
    static curFrameLabel;
    static curFileLabel;
    static exitTimeout;
    static customEquals;
    static customPrepare;
    static testCaseTimeout;

    static init(config = {}, testCaseTimeout = 3000) {
        if(!existsSync(TestFramework.testPath)) throw new ReferenceError(`Test target not found '${TestFramework.testPath}'`);
        
        console.log(`\n\x1b[1m\x1b[48;2;${config.badgeColorBg.join(";")}m${config.badgeFgLight ? "\x1b[97m" : ""} ${config.name.toUpperCase()} TESTS \x1b[0m`);
        
        TestFramework.scanDir(TestFramework.testPath);

        TestFramework.testCaseTimeout = testCaseTimeout;
    }

    static serialize(value) {
        return ![ "string", "number", "boolean" ].includes(typeof(value))
        ? JSON.stringify(value)
        : value;
    }

    static scanDir(path) {
        if(!lstatSync(path).isDirectory()) {
            TestFramework.curFileLabel = path.match(/[^/]+$/)[0];

            TestFramework.evalTestModule(path);

            return;
        }

        readdirSync(path, {
            withFileTypes: true
        })
        .forEach(dirent => {
            const subPath = join(path, dirent.name);

            if(dirent.isDirectory()) {
                TestFramework.scanDir(subPath);

                return;
            }
            
            if(!/.*\.test\.js$/.test(dirent.name)) return;

            TestFramework.curFileLabel = dirent.name;

            TestFramework.evalTestModule(subPath);
        });
    }
    
    static async evaluate(label, actual, expected, evalCallback, preserveError = false) {        
        const fileLabel = TestFramework.curFileLabel;
        TestFramework.curFileLabel = null;

        const frameLabel = TestFramework.curFrameLabel;

        TestFramework.suppressError = true;

        let error;
        try {
            actual = await TestFramework.prepare(actual, label);
        } catch(err) {
            error = err;

            !preserveError
            && console.error(err);
        }

        TestFramework.suppressError = false;

        fileLabel
        && console.log(`\n\x1b[2m•\x1b[0m \x1b[36m${fileLabel}\x1b[0m${!frameLabel ? "\n" : ""}`);

        if(frameLabel) {
            if(!TestFramework.consumedFrameIDs.includes(frameLabel.id)) {
                console.log(`\n\x1b[1m${frameLabel.caption}\x1b[0m\n`);

                TestFramework.consumedFrameIDs.push(frameLabel.id);
            }
        } else if(TestFramework.lastWasFramed) {
            !fileLabel
            && console.log("\n")

            TestFramework.lastWasFramed = false;
        }
        
        TestFramework.suppressError = true;

        let failedDisplay, wasSuccessful;
        try {
            failedDisplay = evalCallback(actual, expected, error);

            wasSuccessful = (failedDisplay && (failedDisplay !== true))
            ? false
            : failedDisplay;
            
            failedDisplay = wasSuccessful ? {} : failedDisplay;
        } catch(err) {
            error = err;
            
            !preserveError
            && console.error(err);
        }

        TestFramework.suppressError = false;

        TestFramework.stats[wasSuccessful ? "successful" : "failed"]++;
        
        console.log(`${
            wasSuccessful
            ? `\x1b[1m\x1b[32m✓\x1b[0m \x1b[2m${label}\x1b[0m`
            : `\x1b[1m\x1b[31m✗\x1b[0m \x1b[31m${label}\x1b[0m`
        }`);

        if(wasSuccessful) return;

        const displayActual = failedDisplay.actual ?? actual;
        const displayExpected = failedDisplay.expected ?? expected;

        console.log(`
            \x1b[2mActual:\x1b[0m    \x1b[${[ undefined, null ].includes(displayActual) ? 33 : 31}m${TestFramework.serialize(displayActual)}\x1b[0m${(actual == expected) ? ` \x1b[2m(${typeof(actual)})\x1b[0m` : ""}
            \x1b[2mExpected:\x1b[0m  \x1b[${[ undefined, null ].includes(displayExpected) ? 33 : 34}m${TestFramework.serialize(displayExpected)}\x1b[0m${(actual == expected) ? ` \x1b[2m(${typeof(expected)})\x1b[0m` : ""}
            \x1b[2m${ Array.from({ length: label.length }, () => "–").join("") }\x1b[0m
        `
        .replace(/(\n+)\s+/g, "$1  ")
        .replace(/^\n|\n\s*$/g, ""));

        error
        && console.error(`\x1b[2m\x1b[31m${error.name}: ${error.message.slice(0, 75)}${(error.message.length > 75) ? "…" : ""}\x1b[0m`);
    }

    static async prepare(actual, relatedLabel) {
        clearTimeout(TestFramework.exitTimeout);

        const actualValue = new Promise((resolve, reject) => {
            TestFramework.evalQueue
            .push(async () => {
                let prepareTimeout;
                try {
                    prepareTimeout = setTimeout(() => {
                        console.log(`\x1b[2m\x1b[31m⚠ ${relatedLabel}\x1b[0m`);

                        const err = new EvalError("Preparation of actual test value timed out");
                        console.error(`\x1b[31m${err.stack ? err.stack : `${err.name}: ${err.message}`}\x1b[0m\n`);

                        process.exit(1);
                    }, TestFramework.testCaseTimeout);
                    
                    actual = TestFramework.customPrepare(actual);

                    const result = (actual instanceof Promise)
                    ? (await actual)
                    : actual;

                    resolve(result);
                } catch(err) {
                    reject(err);
                } finally {
                    clearTimeout(prepareTimeout);
                }
                
                TestFramework.exitTimeout = setTimeout(() => {
                    if(TestFramework.evalQueue.length) return;
                    
                    process.exit(0);
                }, 3000);
                
                (TestFramework.evalQueue.shift() ?? (() => {}))();
            });
        });
        
        (TestFramework.evalQueue.length === 1)
        && TestFramework.evalQueue[0]();

        return actualValue;
    }

    static evalTestModule(path) {
        require(path);
        
        for(let key in require.cache) {
            if(!/\//.test(key)) continue;
            
            delete require.cache[key];
        }
    }

    static definePrepare(callback) {
        TestFramework.customPrepare = callback; 
    }

    static defineEquals(callback) {
        TestFramework.customEquals = callback;
    }

}


process.on("uncaughtException", err => {
    TestFramework.suppressError
    && TestFramework.intermediateErrors.push(err);
});


exports.TestFramework = TestFramework;


global.frame = function(label, scopeCallback = (() => {})) {
    TestFramework.curFrameLabel = {
        caption: label,
        id: TestFramework.frameID++
    };
    
    TestFramework.lastWasFramed = true;

    scopeCallback();

    TestFramework.curFrameLabel = null;
};


global.assertEquals = async (label, actual, expected) => {
    const origEquals = (actual, expected) => {
        return (TestFramework.serialize(actual) === TestFramework.serialize(expected));
    };

    TestFramework.evaluate(label, actual, expected,
    (actual, expected) => {
        return (TestFramework.customEquals ?? origEquals)(actual, expected, origEquals);
    });
};

global.assertError = async (label, actual) => {
    TestFramework.evaluate(label, actual, "\x1b[3mError\x1b[23m",
    (_, __, error) => {
        return (error instanceof Error);
    }, true);
};