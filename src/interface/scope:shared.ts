/**
 * Scope universal interface object.
 */


module.exports = {
	...require("./ClientError"),
    
	...require("./file"),
	...require("./cache")
};