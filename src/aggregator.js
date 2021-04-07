module.exports = requireNames => {
	const server = require("./app");

	requireNames.forEach(name => {
		require(name)(server);
	});

	return server;
};