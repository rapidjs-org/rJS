import EventEmitter from "events";

import { ISerialRequest } from "../interfaces";
import { Request } from "./Request";
import { Response } from "./Response";


export abstract class AHandler extends EventEmitter {
    protected readonly request: Request;
    protected readonly response: Response;
    
    private hasConsumedResponse: boolean = false;

    constructor(sReq: ISerialRequest) {
        super();

        this.request = new Request(sReq);
        this.response = new Response();
    }

    protected respond() {
        if(this.hasConsumedResponse) throw new RangeError("Response consumed multiple times");
        this.hasConsumedResponse = true;

        this.emit("response", this.response.serialize());
    }

    public abstract process(): void;
}