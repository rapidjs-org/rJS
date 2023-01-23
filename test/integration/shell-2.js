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
        
        return {
            status: 200,
            message: "SHELL 2"
        };
    };
};