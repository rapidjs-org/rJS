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

	set: (name, value) => {
		const entity = entityHook.current();
		
		if(scopeError(entity)) {
			return;
		}

		entity.cookies.send[name] = value; // TODO: Store cookies
	},

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