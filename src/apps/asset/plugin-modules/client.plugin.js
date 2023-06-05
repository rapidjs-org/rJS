rJS[ "/*** @NAME ***/"  ] = ((/*** @REQUEST_METHOD_ID ***/) => {

    const $this = new Proxy({
        /*** @THIS_BODY ***/
    }, {
        get(_, prop) {
            // TODO: RPC
            /*** @REQUEST_METHOD_ID ***/(prop);
        }
    });
    
    /*** @SCRIPT ***/

    return $this;

})(performRequest);