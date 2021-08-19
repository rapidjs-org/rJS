

const modifiers = {
    request: new Map(),
    response: new Map()
};


module.exports = {

    request: (callback) => {
        extension = utils.normalizeExtension(extension);
        
        responseModifiers.set(extension, callback);
    },

    response: (extension, callback) => {
        extension = utils.normalizeExtension(extension);

        responseModifiers.set(extension, callback);
    }

};