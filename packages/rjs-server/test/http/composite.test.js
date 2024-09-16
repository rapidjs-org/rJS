new HTTPTest("GET success")
.eval("/")
.expect({
	status: 200,
	headers: {
		"Content-Length": 0,
		"Connection": "keep-alive",
		"Cache-Control": "max-age=86400000, stale-while-revalidate=300, must-revalidate"
	},
	body: {
		type: "Buffer",
		data: []
	}
});

new HTTPTest("GET error")
.eval("/missing/file.txt")
.expect({
	status: 404,
	headers: {
		"Content-Length": 0,
		"Connection": "keep-alive",
		"Cache-Control": "max-age=86400000, stale-while-revalidate=300, must-revalidate"
	}
});