module.exports.CONSTANT = "value1";

module.exports.sum__declaration = function(a, b) { return a + b; };

module.exports.sum__expression = (a, b) => a + b;

module.exports.sumWithContext = (a, CONTEXT, b) => {
    return `${CONTEXT.clientIP} | ${a + b}`;
};