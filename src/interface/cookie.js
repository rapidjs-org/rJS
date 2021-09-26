const entityHook = require("../server/entity-hook");

//write

module.exports = {

	set: (name, value) => {
		entityHook.current().cookies.send[name] = value; // TODO: Store cookies
	},

	get: name => {
		return {
			...entityHook.current().cookies.received,
			...entityHook.current().cookies.send
		}[name];
	}

};