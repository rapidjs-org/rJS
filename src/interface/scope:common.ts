/**
 * Common application scope interface object.
 */


module.exports = {
	isDevMode: require("../utilities/is-dev-mode"),
	
	ClientError: require("./ResponseError/ClientError").ClientError,
	ServerError: require("./ResponseError/ServerError").ServerError,
	Cache: require("../server/cache/ArbitraryCache").ArbitraryCache,
	
	file: require("./file")
};