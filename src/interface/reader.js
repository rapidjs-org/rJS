const {existsSync, readFileSync} = require("fs");

const {normalizeExtension, isFunction, isString} = require("../utils");

const output = require("./output");

let readerHandlers = {};

module.exports = {
	/**
	 * Set up a handler to read each GET request response data of a certain file extension in a specific manner (instead of using the default reader).
	 * By nature of a reading process only one reader handler may be set per extension (overriding allowed).
	 * @param {String} extension Extension name (without a leading dot)
	 * @param {Function} callback Callback getting passed the the associated pathname. The callback has to return serialized data (Buffer or String). Throwing an error code will lead to a related response.
	 */
	setReader: (extension, callback) => {
		extension = normalizeExtension(extension);

		(extension.length == 0) && (extension = "html");

		(readerHandlers[extension]) && (output.log(`Overriding reader for '${extension}' extension`));
		
		readerHandlers[extension] = callback;
	},

	/**
	 * Call reader for a specific extension.
	 * @param {String} extension Extension name (without a leading dot)
	 * @param {String} pathname Path to file to be read
	 * @returns {String|Buffer} Serialized read data (plain contents string if no according reader defined)
	 */
	useReader: (extension, pathname) => {
		if(!isFunction(readerHandlers[extension])) {
			if(!existsSync(pathname)) {
				throw 404;
			}

			return readFileSync(pathname);
		}

		const data = readerHandlers[extension](pathname);
		if(!isString(data) && !Buffer.isBuffer(data)) {
			throw new TypeError(`Explicit reader for extension "${extension}" does not return serialized data of type String or Buffer, given ${typeof(data)} instead.`);
		}

		return readerHandlers[extension](pathname);
	}
};