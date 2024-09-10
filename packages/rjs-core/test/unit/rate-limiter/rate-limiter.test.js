// max 1; sliding window (weighted)

const { Core } = require("@rapidjs.org/rjs-core/build/api");

const core = new Core({
    cwd: __dirname
});



new UnitTest("Security: ≤ Rate Limit")
.actual(async () => {
    return (await core.handleRequest({
        method: "GET",
        url: "/"
    })).status;
})
.expect(404);

new UnitTest("Security: ≤ Rate Limit")
.actual(async () => {
    return (await core.handleRequest({
        method: "GET",
        url: "/"
    })).status;
})
.expect(429);