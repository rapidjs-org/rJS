const { createServer } = require("http");

const { Cluster } = require("../../build/api");


const PORT = 7100;


module.exports.BEFORE = new Promise(async (resolve) => {
    const cluster = new Cluster({
        modulePath: require("path").join(__dirname, "_adapter")
    }, {
        baseSize: 2
    })
    .on("stdout", message => process.stdout.write(message))
    .on("stderr", message => process.stderr.write(message))
    .on("online", () => {
        createServer(async (req, res) => {
            await cluster.handleRequest(
                {
                    url: req.url
                },
                req.socket
            );
            
            res.end();
        })
        .listen(PORT, () => {
            console.log(`Test server listening (:${PORT})…`);
            
            resolve();
        });
    });
});


HTTPTest.configure({
    port: PORT
});