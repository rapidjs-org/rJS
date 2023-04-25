const { join } = require("path");
const { existsSync, readdirSync, lstatSync } = require("fs");


setImmediate(() => process.on("exit", (code) => {
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
    static exitTimeout;
    static lastFrameLabel;
    static lastFileLabel;
    static customEquals;
    static customPrepare;

    static init(config = {}) {
        if(!existsSync(TestFramework.testPath)) throw new ReferenceError(`Test directory not found '${TestFramework.testPath}'`);

        console.log(`\n\x1b[1m\x1b[48;2;${config.badgeColorBg.join(";")}m${config.badgeFgLight ? "\x1b[97m" : ""} ${config.name.toUpperCase()} TESTS \x1b[0m`);
        
        TestFramework.scanDir(TestFramework.testPath);
    }

    static serialize(value) {
        return ![ "string", "number", "boolean" ].includes(typeof(value))
        ? JSON.stringify(value)
        : value;
    }

    static scanDir(path) {
        if(!lstatSync(path).isDirectory()) {
            TestFramework.lastFileLabel = path.match(/[^/]+$/)[0];

            require(path);

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

            TestFramework.lastFileLabel = dirent.name;

            require(subPath);
        });
    }
    
    static async evaluate(label, actual, expected, evalCallback) {
        const fileLabel = TestFramework.lastFileLabel;
        TestFramework.lastFileLabel = null;
        const frameLabel = TestFramework.lastFrameLabel;
        TestFramework.lastFrameLabel = null;

        let error;
        try {
            actual = await TestFramework.prepare(actual, label);
        } catch(err) {
            error = err;
        }

        if(!expected || !evalCallback) throw new SyntaxError(`Illegal assertion: Expects 3 arguments, given ${args.length}`);

        fileLabel
        && console.log(`\n\x1b[2m•\x1b[0m \x1b[36m${fileLabel}\x1b[0m${!frameLabel ? "\n" : ""}`);
        frameLabel
        && console.log(`\n\x1b[1m${frameLabel}\x1b[0m\n`);
        
        TestFramework.isNewFile = false;

        let wasSuccessful;
        try {
            wasSuccessful = evalCallback(actual, expected, error);
        } catch(err) {
            error = err;
        }

        TestFramework.stats[wasSuccessful ? "successful" : "failed"]++;
        
        console.log(`${
            wasSuccessful
            ? `\x1b[1m\x1b[32m✓\x1b[0m \x1b[2m${label}\x1b[0m`
            : `\x1b[1m\x1b[31m✗\x1b[0m \x1b[31m${label}\x1b[0m`
        }`);

        if(wasSuccessful) return;

        console.log(`
            \x1b[2mActual:\x1b[0m    \x1b[31m${TestFramework.serialize(actual)}\x1b[0m${(actual == expected) ? ` \x1b[2m(${typeof(actual)})\x1b[0m` : ""}
            \x1b[2mExpected:\x1b[0m  \x1b[34m${TestFramework.serialize(expected)}\x1b[0m${(actual == expected) ? ` \x1b[2m(${typeof(expected)})\x1b[0m` : ""}
            \x1b[2m${ Array.from({ length: label.length }, () => "–").join("") }\x1b[0m
        `
        .replace(/(\n+)\s+/g, "$1  ")
        .replace(/^\n|\n\s*$/g, ""));

        error
        && console.error(`\x1b[2m\x1b[31m${error.name}: ${error.message.slice(0, 20)}${(error.message.length > 20) ? "…" : ""}\x1b[0m`);
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

                        console.error(new EvalError("Preparation of actual test value timed out"));

                        process.exit(1);
                    }, 3000);
                    
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

    static definePrepare(callback) {
        TestFramework.customPrepare = callback; 
    }

    static defineEquals(callback) {
        TestFramework.customEquals = callback;
    }

}


exports.TestFramework = TestFramework;


global.frame = function(label, scopeCallback = (() => {})) {
    TestFramework.lastFrameLabel = label;
    
    scopeCallback();
};


global.assertEquals = async (label, actual, expected) => {
    const origEquals = (actual, expected) => {
        return (TestFramework.serialize(actual) === TestFramework.serialize(expected));
    };

    TestFramework.evaluate(label,
        actual, expected,
        (actual, expected) => {
            return (TestFramework.customEquals ?? origEquals)(actual, expected, origEquals);
        });
};

global.assertError = async (label, actual) => {
    TestFramework.evaluate(label, actual, "\x1b[3mError\x1b[23m",
        (_, __, error) => {
            return (error instanceof Error);
        }
    );
};