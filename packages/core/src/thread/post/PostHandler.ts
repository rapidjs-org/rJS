import { ISerialRequest } from "../../interfaces";
import { AHandler } from "../AHandler";


export class PostHandler extends AHandler {
    constructor(sReq: ISerialRequest) {
        super(sReq);
    }
    
    public process(): void {
        throw new Error("Method not implemented.");
    }
}