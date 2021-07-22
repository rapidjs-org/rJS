const utils = require("../utils");

const output = require("./output");

let responseModifierHandlers = {};

module.exports = {
	/**
	 * Set up a handler to modify each GET request response data of a certain file extension in a specific manner.
	 * Multiple response modifier handlers may be set up per extension to be applied in order of setup.
	 * @param {String} extension Extension name (without a leading dot) (Use ":html" if only apply to compound base pages)
	 * @param {Function} callback Callback getting passed the data string to modify and the current request object returning the eventually send response data. Throwing an error code will lead to a related response.
	 */
	addResponseModifier: (extension, callback) => {
		extension = utils.normalizeExtension(extension);
		
		!responseModifierHandlers[extension] && (responseModifierHandlers[extension] = []);
		
		responseModifierHandlers[extension].push(callback);
	},

	/**
	 * Apply response modifiers for a specific extension.
	 * @param {String} extension Extension name (without a leading dot) (Use ":html" if to apply compound base page associated modifiers)
	 * @param {String} data Data to modifiy
	 * @param {Object} reducedReq Reduced request object to pass to callback
	 * @returns {*} Serializable modified data
	 */
	applyResponseModifiers: (extension, data, reducedReq) => {
		const handlers = responseModifierHandlers[extension];
		handlers && handlers.push(data => data);	// For error check upon last modifier

		for(let responseModifier of (handlers || [])) {
			if(!utils.isString(data) && !Buffer.isBuffer(data)) {
				output.error(new TypeError(`Response modifier ('${extension}') must return value of type String or Buffer, given ${typeof(curData)}.`));
			} else {
				data = responseModifier(Buffer.isBuffer(data) ? String(data) : data, reducedReq);
			}
		}

		return data;
	}
};