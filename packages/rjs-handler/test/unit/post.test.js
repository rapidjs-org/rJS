const { request } = require("./_api");

new UnitTest("POST /route1")
.actual(request({
    method: "POST",
    url: "/route1",
    body: {
        name: "sum",
        args: [ 1, 2 ]
    }
}, true))
.expect({
    status: 200,
    headers: {
        "Content-Type": "application/json"
    },
    body: {
        data: 3
    }
});

new UnitTest("POST /route1")
.actual(request({
    method: "POST",
    url: "/route1",
    body: {
        name: "CONSTANT"
    }
}, true))
.expect({
    status: 200,
    body: {
        data: "value"
    }
});

new UnitTest("POST /route2")
.actual(request({
    method: "POST",
    url: "/route2",
    body: {
        name: "CONSTANT"
    }
}, true))
.expect({
    status: 200,
    body: {
        data: "value"
    }
});

new UnitTest("POST /route2 (no body)")
.actual(request({
    method: "POST",
    url: "/route2"
}, []))
.expect({
    status: 400
});

new UnitTest("POST /route2 (unknown param name)")
.actual(request({
    method: "POST",
    url: "/route2",
    body: { name: "any" }
}, []))
.expect({
    status: 404
});

new UnitTest("POST /non-existing-route")
.actual(request({
    method: "POST",
    url: "/non-existing-route",
    body: {}
}, []))
.expect({
    status: 404
});

new UnitTest("POST /nested/route1")
.eval(request({
    method: "POST",
    url: "/nested/route1",
    body: {
        name: "CONSTANT"
    }
}, []))
.expect({
    status: 200
});