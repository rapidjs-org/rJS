import { Socket } from "net";

import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";
import { ProcessPool } from "./process/ProcessPool";


export class Cluster extends ProcessPool {
    public handleRequest(sReq: ISerialRequest, socket?: Socket): ISerialResponse|Promise<ISerialResponse> {
        return this.assign({ sReq, socket });
    }
}