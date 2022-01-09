/**
 * Scope universal interface object.
 */


module.exports = {
	...require("./ResponseError/ClientError"),
	...require("./ResponseError/ServerError"),
    
	...require("./file"),
	...require("./cache")
};