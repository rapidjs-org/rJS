const {normalizeExtension, isString} = require("../utils");

const output = require("./output");

let responseModifierHandlers = {};

// TODO: Add * extension wildcard to affect any file type?
// When to apply wildcarded?

module.exports = {
	/**
	 * Set up a handler to finalize each GET request response data of a certain file extension in a specific manner.
	 * Multiple response modifier handlers may be set up per extension to be applied in order of setup.
	 * @param {String} extension Extension name (without a leading dot) 
	 * @param {Function} callback Callback getting passed the data string to finalize and the associated pathname returning the eventually send response data. Throwing an error code will lead to a related response.
	 */
	addResponseModifier: (extension, callback) => {
		extension = normalizeExtension(extension);

		!responseModifierHandlers[extension] && (responseModifierHandlers[extension] = []);
		
		responseModifierHandlers[extension].push(callback);
	},

	// TODO: Introduce order flags for telling rapidJS to always apply first or last specifically when needed?
	// TODO: Use '*' wildcard for application on any file type?
	/**
	 * Call response modifier for a specific extension.
	 * @param {String} extension Extension name
	 * @param {String} data Data to finalize
	 * @param {String} [pathname] Pathname of associated request to pass
	 * @param {Object} [queryParametersObj] Query parameters object to pass
	 * @returns {*} Serializable modified data
	 */
	applyResponseModifier: (extension, data, pathname, queryParametersObj) => {
		for(let responseModifier of (responseModifierHandlers[extension] || [])) {
			if(!isString(data) && !Buffer.isBuffer(data)) {
				output.error(new TypeError(`Response modifier ('${extension}') must return value of type string or buffer, given ${typeof(curData)}.`));
				// TODO: Precise error info/output
				
				return data;
			} else {
				data = responseModifier(Buffer.isBuffer(data) ? String(data) : data, pathname, queryParametersObj);
			}
		}

		return data;
	}
};