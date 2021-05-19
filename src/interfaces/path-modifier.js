const {normalizeExtension} = require("../utils");

let pathModifierHandlers = {};

module.exports = output => {
	return {
		/**
         * Set up a handler to modifiy the local request URL for certain file type requests.
         * Multiple pathname modifier handlers may be set up per extension to be applied in order of setup.
         * @param {String} extension Extension name (without a leading dot)
         * @param {Function} callback Callback getting passed the the request URL in local pathname representation to return the modified path (or null if to use default local path)
         */
		addPathModifier: (extension, callback) => {
			extension = normalizeExtension(extension);
        
			!pathModifierHandlers[extension] && (pathModifierHandlers[extension] = []);
            
			pathModifierHandlers[extension].push(callback);
		},
        
		applyPathModifier: (extension, pathname) => {
			if(!pathModifierHandlers[extension]) {
				return null;
			}
        
			let curPathname;
			try {
				pathModifierHandlers[extension].forEach(pathModifier => {
					curPathname = pathModifier(pathname);
					curPathname && (pathname = curPathname);
				});
			} catch(err) {
				output.error(err);
			}
        
			return (curPathname === null) ? null : pathname;
		}
	};
};