new HTTPTest("GET (1)")
.eval("/")
.expect({
    status: 200,
	body: "/: foo"
});

new HTTPTest("GET (2)")
.eval("/endpoint")
.expect({
    status: 200,
	body: "/endpoint: foo"
});