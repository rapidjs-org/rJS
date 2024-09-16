// max 1; sliding window (weighted)

const { Handler } = require("../../../build/api");

const handler = new Handler({
    cwd: __dirname
});



new UnitTest("Security: ≤ Rate Limit")
.actual(async () => {
    return (await handler.apply({
        method: "GET",
        url: "/"
    })).status;
})
.expect(404);

new UnitTest("Security: > Rate Limit")
.actual(async () => {
    return (await handler.apply({
        method: "GET",
        url: "/"
    })).status;
})
.expect(429);