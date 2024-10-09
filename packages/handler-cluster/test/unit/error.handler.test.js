const { ThreadCluster } = require("../../build/api");

new ThreadCluster({
    modulePath: require("path").join(__dirname, "_adapter.error.handler")
}, {
    baseSize: 2,
    silent: true,
    errorLimiterOptions: {
        initPeriodMs: 0
    }
})
.on("error", () => {})
.on("online", cluster => {
    new UnitTest("Error in cluster handler")
    .actual(cluster.handleRequest(null))
    .expect({
        status: 500,
        headers: {}
    });
});