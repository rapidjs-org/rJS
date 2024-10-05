// TODO: Check all headers (Cache-Control, ...)

const { request } = require("./_api");

new UnitTest("GET /")
.actual(request({
    method: "GET",
    url: "/"
}, [ "Server", "Content-Length", "Content-Type" ]))
.expect({
    status: 200,
    headers: {
        "Server": "rapidJS",
        "Content-Length": 5,
        "Content-Type": "text/html"
    },
    body: "INDEX"
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
        "Content-Length": 632,
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
}, [ "Content-Length" ], true))
.expect({
    headers: {
        "Content-Length": 0
    },
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

new UnitTest("GET /page")
.eval(request({
    method: "GET",
    url: "/page"
}, [], null, true))
.expect({
	status: 200,
	body: {
        length: require("fs").readFileSync(
            require("path").join(__dirname, "../../../../test-app/public/page.html")
        ).toString().length
        + require("fs").readFileSync(
            require("path").join(__dirname, "../../client/rjs.client.js")
        ).toString()
        .replace(/\n/g, "")
        .replace(/\s{2,}/g, " ")
        .length
        + "<script>".length
        + "</script>".length
        + 2
    }
});

new UnitTest("/page + client module injection")
.eval(async () => {
    return !!~(
        (await request({
            method: "GET",
            url: "/page"
        }))
        .body
        .indexOf("<script>window.rJS =")
    );
})
.expect(true);

new UnitTest("GET /")
.actual(request({
    method: "GET",
    url: "/not-found"
}, [ "Content-Length", "Content-Type" ]))
.expect({
    headers: {
        "Content-Length": 3,
        "Content-Type": "text/html"
    },
    status: 404,
    body: "404"
});

new UnitTest("GET /nested/not-found")
.actual(request({
    method: "GET",
    url: "/nested/not-found"
}, []))
.expect({
    status: 404,
    body: "404"
});

new UnitTest("GET /nested/deep-nested/not-found")
.actual(request({
    method: "GET",
    url: "/nested/deep-nested/not-found"
}, []))
.expect({
    status: 404,
    body: "404 (deep nested)"
});

new UnitTest("GET /index.php")
.actual(request({
    method: "GET",
    url: "/index.php"
}, [ "Content-Length" ], true))
.expect({
    headers: {
        "Content-Length": 0
    },
    status: 404
});

// TODO: 404