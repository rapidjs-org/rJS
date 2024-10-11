// max 1; sliding window (weighted)

const { Handler } = require("../../../build/api");

const handler = new Handler({
    cwd: __dirname
}, {
    "security": {
        "maxRequestsPerMin": 1
    }
});



new UnitTest("Security: ≤ Rate Limit")
.actual(async () => {
    return (await handler.activate({
        method: "GET",
        url: "/"
    })).status;
})
.expect(404);

new UnitTest("Security: > Rate Limit")
.actual(async () => {
    return (await handler.activate({
        method: "GET",
        url: "/"
    })).status;
})
.expect(429);