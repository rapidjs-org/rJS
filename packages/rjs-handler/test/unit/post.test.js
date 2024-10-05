const { request } = require("./_api");

new UnitTest("POST /route1")
.actual(request({
    method: "POST",
    url: "/route1",
    body: JSON.stringify({
        name: "sum",
        args: [ 1, 2 ]
    })
}, [ "Content-Type" ]))
.expect({
    status: 200,
    headers: {
        "Content-Type": "application/json"
    },
    body: 3
});

new UnitTest("POST /route1")
.actual(request({
    method: "POST",
    url: "/route1",
    body: JSON.stringify({
        name: "CONSTANT"
    })
}, []))
.expect({
    status: 200,
    body: "value1"
});

new UnitTest("POST /route2")
.actual(request({
    method: "POST",
    url: "/route2",
    body: JSON.stringify({
        name: "CONSTANT"
    })
}, []))
.expect({
    status: 200,
    body: "value2"
});

new UnitTest("POST /route2 (no body)")
.actual(request({
    method: "POST",
    url: "/route2"
}, [], true))
.expect({
    status: 404
});

new UnitTest("POST /route2 (unknown param name)")
.actual(request({
    method: "POST",
    url: "/route2",
    body: JSON.stringify({ name: "any" })
}, [], true))
.expect({
    status: 404
});

new UnitTest("POST /non-existing-route")
.actual(request({
    method: "POST",
    url: "/non-existing-route",
    body: JSON.stringify({})
}, [], true))
.expect({
    status: 404
});

new UnitTest("POST /nested/route1")
.actual(request({
    method: "POST",
    url: "/nested/route1",
    body: JSON.stringify({
        name: "CONSTANT"
    })
}, [], true))
.expect({
    status: 200
});