/**
 * Common application scope interface object.
 */


module.exports = {
	mode: require("../utilities/mode"),
	isDevMode: require("../utilities/mode").DEV,	// TODO: Deprecate
	
	ClientError: require("./ResponseError/ClientError").ClientError,
	ServerError: require("./ResponseError/ServerError").ServerError,
	
	Cache: require("../server/cache/ArbitraryCache").ArbitraryCache,
	file: require("./file")
};