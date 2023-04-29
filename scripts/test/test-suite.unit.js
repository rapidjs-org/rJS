const { TestFramework } = require("./framework");


TestFramework.definePrepare(actual => {
    return (actual instanceof Function)
    ? actual()
    : actual;
});


TestFramework.init({
    name: "Unit",
    badgeColorBg: [ 255, 220, 220 ]
});