const {gzipSync} = require("zlib");

const output = require("../interface/output");

module.exports = data => {
    try {
        return gzipSync(data);
    } catch(err) {
        output.error(err);
    }

    return data;
};