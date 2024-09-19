const { Handler } = require("../../build/api");

const handler = new Handler({
    cwd: require("path").join(__dirname, "../../../../test-app")
});

module.exports.request = async (sReq, headerFilters = null, hideBody = false, metaBody = false) => {
    const sRes = await handler.activate(sReq);

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
            length: sRes.body ? Buffer.byteLength(sRes.body) : 0
        };
    } else {
        try {
            sRes.body = sRes.body.toString();
            sRes.body = JSON.parse(sRes.body);
        } catch {}
    }
    
    return sRes;
};