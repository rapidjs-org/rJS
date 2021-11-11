module.exports = {
	file: {
		read: pathname => {
			return require("./interface/file").read(pathname);
		},
		exists: require("./interface/file").exists
	},
	cookie: require("./interface/cookie"),
	
	createCache: require("./interface/cache")
};