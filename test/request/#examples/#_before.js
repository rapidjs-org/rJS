module.exports = () => {
	return new Promise(resolve => {
		require("http")
		.createServer((req, res) => {
			console.log(`REQ: ${req.url}`);

			let message;
			switch(req.url) {
				case "/hello-world":
					message = "Hello world!";
					break;
				case "/hello-mars":
					message = {
						"foo": "bar"
					};
					break;
				default:
					res.statusCode = 404;
					message = require("http").STATUS_CODES[404];
					break;
			}
			
			res.setHeader("Content-Encoding", "identity");
			res.write(JSON.stringify(message));
			res.end();
		})
		.listen(8000, () => {
			console.log("Example server listening...");
			
			resolve();
		});
	});
};


RequestTest.setCommonHost({
	port: 8000
});