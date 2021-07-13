const {join, dirname, extname, basename} = require("path");
const {existsSync} = require("fs");


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
	},

	retrievePluginName: reference => {
		// Installed plug-in by package (package name / name as given)
		if(!/^((\.)?\.)?\//.test(reference)) {
			return reference;
		}
		if(/^(\.)?\.\//.test(reference)) {
			reference = join(dirname(require.main.filename), reference);
		}
	
		reference = reference.replace(/(\/src)?\/app(\.js)?$/, "");
		
		const packagePath = join(reference, "package.json");
	
		const name = existsSync(packagePath) ? require(packagePath).name : null;
		if(name) {
			// Local plug-in with named package (retrieve package name)
			return name;
		}

		// Local plug-in without (or without named) package (file name (without extension) / name as given)
		const extensionLength = extname(reference).length;
		return basename((extensionLength > 0) ? reference.slice(0, -extensionLength) : reference);
	}

};