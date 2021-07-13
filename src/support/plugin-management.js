const registeredPlugins = new Map();


module.exports = {

	has: name => {
		return registeredPlugins.has(name);
	},

	getReference: name => {
		return registeredPlugins.get(name);
	},

	getName: reference => {
		let foundName;
        
		registeredPlugins.forEach((path, name) => {
			if(foundName) {
				return;
			}

			if(new RegExp(`^${path.replace(/\//g, "\\/")}`).test(reference)) {
				foundName = name;
			}
		});
		
		return foundName;
	},

	set: (name, reference) => {
		registeredPlugins.set(name, reference);
	}

};