const { deepStrictEqual } = require("assert");

const { Test } = require("./Test");


global.UnitTest = class extends Test {
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