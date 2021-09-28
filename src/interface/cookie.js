const entityHook = require("../server/entity-hook");

const output = require("../support/output");


function scopeError(entity) {
	if(entity) {
		return false;
	}

	output.error(new ReferenceError("Cookie manipulation is only available from a request specific context"));

	return true;
}


module.exports = {

	/**
	 * Set a cookie.
	 * @param {String} name Cookie name
	 * @param {*} value Cookie value
	 * @param {Number} duration Duration until cookie is supposed to expire (in seconds)
	 */
	set: (name, value, duration) => {
		const entity = entityHook.current();
		
		if(scopeError(entity)) {
			return;
		}

		entity.cookies.send[name] = {
			value: value,
			duration: duration
		};
	},

	/**
	 * Get a cookie by name.
	 * @param {String} name Cookie name
	 * @returns {*} Cookie value
	 */
	get: name => {
		const entity = entityHook.current();
		
		if(scopeError(entity)) {
			return;
		}
		
		return {
			...entity.cookies.received,
			...entity.cookies.send
		}[name];
	}

};