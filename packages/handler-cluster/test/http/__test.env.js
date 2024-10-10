const { createServer } = require("http");

const { Cluster } = require("../../build/api");


const PORT = 7100;


module.exports.BEFORE = new Promise(async (resolve) => {
    const cluster = new Cluster({
        modulePath: require("path").join(__dirname, "_adapter")
    }, {
        limit: 2
    })
    .on("stdout", message => process.stdout.write(message))
    .on("stderr", message => process.stderr.write(message))
    .on("online", () => {
        createServer(async (req, res) => {
            const sRes = await cluster.handleRequest(
                {
                    url: req.url
                }
            );
            
            res.statusCode = sRes.status ?? 200;
            res.end(JSON.stringify(sRes.body));
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