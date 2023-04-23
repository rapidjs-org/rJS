const { TestFramework } = require("./framework");


new TestFramework({
    name: "Unit",
    badgeColorBg: [ 255, 200, 200 ]
}, actual => {
    return (actual instanceof Function)
    ? actual()
    : actual;
});