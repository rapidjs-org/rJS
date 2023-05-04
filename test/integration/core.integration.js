"use strict";


module.exports = function(api) {
    console.log(api);
    
    /*
     * Request handler interface.
     */
    return (sReq) => {
        console.log("\x1b[2mSERIAL REQUEST:\x1b[0m");
        console.log(sReq);
        
        const dRes = new api.Response("Success", 200);
        console.log("\x1b[2mPRODUCED RESPONSE:\x1b[0m");
        console.log(dRes);
        
        return dRes;
    };
}