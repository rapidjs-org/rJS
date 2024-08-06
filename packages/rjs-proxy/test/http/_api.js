const { join } = require("path");
const { readFileSync } = require("fs");


const PROXY_API = require("../../build/api");


module.exports.embedTestApp = (hostname, alternativeHostnames = []) => {
    const workingDirPath = join(__dirname, hostname);
    return PROXY_API.embed(require("./_PORT"), {
        hostnames: [ hostname, alternativeHostnames ].flat(),
        tls: {
            key: "./key.pem",                                       // as (relative) path
            cert: readFileSync(join(workingDirPath, "cert.pem"))    // as data buffer
        },
        workingDirPath
    });
};