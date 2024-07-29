new HTTPTest("Security: ≤ Max URI")
.eval("/" + "a".repeat(99))
.expect({
    status: 404
});

new HTTPTest("Security: > Max URI")
.eval("/" + "a".repeat(100))
.expect({
    status: 414
});

new HTTPTest("Security: > Max Headers")
.eval("/", {
    method: "POST",
    headers: {
        "a": "b".repeat(200)
    }
})
.expect({
    status: 431
});

new HTTPTest("Security: ≤ Max Payload")
.eval("/", {
    method: "POST",
    body: "a".repeat(999)
})
.expect({
    status: 200
});

new HTTPTest("Security: > Max Payload")
.eval("/", {
    method: "POST",
    body: "a".repeat(1000)
})
.expect({
    status: 413
});