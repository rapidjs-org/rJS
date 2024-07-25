import { ISerialRequest } from "../../interfaces";
import { AHandler } from "../AHandler";


export class GetHandler extends AHandler {
    constructor(sReq: ISerialRequest) {
        super(sReq);
    }
    
    public process(): void {
        this.response.setBody("test");

        this.respond();
        
        console.log(this.request.url.pathname);
    }
}