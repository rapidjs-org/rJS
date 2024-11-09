const { request } = require("./_api");

new UnitTest("PUT /route1 (fn declaration)")
.actual(request({
    method: "PUT",
    url: "/route1",
    body: JSON.stringify({
        name: "sum__declaration",
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

new UnitTest("PUT /route1 (fn expression)")
.actual(request({
    method: "PUT",
    url: "/route1",
    body: JSON.stringify({
        name: "sum__expression",
        args: [ 1, 2 ]
    })
}, []))
.expect({
    status: 200,
    body: 3
});

new UnitTest("PUT /route1 (CONTEXT)")
.actual(request({
    method: "PUT",
    url: "/route1",
    body: JSON.stringify({
        name: "sumWithContext",
        args: [ 1, 2 ]
    })
}, []))
.expect({
    status: 200,
    body: "undefined | 3"   // IP undefined without server wrapper
});

new UnitTest("PUT /route1")
.actual(request({
    method: "PUT",
    url: "/route1",
    body: JSON.stringify({
        name: "CONSTANT"
    })
}, []))
.expect({
    status: 200,
    body: "value1"
});

new UnitTest("PUT /route2")
.actual(request({
    method: "PUT",
    url: "/route2",
    body: JSON.stringify({
        name: "CONSTANT"
    })
}, []))
.expect({
    status: 200,
    body: "value2"
});

new UnitTest("PUT /route2 (no body)")
.actual(request({
    method: "PUT",
    url: "/route2"
}, [], true))
.expect({
    status: 404
});

new UnitTest("PUT /route2 (unknown param name)")
.actual(request({
    method: "PUT",
    url: "/route2",
    body: JSON.stringify({ name: "any" })
}, [], true))
.expect({
    status: 404
});

new UnitTest("PUT /non-existing-route")
.actual(request({
    method: "PUT",
    url: "/non-existing-route",
    body: JSON.stringify({})
}, [], true))
.expect({
    status: 404
});

new UnitTest("PUT /nested/route1")
.actual(request({
    method: "PUT",
    url: "/nested/route1",
    body: JSON.stringify({
        name: "CONSTANT"
    })
}, [], true))
.expect({
    status: 200
});