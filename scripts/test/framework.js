const { join } = require("path");
const { existsSync, readdirSync } = require("fs");


class TestFramework {

    static context;
    static evalQueue = [];
    static lastFrameLabel;
    static lastFileLabel;
    
    static serialize(value) {
        return ![ "string", "number", "boolean" ].includes(typeof(value))
        ? JSON.stringify(value)
        : value;
    }

    constructor(config = {}, prepareCallback = (a => a)) {
        const testDirPath = join(process.cwd(), process.argv.slice(2)[0] ?? "test");
        
        if(!existsSync(testDirPath)) throw new ReferenceError(`Test directory not found '${testDirPath}'`);

        process.on("exit", () => {
            const totalAssertions = this.stats.failed + this.stats.successful;

            if(!totalAssertions) return;

            const resultsStr = `(${this.stats.successful}/${totalAssertions}) ~ ${Math.round((this.stats.successful / Math.max(totalAssertions, 1)) * 100)}% successful`;

            console.log();

            this.stats.failed
            ? console.log(`\x1b[1m\x1b[2m→\x1b[0m \x1b[31mTest suite failed: ${resultsStr}\x1b[0m`)
            : console.log(`\x1b[1m\x1b[2m→\x1b[0m \x1b[32mTest suite successfully completed: ${resultsStr}\x1b[0m`);

            console.log();

            process.exit(this.stats.failed ? 1 : 0);
        });

        console.log(`\n\x1b[1m\x1b[48;2;${config.badgeColorBg.join(";")}m${config.badgeFgLight ? "\x1b[97m" : ""} ${config.name.toUpperCase()} TESTS \x1b[0m`);
        
        this.stats = {
            failed: 0,
            successful: 0
        };
        this.prepareCallback = prepareCallback;
        
        TestFramework.context = this;

        this.scanDir(testDirPath);
    }

    scanDir(path) {
        readdirSync(path, {
            withFileTypes: true
        })
        .forEach(dirent => {
            const subPath = join(path, dirent.name);

            if(dirent.isDirectory()) {
                this.scanDir(subPath);

                return;
            }
            
            if(!/.*\.test\.js$/.test(dirent.name)) return;

            TestFramework.lastFileLabel = dirent.name;

            require(subPath);
        });
    }

    async evaluate(label, actual, expected, evalCallback) {
        const fileLabel = TestFramework.lastFileLabel;
        TestFramework.lastFileLabel = null;
        const frameLabel = TestFramework.lastFrameLabel;
        TestFramework.lastFrameLabel = null;

        let error;
        try {
            actual = await TestFramework.context.prepare(actual);
        } catch(err) {
            error = err;
        }

        if(!expected || !evalCallback) throw new SyntaxError(`Illegal assertion: Expects 3 arguments, given ${args.length}`);

        fileLabel
        && console.log(`\n\x1b[2m•\x1b[0m \x1b[36m${fileLabel}\x1b[0m${!frameLabel ? "\n" : ""}`);
        frameLabel
        && console.log(`\n\x1b[1m${frameLabel}\x1b[0m\n`);
        
        TestFramework.isNewFile = false;

        const wasSuccessful = evalCallback(actual, expected, error);

        this.stats[wasSuccessful ? "successful" : "failed"]++;
        
        console.log(`${
            wasSuccessful
            ? `\x1b[1m\x1b[32m✓\x1b[0m \x1b[2m${label}\x1b[0m`
            : `\x1b[1m\x1b[31m✗\x1b[0m \x1b[31m${label}\x1b[0m`
        }`);

        if(wasSuccessful) return;

        console.log(`
            \x1b[2mActual:\x1b[0m    \x1b[31m${error ? `\x1b[3mError:\x1b[23m] {err.name}` : TestFramework.serialize(actual)}\x1b[0m${(actual == expected) ? ` \x1b[2m(${typeof(actual)})\x1b[0m` : ""}
            \x1b[2mExpected:\x1b[0m  \x1b[34m${TestFramework.serialize(expected)}\x1b[0m${(actual == expected) ? ` \x1b[2m(${typeof(expected)})\x1b[0m` : ""}
            \x1b[2m${ Array.from({ length: label.length }, () => "–").join("") }\x1b[0m
        `
        .replace(/(\n+)\s+/g, "$1  ")
        .replace(/^\n|\n\s*$/g, ""));

        error
        && console.error(`\x1b[2m\x1b[31m${error.name}: ${error.message.slice(0, 20)}${(error.message.length > 20) ? "…" : ""}\x1b[0m`);
    }

    async prepare(actual) {
        const actualValue = new Promise((resolve, reject) => {
            TestFramework.evalQueue
            .push(async () => {
                let prepareTimeout;
                try {
                    prepareTimeout = setTimeout(() => {
                        throw new Timeout();
                    }, 5000);
                    
                    actual = this.prepareCallback(actual);

                    const result = (actual instanceof Promise)
                    ? (await actual)
                    : actual;

                    resolve(result);
                } catch(err) {
                    reject(err);
                } finally {
                    clearTimeout(prepareTimeout);
                }
                
                (TestFramework.evalQueue.shift() ?? (() => {}))();
            });
        });
        
        (TestFramework.evalQueue.length === 1)
        && TestFramework.evalQueue[0]();

        return actualValue;
    }

}


exports.TestFramework = TestFramework;


global.frame = function(label, scopeCallback = (() => {})) {
    TestFramework.lastFrameLabel = label;
    
    scopeCallback();
};


global.assertEquals = async (label, actual, expected) => {
    TestFramework.context
    .evaluate(label,
        actual, expected,
        (actual, expected) => {
            return (TestFramework.serialize(actual) === TestFramework.serialize(expected));
        });
};

global.assertError = async (label, actual) => {
    TestFramework.context
    .evaluate(label, actual, "\x1b[3mError\x1b[23m",
        (_, __, error) => {
            return (error instanceof Error);
        }
    );
};