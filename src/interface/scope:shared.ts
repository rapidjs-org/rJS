/**
 * Scope universal interface object.
 */


module.exports = {
	// TODO: Deprecate remove (mid-term)
	createCache: () => {
		return new (require("../server/support/cache/ArbitraryCache")).ArbitraryCache();
	},

	ClientError: require("./ResponseError/ClientError").ClientError,
	ServerError: require("./ResponseError/ServerError").ServerError,
	Cache: require("../server/support/cache/ArbitraryCache").ArbitraryCache,

	file: require("./file")
};