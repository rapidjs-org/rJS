const { Cluster } = require("../../build/api");


const cluster = new Cluster({
    modulePath: require("path").join(__dirname, "./_test.adapter"),
    options: "OPTIONS"
}, {
    baseSize: 2,
    logsDirPath: __dirname
})
.once("online", async () => {
    const req = {
        body: "foo"
    };
    new UnitTest("I/O")
    .actual(async () => {
        const res = await cluster.handleRequest(req);
        return [
            res.status,
            res.body[0] !== process.pid,
            ...res.body.slice(1)
        ];
    })
    .expect([ 200, true, "OPTIONS", req ]);
});

// TODO: Error in cluster (.logs)