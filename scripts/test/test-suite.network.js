const { lstatSync, existsSync } = require("fs");
const { join, dirname } = require("path");
const http = require("http");
const https = require("https");

const { TestFramework } = require("./framework");


process.on("exit", async () => {
    console.log();

    await evalEnvScript("cleanup");
});


TestFramework.definePrepare(performRequest);

TestFramework.defineEquals((actual, expected, origEquals) => {
    const isAtomic = value => [ "string", "number", "boolean" ].includes(typeof(value));

    if(isAtomic(expected)) {
        return origEquals(actual.message, expected) ? true : {
            actual: actual.message ?? ""
        };
    }

    const failedDisplay = {
        actual: {}, expected: {}
    };

    let hasFailed = false;

    for(let key in expected) {
        if(origEquals(actual[key], expected[key])) continue;

        failedDisplay.actual[key] = actual[key];
        failedDisplay.expected[key] = expected[key];

        hasFailed = true;
    }

    return hasFailed ? failedDisplay : true;
});


evalEnvScript("setup", () => {
    process.stdout.write("\x1b[0m");
    
    TestFramework.init({
        name: "Network",
        badgeColorBg: [ 220, 220, 255 ],
        testCaseTimeout: 5000
    });
});


async function evalEnvScript(label, proceedCallback = (() => {})) {
    const envScriptPath = join(
        !lstatSync(TestFramework.testPath).isDirectory() ? dirname(TestFramework.testPath) : TestFramework.testPath
    , `network.${label}.js`);
    
    if(!existsSync(envScriptPath)) return proceedCallback(false);
    
    console.log(`\x1b[1m\x1b[2m\x1b[4m⁞ ENVIRONMENT ${label.toUpperCase()}\x1b[0m\x1b[2m\x1b[74m`);
    
    new Promise(resolve => {
        global.COMPLETE = (() => resolve());

        require(envScriptPath);

        setTimeout(resolve, 5000);
    }).then(proceedCallback);
}

function performRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint.url);
                
        const req = ((url.protocol.toLowerCase() === "https") ? https : http)
        .request({
            hostname: url.hostname,
            port: url.port,
            pathname: url.pathname,
            method: endpoint.method || "GET",
            headers: endpoint.headers || {}
        }, res => {
            res.on("data", message => {
                resolve({
                    headers: res.headers,
                    status: res.statusCode,
                    message: JSON.parse(JSON.stringify(String(message)))
                });
            });
            res.on("end", () => {
                resolve({
                    headers: res.headers,
                    status: res.statusCode,
                    message: null
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