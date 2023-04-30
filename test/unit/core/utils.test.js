const testArgs = [
    "-H", "hostname1,hostname2"
];

process.argv = process.argv.slice(0, 2).concat(testArgs);


const utils = require("../../../debug/core/utils");


assertEquals("Unix socket IPC endpoint path", utils.locateProxySocket(80), "/tmp/rjs.proxy.80.sock");

assertEquals("Hostname display caption", utils.captionEffectiveHostnames(), "hostname1 (+1)");