const { Core } = require("@rapidjs.org/rjs-core/build/api");

const core = new Core({
    cwd: require("path").join(__dirname, "../../../../test-app")
});

module.exports.request = async (sReq, headerFilters = null, hideBody = false, metaBody = false) => {
    const sRes = await core.handleRequest(sReq);
    
    if(Array.isArray(headerFilters)) {
        const filteredHeaders = {};
        headerFilters.forEach(header => {
            filteredHeaders[header] = sRes.headers[header];
        });

        if(!headerFilters.length) {
            delete sRes.headers;
        } else {
            sRes.headers = filteredHeaders;
        }
    }
    if(hideBody) {
        delete sRes.body;
    } else if(metaBody) {
        sRes.body = {
            length: Buffer.byteLength(sRes.body)
        };
    }

    return sRes;
};