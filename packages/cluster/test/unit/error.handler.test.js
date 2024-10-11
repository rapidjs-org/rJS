const { ThreadPool } = require("../../build/api");

new ThreadPool({
    modulePath: require("path").join(__dirname, "_adapter.error.handler")
}, {
    limit: 2,
    silent: true,
    errorLimiterOptions: {
        initPeriodMs: 0
    }
})
.on("error", () => {})
.on("online", cluster => {
    new UnitTest("Error in cluster handler")
    .actual(() => cluster.assign(null))
    .error("Test error", Error);
});