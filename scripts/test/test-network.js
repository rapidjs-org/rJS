const { lstatSync, existsSync } = require("fs");
const { join, dirname } = require("path");
const http = require("http");
const https = require("https");

const { TestFramework } = require("./framework");


process.on("exit", async () => {
    console.log();

    evalEnvScript("cleanup");
});


TestFramework.definePrepare(endpoint => {
    return performRequest(endpoint);
});

TestFramework.defineEquals((actual, expected, origEquals) => {
    const isAtomic = value => [ "string", "number", "boolean" ].includes(typeof(value));

    if(isAtomic(expected)) {
        return origEquals(actual.message, (expected));
    }

    for(let key in expected) {
        if(!origEquals(actual[key], expected[key])) return false;
    }

    return true;
});


evalEnvScript("setup", (hasSetup) => {
    (!hasSetup
    ? new Promise(resolve => resolve())
    : new Promise(resolve => {
        global.SETUP = () => resolve();
    }))
    .then(() => {
        process.stdout.write("\x1b[0m");

        TestFramework.init({
            name: "Network",
            badgeColorBg: [ 220, 220, 255 ]
        });
    });
});


async function evalEnvScript(label, proceedCallback) {
    const envScriptPath = join(
        !lstatSync(TestFramework.testPath).isDirectory() ? dirname(TestFramework.testPath) : TestFramework.testPath
    , `network.${label}.js`);

    if(!existsSync(envScriptPath)) return proceedCallback(false);
    
    console.log(`\x1b[1m\x1b[2m\x1b[4m⁞ ENVIRONMENT ${label.toUpperCase()}\x1b[0m\x1b[2m\x1b[74m`);
    
    require(envScriptPath);
    
    proceedCallback(true);
}

function performRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint.url);
        
        const req = ((url.protocol.toLowerCase() === "https") ? https : http)
        .request({
            hostname: url.hostname,
            port: url.port,
            path: url.href,
            method: endpoint.method || "GET",
            headers: endpoint.headers || {}
        }, res => {
            res.on("data", message => {
                message = String(message);
                
                resolve({
                    headers: res.headers,
                    status: res.statusCode,
                    message: JSON.parse(JSON.stringify(message))
                });
            });
            res.on("end", () => {
                resolve({
                    headers: res.headers,
                    status: res.statusCode,
                    message: {
                        json: _ => null,
                        text: _ => null
                    }
                });
            });
        });

        req.on("error", err => {
            reject(err);
        });

        endpoint.body
        && req.write(JSON.stringify(endpoint.body));

        req.end();
    });
}