const { request } = require("./_api");

new UnitTest("Redirect: /index.html")
.actual(request({
    method: "GET",
    url: "/index.html"
}, [ "Location" ], true))
.expect({
    headers: {
        "Location": "http://localhost/"
    },
    status: 301
});

new UnitTest("Redirect: /index")
.actual(request({
    method: "GET",
    url: "/index"
}, [ "Location" ], true))
.expect({
    headers: {
        "Location": "http://localhost/"
    },
    status: 301
});

new UnitTest("Redirect: /other.html")
.actual(request({
    method: "GET",
    url: "/other.html"
}, [ "Location" ], true))
.expect({
    headers: {
        "Location": "http://localhost/other"
    },
    status: 301
});

new UnitTest("Redirect: /nested/index")
.actual(request({
    method: "GET",
    url: "/nested/index"
}, [ "Location" ], true))
.expect({
    headers: {
        "Location": "http://localhost/nested/"
    },
    status: 301
});

new UnitTest("Redirect: www.localhost (www 'never')")
.actual(request({
    method: "GET",
    headers: {
        "Host": "www.example.org"
    },
    url: "/foo"
}, [ "Location" ], true))
.expect({
    headers: {
        "Location": "http://example.org/foo"
    },
    status: 301
});