const {normalizeExtension, isFunction} = require("../utils");

let readerHandlers = {};

module.exports = output => {
    return {
        /**
         * Set up a handler to read each GET request response data of a certain file extension in a specific manner (instead of using the default reader).
         * By nature of a reading process only one reader handler may be set per extension (overriding allowed).
         * @param {String} extension Extension name (without a leading dot)
         * @param {Function} callback Callback getting passed the the associated pathname. Throwing an error code will lead to a related response.
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
         * @param {String} pathname Pathname of request
         * @returns {*} Serializable read data
         */
        applyReader: (extension, pathname) => {
            if(!isFunction(readerHandlers[extension])) {
                throw 404;
            }

            return readerHandlers[extension](pathname);
        }
    }
};