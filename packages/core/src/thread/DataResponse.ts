import { ISerialRequest } from "./interfaces";
import { VFS } from "./VFS";
import { Response } from "./Response";


export abstract class DataResponse extends Response {
    protected readonly vfs: VFS;
    
    constructor(serialRequest: ISerialRequest, vfs: VFS) {
        super(serialRequest);
        
        this.vfs = vfs;
    }
}