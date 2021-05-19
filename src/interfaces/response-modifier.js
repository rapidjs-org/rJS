const {normalizeExtension} = require("../utils");

let responseModifierHandlers = {};

module.exports = output => {
    return {
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

        /**
         * Call response modifier for a specific extension.
         * @param {String} extension Extension name
         * @param {String} data Data to finalize
         * @param {String} [pathname] Pathname of associated request to pass
         * @param {Object} [queryParametersObj] Query parameters object to pass
         * @returns {*} Serializable finalizeed data
         */
        applyResponseModifier: (extension, data, pathname, queryParametersObj) => {
            (responseModifierHandlers[extension] || []).forEach(responseModifier => {
                const curData = responseModifier(String(data), pathname, queryParametersObj);
                curData && (data = curData);
            });

            return data;
        }
    }
};