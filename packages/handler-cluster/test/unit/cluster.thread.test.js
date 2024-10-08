const { ThreadCluster } = require("../../build/api");

const WORKER_AMOUNT = 2;
const ROUNDTRIP_AMOUNT = 4;

new UnitTest("Thread cluster setup")
.actual(new Promise(resolve => {
    const cluster = new ThreadCluster({
        modulePath: require("path").join(__dirname, "_adapter.thread"),
        options: "test:options"
    }, {
        limit: WORKER_AMOUNT,
    })
    .once("online", async () => {
        resolve(true);
        
        const tids = new Set();
        for(let i = 0; i < ROUNDTRIP_AMOUNT; i++) {
            new UnitTest(`Thread roundtrip (${i})`)
            .actual(async () => {
                const sRes = await cluster.handleRequest({
                    sReq: `test:request:${i}`
                });
                
                tids.add(sRes.body.workerId);
                delete sRes.body.workerId;
                sRes.workerIdInRange = tids.size <= WORKER_AMOUNT;
                
                return sRes;
            })
            .expect({
                status: 200,    // min
                headers: {},    // min
                body: {
                    passedOptions: "test:options",
                    passedRequest: `test:request:${i}`
                },
                workerIdInRange: true
            });
        }
    });
}))
.expect(true);