const { Cluster } = require("../../build/api");

const WORKER_AMOUNT = 2;
const ROUNDTRIP_AMOUNT = 8;

new UnitTest("Cluster setup")
.actual(new Promise(resolve => {
    const optionsBuffer = Buffer.from("test:options");
    
    const cluster = new Cluster({
        modulePath: require("path").join(__dirname, "_adapter.thread"),
        options: optionsBuffer
    }, {
        limit: WORKER_AMOUNT,
    })
    .once("online", async () => {
        resolve(true);
        
        const tids = new Set();
        for(let i = 0; i < ROUNDTRIP_AMOUNT; i++) {
            new UnitTest(`Cluster roundtrip (${i})`)
            .actual(async () => {
                const sRes = await cluster.assign({
                    data: `test:request:${i}`
                });

                tids.add(sRes.workerId);
                delete sRes.workerId;
                sRes.workerIdInRange = tids.size <= WORKER_AMOUNT;

                return sRes;
            })
            .expect({
                passedOptions: optionsBuffer,
                passedData: `test:request:${i}`,
                workerIdInRange: true
            });
        }
    });
}))
.expect(true);