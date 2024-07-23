import { ISerialRequest } from "../interfaces";
import { DataResponse } from "../DataResponse";
import { VFS } from "../VFS";


export class PostResponse extends DataResponse {
    constructor(serialRequest: ISerialRequest, vfs: VFS) {
        super(serialRequest, vfs);
    }

    public process() {
        this.close();
    }
}