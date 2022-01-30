/**
 * Custom test suite framework.
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */


const {readdirSync} = require("fs");
const {join} = require("path");


/**
 * Class representing a call related test case.
 * To be checked againat expected value using method for().
 */
 class Test {
    static counter = {
        passed: 0,
        failed: 0
    };

    constructor(caption, call, options) {
        this.caption = caption;
        this.call = call;
        this.options = options;
    }

    /**
     * Evaluate test against expected value.
     * @param {*} expected Expected value
     */
    for(expected) {
        if(this.call === expected) {
            log(`✓ ${this.caption}`, "36m");

            Test.counter.passed++;

            return;
        }

        log(`✗ ${this.caption}`, "31m");
        log(`\nExpected:    ${expected}`);
        log(`Call result: ${this.call}\n`);
        
        Test.counter.failed++;
    }
}

/**
 * Log an optionally styled message to the console.
 * @param {String} message Message
 * @param {String|String[]} styles Optional message style in console code representation
 */
function log(message, styles) {
    if(styles) {
        styles = (!Array.isArray(styles)
        ? [styles]
        : styles)
        .map(style => `\x1b[${style}`)
        .join("");
    }
    
	console.log(`${styles || ""}%s\x1b[0m`, message);
}


/**
 * Globally accessible test creation interface.
 * @param {String} caption Test title for identification
 * @param {*} call Instantly evaluated call returned value for reference
 * @param {Object} [options] Optional options object
 * @returns {Test} Test object with expectation check up member
 */
global.test = (caption, call, options) => {
    return new Test(caption, call, options);
};


// Eval test modules located in /tests directory (single level)
const testsDirPath = join(__dirname, "../tests");
readdirSync(testsDirPath, {
    withFileTypes: true
})
.filter(dirent => {
    return /^.*\.test\.js$/.test(dirent.name.toLowerCase());
})
.forEach(dirent => {
    const section = dirent.name
    .replace(/\.test\.js$/i, "")
    .split(/\./g)
    .map(part => {
        return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");

    log(`• ${section}:`, "33m");

    const curPath = join(testsDirPath, dirent.name);
    
    require(curPath);
});


// Log overall result message
log(`\n${Test.counter.passed}/${Test.counter.passed + Test.counter.failed} unit tests passed.`);


// Exit with error code if test cases were not fulfilled with overall passed
// Keeps chained scripts from continuing evaluation if tests suite failed
process.exit((Test.counter.failed > 0) ? 1 : 0);