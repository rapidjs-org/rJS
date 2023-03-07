import { TConcreteAppAPI, TConcreteAppHandler } from "../../_types";


export default function(api: TConcreteAppAPI) {
    console.log(api);
    
    /*
     * Request handler interface.
     */
    return (sReq: TConcreteAppHandler) => {
        console.log(sReq);
        
        return new api.Response("Success", 200);
    };
}