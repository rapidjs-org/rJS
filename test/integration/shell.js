/*
 * Shell adapter interface.
 */
module.exports = (shellAPI) => {
    // TODO: Use <shellAPI>
    /* console.log(shellAPI);
    console.log(process.env); */

    /*
     * Request handler interface.
     */
    return (sReq) => {
        console.log(sReq);
        
        return (sReq.url.pathname === "/foo")
        ? {
            status: 200,
            message: "bar"
        }
        : {
            status: 404,
            message: "baz"
        };
    };
};