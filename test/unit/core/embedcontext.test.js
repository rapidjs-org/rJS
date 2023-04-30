const { join } = require("path");


const testArgs = [
    "start", "./debug/apps/a/app.js", "-H", "hostname1,hostname2", "--port", 81, "-S", "-W", "./app/", "-D"
];

process.argv = process.argv.slice(0, 2).concat(testArgs);


const { EmbedContext } = require("../../../debug/core/EmbedContext");


frame("Global scope", () => {

    assertEquals("Args array", EmbedContext.global.args, testArgs);
    assertEquals("Concrete app module path", EmbedContext.global.concreteAppModulePath, join(process.cwd(), testArgs[1]));
    assertEquals("Hostnames", EmbedContext.global.hostnames, testArgs[3].split(","));
    assertEquals("Whether establishes secure conncections", EmbedContext.global.isSecure, true);
    assertEquals("Port", EmbedContext.global.port, testArgs[5]);
    assertEquals("Specific app path / working directory", EmbedContext.global.path, join(process.cwd(), testArgs[8]));
    assertEquals("Runtime mode is DEV", EmbedContext.global.mode.DEV, true);
    assertEquals("Runtime mode is not PROD", EmbedContext.global.mode.PROD, false);

});

const testContext = new EmbedContext(testArgs);

frame("Individual scope", () => {

    assertEquals("Args array", testContext.args, testArgs);
    assertEquals("Concrete app module path", testContext.concreteAppModulePath, join(process.cwd(), testArgs[1]));
    assertEquals("Hostnames", testContext.hostnames, testArgs[3].split(","));
    assertEquals("Whether establishes secure conncections", testContext.isSecure, true);
    assertEquals("Port", testContext.port, testArgs[5]);
    assertEquals("Specific app path / working directory", testContext.path, join(process.cwd(), testArgs[8]));
    assertEquals("Runtime mode is DEV", testContext.mode.DEV, true);
    assertEquals("Runtime mode is not PROD", testContext.mode.PROD, false);

});