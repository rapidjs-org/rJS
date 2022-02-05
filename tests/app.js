const { spawn } = require("child_process");
const { join } = require("path");
const http = require("http");


module.exports = (args = []) => {
    return new Promise((resolve, reject) => {
        console.log(join(__dirname, "./static/server"))
        const app = spawn(join(__dirname, "./static/server"), args);

        process.on("exit", shutdown);
        log("STARTED");


        function log(state) {
            console.log(`• Test app ${state} [${["-D", "--dev"].includes(args[0]) ? "DEV" : "PROD"} MODE]\n`);
        }
        function shutdown() {
            app.kill("SIGINT");
            log("STOPPED");
        }
        

        app.on("message", msg => {
            console.log(msg);
            resolve();
        });
        return {};
        resolve({
            shutdown: shutdown,

            approach: (method, href, body) => {
                const options = {
                    hostname: "localhost",
                    port: 7373,
                    path: href,
                    method: method
                };

                return new Promise((resolve, reject) => {
                    const req = http.request(options, res => {
                        res.on("data", data => {
                            console.log(data)
                            resolve({
                                status: res.statusCode,
                                headers: res.headers,
                                data: data
                            });
                        });
                    });

                    req.on("error", err => {
                        reject(err);
                    });

                    body && req.write(JSON.stringify(body));
                });
            }
        })
    });
};