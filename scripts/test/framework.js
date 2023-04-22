const { join } = require("path");
const { existsSync, readdirSync } = require("fs");


global.frame = function(label, scopeCallback = (() => {})) {
    TestFramework.lastFrameLabel = label;
    
    scopeCallback();
};


class TestFramework {

    static evalQueue = [];
    static lastFrameLabel;
    
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

        console.log(`\n\x1b[1m\x1b[48;2;${config.badgeColorBg.join(";")}m${config.badgeFgLight ? "\x1b[97m" : ""} ${config.name.toUpperCase()} TESTS \x1b[0m\n`);
        
        this.stats = {
            failed: 0,
            successful: 0
        };
        this.prepareCallback = prepareCallback;
        
        global.assertEquals = (...args) => this.assertEquals.apply(this, args);

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

            require(subPath);
        });
    }

    evaluate(label, actual, expected, evalCallback, frameLabel) {
        if(!expected || !evalCallback) throw new SyntaxError(`Illegal assertion: Expects 3 arguments, given ${args.length}`);

        frameLabel
        && console.log(`\n\x1b[1m${frameLabel}\x1b[0m\n`);
        
        const wasSuccessful = evalCallback(actual, expected);

        this.stats[wasSuccessful ? "successful" : "failed"]++;
        
        console.log(`${
            wasSuccessful
            ? `\x1b[1m\x1b[32m✓\x1b[0m \x1b[2m${label}\x1b[0m`
            : `\x1b[1m\x1b[31m✗\x1b[0m \x1b[31m${label}\x1b[0m`
        }`);

        !wasSuccessful
        && console.log(`
            \x1b[2mActual:\x1b[0m    \x1b[31m${TestFramework.serialize(actual)}\x1b[0m
            \x1b[2mExpected:\x1b[0m  \x1b[34m${TestFramework.serialize(expected)}\x1b[0m
            \x1b[2m${ Array.from({ length: label.length }, () => "–").join("") }\x1b[0m
        `
        .replace(/(\n+)\s+/g, "$1  ")
        .replace(/^\n|\n\s*$/g, ""));
    }

    async assert(actual) {
        const actualValue = new Promise(resolve => {
            TestFramework.evalQueue
            .push(async () => {
                actual = this.prepareCallback(actual);

                const result = (actual instanceof Promise)
                ? (await actual)
                : actual;

                resolve(result);
                
                (TestFramework.evalQueue.shift() ?? (() => {}))();
            });
        });
        
        (TestFramework.evalQueue.length === 1)
        && TestFramework.evalQueue[0]();

        return actualValue;
    }
    
    async assertEquals(label, actual, expected) {
        const frameLabel = TestFramework.lastFrameLabel;
        TestFramework.lastFrameLabel = null;

        this.evaluate(label,
            (await this.assert(actual)), expected,
            (actual, expected) => {
                return (TestFramework.serialize(actual) === TestFramework.serialize(expected));
            },
            frameLabel);
    };

}


exports.TestFramework = TestFramework;