// TODO: Check all headers (Cache-Control, ...)

const { request } = require("./_api");

new UnitTest("GET /")
.actual(request({
    method: "GET",
    url: "/"
}, [ "Server", "Content-Length" ]))
.expect({
    status: 200,
    headers: {
        "Server": "rapidJS",
        "Content-Length": 12
    },
    body: Buffer.from("TEST (index)")
});

new UnitTest("GET /compress.txt")
.actual(request({
    method: "GET",
    url: "/compress.txt",
    headers: {
        "Accept-Encoding": "gzip;q=1.0, *;q=0.5"
    }
}, [ "Content-Length", "Content-Encoding" ], false, true))
.expect({
    status: 200,
    headers: {
        "Content-Length": 632,  // Compressed (1000 > 632)
        "Content-Encoding": "gzip"
    },
    body: {
        length: 632
    }
});

new UnitTest("GET /index.txt")
.actual(request({
    method: "GET",
    url: "/index.php"
}, [], true))
.expect({
    status: 404
});

new UnitTest("GET /nested/")
.actual(request({
    method: "GET",
    url: "/nested/"
}, [], true))
.expect({
    status: 200
});