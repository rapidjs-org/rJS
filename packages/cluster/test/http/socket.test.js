new HTTPTest("GET (1)")
.eval("/")
.expect({
    status: 200,
	body: "/: foo"
});

new HTTPTest("GET (4)")
.eval("/not-found")
.expect({
    status: 404
});

new HTTPTest("GET (2)")
.eval("/endpoint")
.expect({
	body: "/endpoint: foo"
});

new HTTPTest("GET (3)")
.eval("/buffer")
.expect({
	body: Buffer.from("test").data
});