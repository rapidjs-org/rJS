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
        success: 0,
        failed: 0
    };
    static globalSuccess = true;

    constructor(title, call) {
        this.title = title;
        this.call = call;
    }

    /**
     * Evaluate test against expected value.
     * @param {*} expected Expected value
     */
    for(expected) {
        if(this.call === expected) {
            log(`✓ ${this.title}`, "36m");

            Test.counter.success++;

            return;
        }

        log(`✗ ${this.title}`, "31m");
        log(`\nExpected:    ${expected}`);
        log(`Call result: ${this.call}\n`);

        Test.counter.failed++;
        Test.globalSuccess = false;
    }
}

/**
 * Globally accessible test creation interface.
 * @param {String} title Test title for identification
 * @param {*} call Instantly evaluated call returned value for reference
 * @returns {Test} Test object with expectation check up member
 */
global.test = (title, call) => {
    return new Test(title, call);
};


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


// Eval test modules located in /tests directory (single level)
const testsDirPath = join(__dirname, "../tests");
readdirSync(testsDirPath, {
    withFileTypes: true
})
.filter(dirent => {
    return /^.*\.test\.js$/.test(dirent.name.toLowerCase());
})
.forEach(dirent => {
    const curPath = join(testsDirPath, dirent.name);
    
    require(curPath);
});

// Log overall success message if all tests completed successfully
log(`\n${Test.counter.success}/${Test.counter.success + Test.counter.failed} unit tests passed.`);

// Exit with error code if test cases were not fulfilled with overall success
// Keeps chained scripts from continuing evaluation if tests suite failed
if(!Test.globalSuccess) {
    process.exit(1);
}