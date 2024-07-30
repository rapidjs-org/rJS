// TODO: Check all headers (Cache-Control, ...)

new HTTPTest("GET /")
.eval("/")
.expect({
    status: 200,
    headers: {
        "Server": "rapidJS",
        "Content-Length": 12
    },
    body: "TEST (index)"
});

new HTTPTest("GET /compress.txt")
.eval("/compress.txt", {
    headers: {
        "Accept-Encoding": "gzip;q=1.0, *;q=0.5"
    }
})
.expect({
    status: 200,
    headers: {
        "Content-Length": 632,  // Compressed (1000 > 632)
        "Content-Encoding": "gzip"
    }
});

new HTTPTest("GET /index.txt")
.eval("/index.php")
.expect({
    status: 404
});

new HTTPTest("GET /nested/")
.eval("/nested/")
.expect({
    status: 200
});