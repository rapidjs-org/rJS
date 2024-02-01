const { deepStrictEqual } = require("assert");

const testFramework = require("./test");


global.UnitTest = class extends testFramework.ATest {
    constructor(title) {
        super(title, 0, true);
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
}


testFramework.init("Unit Tests", [ 159, 57, 219 ]);