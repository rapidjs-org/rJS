import { TConcreteAppAPI, TConcreteAppHandler } from "../../_types";


export default function(api: TConcreteAppAPI) {
    console.log(api);
    
    /*
     * Request handler interface.
     */
    return (sReq: TConcreteAppHandler) => {
        console.log("\n\x1b[2mSERIAL REQUEST:\x1b[0m");
        console.log(sReq);
        
        const dRes = new api.Response("Success", 200);
        console.log("\n\x1b[2mPRODUCED RESPONSE:\x1b[0m");
        console.log(dRes);
        
        return dRes;
    };
}