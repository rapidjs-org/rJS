// TODO: Body length limit

new HTTPTest("POST /")
.eval("/", {
    method: "POST",
    body: "a".repeat(999)
})
.expect({
    status: 200
});