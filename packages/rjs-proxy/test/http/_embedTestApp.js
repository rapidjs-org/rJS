const { join } = require("path");
const { readFileSync } = require("fs");


const API = require("../../build/api");


module.exports.embedTestApp = (hostname) => {
    const workingDirPath = join(__dirname, hostname);
    return API.embed(require("./_PORT"), {
        hostnames: hostname,
        tls: {
            key: "./key.pem",                                       // as (relative) path
            cert: readFileSync(join(workingDirPath, "cert.pem"))    // as data buffer
        },
        workingDirPath
    });
};