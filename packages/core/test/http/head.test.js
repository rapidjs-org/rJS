new HTTPTest("HEAD /")
.eval("/")
.expect({
    status: 200,
    headers: {
        "Server": "rapidJS",
        "Content-Length": 12
    },
    body: null
});