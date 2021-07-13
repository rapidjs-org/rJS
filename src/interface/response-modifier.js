const {normalizeExtension, isString} = require("../utils");

const output = require("./output");

let responseModifierHandlers = {};

module.exports = {
	/**
	 * Set up a handler to modify each GET request response data of a certain file extension in a specific manner.
	 * Multiple response modifier handlers may be set up per extension to be applied in order of setup.
	 * @param {String} extension Extension name (without a leading dot) (Use ":html" if only apply to compound base pages)
	 * @param {Function} callback Callback getting passed the data string to modify and the associated pathname returning the eventually send response data. Throwing an error code will lead to a related response.
	 */
	addResponseModifier: (extension, callback) => {
		extension = normalizeExtension(extension);

		!responseModifierHandlers[extension] && (responseModifierHandlers[extension] = []);
		
		responseModifierHandlers[extension].push(callback);
	},

	/**
	 * Apply response modifiers for a specific extension.
	 * @param {String} extension Extension name (without a leading dot) (Use ":html" if to apply compound base page associated modifiers)
	 * @param {String} data Data to modifiy
	 * @param {String} [pathname] Pathname of associated request to pass
	 * @param {Object} [queryParametersObj] Query parameters object to pass
	 * @returns {*} Serializable modified data
	 */
	applyResponseModifiers: (extension, data, pathname, queryParametersObj) => {
		for(let responseModifier of (responseModifierHandlers[extension] || [])) {
			if(!isString(data) && !Buffer.isBuffer(data)) {
				output.error(new TypeError(`Response modifier ('${extension}') must return value of type String or Buffer, given ${typeof(curData)}.`));
			} else {
				data = responseModifier(Buffer.isBuffer(data) ? String(data) : data, pathname, queryParametersObj);
			}
		}

		return data;
	}
};