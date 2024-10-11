const { ProcessPool } = require("../../build/api");

const WORKER_AMOUNT = 2;
const ROUNDTRIP_AMOUNT = 4;

new UnitTest("Process cluster setup")
.actual(new Promise(resolve => {
    const cluster = new ProcessPool({
        modulePath: require("path").join(__dirname, "_adapter.process"),
        options: "test:options"
    }, {
        limit: WORKER_AMOUNT,
    })
    .once("online", async () => {
        resolve(true);
        
        const pids = [];
        for(let i = 0; i < ROUNDTRIP_AMOUNT; i++) {
            new UnitTest(`Process roundtrip (${i})`)
            .actual(async () => {
                const sRes = await cluster.assign({
                    data: `test:request:${i}`
                });
                
                pids[i] = pids[i] ?? sRes.workerId;
                
                return sRes;
            })
            .expect(() => {
                return {
                    workerId: pids[i],
                    passedOptions: "test:options",
                    passedData: `test:request:${i}`
                }
            });
        }
    });
}))
.expect(true);