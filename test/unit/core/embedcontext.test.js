const { join } = require("path");


const { EmbedContext } = require("../../../debug/core/EmbedContext");


const testArgs = [
    "start", "./debug/apps/a/app.js", "-H", "hostname1,hostname2", "--port", 81, "-S", "-W", "./app/", "-D"
];

const testContext = new EmbedContext(testArgs);


assertEquals("Args array", testContext.args, testArgs);
assertEquals("Concrete app module path", testContext.concreteAppModulePath, join(process.cwd(), testArgs[1]));
assertEquals("Hostnames", testContext.hostnames, testArgs[3].split(","));
assertEquals("Whether establishes secure conncections", testContext.isSecure, true);
assertEquals("Port", testContext.port, testArgs[5]);
assertEquals("Specific app path / working directory", testContext.path, join(process.cwd(), testArgs[8]));
assertEquals("Runtime mode is DEV", testContext.mode.DEV, true);
assertEquals("Runtime mode is not PROD", testContext.mode.PROD, false);