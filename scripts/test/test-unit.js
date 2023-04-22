const { TestFramework } = require("./framework");


new TestFramework({
    name: "Unit",
    badgeColorBg: [ 245, 199, 199 ]
}, actual => {
    return (actual instanceof Function)
    ? actual()
    : actual;
});