const { request } = require("./_api");

new UnitTest("Redirect: /index.html")
.actual(request({
    method: "GET",
    url: "/index.html"
}, [ "Location" ], true))
.expect({
    headers: {
        "Location": "/"
    },
    status: 302
});

new UnitTest("Redirect: /index")
.actual(request({
    method: "GET",
    url: "/index"
}, [ "Location" ], true))
.expect({
    headers: {
        "Location": "/"
    },
    status: 302
});

new UnitTest("Redirect: /other.html")
.actual(request({
    method: "GET",
    url: "/other.html"
}, [ "Location" ], true))
.expect({
    headers: {
        "Location": "/other"
    },
    status: 302
});

new UnitTest("Redirect: /nested/index")
.actual(request({
    method: "GET",
    url: "/nested/index"
}, [ "Location" ], true))
.expect({
    headers: {
        "Location": "/nested/"
    },
    status: 302
});