import { ISerialRequest } from "../interfaces";
import { VFS } from "../VFS";
import { DataResponse } from "../DataResponse";


const _config = {
	defaultWebFileName: "index",
	defaultWebFileExtension: "html",
	privateWebFileNameRegex: /^_.*/,
	publicWebDirName: "web"
};


export class GetResponse extends DataResponse {
    private renderers: string[];

    constructor(serialRequest: ISerialRequest, vfs: VFS, renderers: string[] = []) {
        super(serialRequest, vfs);

        this.renderers = renderers;
    }
    
    public process() {
        this.close();
    }
}

// TODO: Load each file in background upfront to have in memory?