module.exports = requireNames => {
	const server = require("./server");

	// Init frontend base file to provide reusable methods among plug-ins
	server.initFrontendModule(__dirname);
		
	requireNames.forEach(name => {
		require(name)(server);
	});

	return server;
};