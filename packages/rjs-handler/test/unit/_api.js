const { Handler } = require("../../build/api");

const initHandler = (appWorkingDir) => {
    return new Handler({
        cwd: appWorkingDir,
        apiDirPath: "./api",
        sourceDirPath: "./src",
        publicDirPath: "./public"
    }, {
        "security": {
            "maxRequestHeadersLength": 500,
            "maxRequestURILength": 100
        },
        "performance": {
            "compressionByteThreshold": 999
        },
        "www": "never"
    });
}

const defaultHandler = initHandler(
    require("path")
    .join(__dirname, "../../../../test-app")
);

module.exports.initHandler = initHandler;

module.exports.requestWithHandler = async (handler, sReq, headerFilters = null, hideBody = false, metaBody = false) => {
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
module.exports.request = async (sReq, headerFilters = null, hideBody = false, metaBody = false) => {
    return module.exports.requestWithHandler(defaultHandler, sReq, headerFilters, hideBody, metaBody);
};