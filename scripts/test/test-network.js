const { lstatSync, existsSync } = require("fs");
const { join, dirname } = require("path");
const http = require("http");
const https = require("https");

const { TestFramework } = require("./framework");


const separator = `\x1b[2m\x1b[75m${Array.from({ length: 30 }, _ => {}).join("–")}\x1b[0m`;


process.on("exit", async () => {
    console.log();

    evalEnvScript("cleanup");

    console.log(separator);
});

evalEnvScript("setup", (hasSetup) => {
    (!hasSetup
        ? new Promise(resolve => resolve())
        : new Promise(resolve => {

            global.SETUP = () => {
                console.log(separator);

                resolve();
            };

        }))
    .then(() => {
        new TestFramework({
            name: "Network",
            badgeColorBg: [ 200, 255, 200 ]
        }, endpoint => {
            return performRequest(endpoint);
        });
    });
});


async function evalEnvScript(label, proceedCallback) {
    const envScriptPath = join(
        !lstatSync(TestFramework.testPath).isDirectory() ? dirname(TestFramework.testPath) : TestFramework.testPath
    , `network.${label}.js`);

    if(!existsSync(envScriptPath)) return proceedCallback(false);
    
    console.log(`${separator}\n\x1b[1m\x1b[2m\x1b[4mENVIRONMENT ${label.toUpperCase()}\x1b[0m\x1b[2m\x1b[74m`);
    
    require(envScriptPath);
    
    proceedCallback(true);
}

function performRequest(endpoint) {
    return new Promise((_, reject) => {
        const url = new URL(endpoint.url);

        const req = ((url.protocol.toLowerCase() === "https")
        ? https
        : http)
        .request({
            hostname: url.hostname,
            port: url.port,
            path: url.href,
            method: endpoint.method || "GET",
            headers: endpoint.headers || {}
        }, res => {
            res.on("data", message => {
                message = String(message);
                
                join(__dirname, {
                    headers: res.headers,
                    status: res.statusCode,
                    message: {
                        json: _ => JSON.parse(message),
                        text: _ => message
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