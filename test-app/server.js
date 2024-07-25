require("../packages/core/build/api")
.serve({
    port: 7979
})
.then(() => {
    console.log("Test app server listening...");
});