new HTTPTest("GET /test")
.eval("/test")
.expect({
    status: 200,
    body: "test"
});