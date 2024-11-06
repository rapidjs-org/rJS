new HTTPTest("GET success")
.eval("/")
.expect({
	status: 200,
	headers: {
		"Content-Length": 5,
		"Connection": "keep-alive",
		"Keep-Alive": "timeout=5",
		"Cache-Control": "max-age=86400000, stale-while-revalidate=300, must-revalidate"
	},
	body: "INDEX"
});

new HTTPTest("GET error")
.eval("/missing/file.txt")
.expect({
	status: 404,
	headers: {
		"Connection": "keep-alive",
		"Cache-Control": "max-age=86400000, stale-while-revalidate=300, must-revalidate"
	}
});

// TODO: TLS test