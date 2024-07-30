new HTTPTest("POST /route1")
.eval("/route1", {
    method: "POST",
    body: {
        name: "sum",
        args: [ 1, 2 ]
    }
})
.expect({
    status: 200,
    headers: {
        "Content-Type": "application/json"
    },
    body: {
        data: 3
    }
});

new HTTPTest("POST /route1")
.eval("/route1", {
    method: "POST",
    body: {
        name: "CONSTANT"
    }
})
.expect({
    status: 200,
    body: {
        data: "value"
    }
});

new HTTPTest("POST /route2")
.eval("/route2", {
    method: "POST",
    body: {
        name: "CONSTANT"
    }
})
.expect({
    status: 200,
    body: {
        data: "value"
    }
});

new HTTPTest("POST /route2 (no body)")
.eval("/route2", {
    method: "POST"
})
.expect({
    status: 400
});

new HTTPTest("POST /route2 (unknown param name)")
.eval("/route2", {
    method: "POST",
    body: { name: "any" }
})
.expect({
    status: 404
});

new HTTPTest("POST /non-existing-route")
.eval("/non-existing-route", {
    method: "POST",
    body: {}
})
.expect({
    status: 404
});

new HTTPTest("POST /nested/route1")
.eval("/nested/route1", {
    method: "POST",
    body: {
        name: "CONSTANT"
    }
})
.expect({
    status: 200
});