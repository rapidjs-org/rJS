const {extname, join} = require("path");
const {existsSync, readFileSync} = require("fs");

const utils = require("../utils");
const webPath = require("../support/web-path");
const output = require("../support/output");


let readerHandlers = {};


module.exports = {
	/**
	 * Set up a handler to read each GET request response data of a certain file extension in a specific manner (instead of using the default reader).
	 * By nature of a reading process only one reader handler may be set per extension (overriding allowed).
	 * @param {String} extension Extension name (without a leading dot)
	 * @param {Function} callback Callback getting passed the the associated request object. The callback has to return serialized data (Buffer or String). Throwing a client error will lead to a respective response.
	 */
	setReader: (extension, callback) => {
		extension = utils.normalizeExtension(extension);

		(extension.length == 0) && (extension = "html");

		(readerHandlers[extension]) && (output.log(`Overriding reader for '${extension}' extension`));
		
		readerHandlers[extension] = callback;
	},

	/**
	 * Call reader for a specific extension.
	 * @param {String} pathname Web directory relative path to file to be read
	 * @returns {String|Buffer} Serialized read data (plain contents string if no according reader defined)
	 */
	useReader: (pathname) => {
		// TODO: Read from compound directory if exists?

		const extension = utils.normalizeExtension(extname(pathname));

		if(!readerHandlers[extension]) {
			const localPath = join(webPath, pathname);
			
			if(!existsSync(localPath)) {	// TODO: Error only if externally used
				throw new ReferenceError(`File not found at '${pathname}'`);
			}
			
			return String(readFileSync(localPath));
		}
		if(!utils.isFunction(readerHandlers[extension])) {
			throw new TypeError(`Given explicit reader handler for extension '${extension}' of type '${typeof(readerHandlers[extension])}, expecting Function'`);
		}

		const data = readerHandlers[extension]();
		if(!utils.isString(data) && !Buffer.isBuffer(data)) {
			throw new TypeError(`Explicit reader for extension "${extension}" does not return serialized data of type String or Buffer, given ${typeof(data)} instead.`);
		}

		return data;
	}
};