const { Core } = require("../../build/api");

const core = new Core({
    cwd: require("path").join(__dirname, "../../../../test-app")
});


new UnitTest("awdwa")
.actual(async () => {
    return await core.handleRequest({
        method: "GET",
        url: "/"
    });
})
.expect({
    status: 200,
    headers: {
      "Content-Length": 0,
      "Connection": "keep-alive",
      "Cache-Control": "max-age=86400000, stale-while-revalidate=300, must-revalidate"
    },
    body: {
      type: "Buffer",
      data: []
    }
});