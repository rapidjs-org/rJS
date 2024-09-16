new HTTPTest("File serve: 404")
.eval("/missing/file.txt")
.expect({
	status: 404
});

new HTTPTest("File serve: Static 200")
.eval("/index.html")
.expect({
	status: 200,
	body: "TEST (index)"
});

new HTTPTest("File serve: Dynamic 200")
.eval("/out.txt")
.expect({
	status: 200,
	body: "O\nP1\nP2"
});