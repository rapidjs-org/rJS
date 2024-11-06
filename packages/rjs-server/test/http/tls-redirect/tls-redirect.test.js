new HTTPTest("Redirect success")
.eval("/test/path?id=100#anchor")
.expect({
	status: 308,
	headers: {
		"Location": "https://localhost:7902/test/path?id=100#anchor"
	}
});