import { normalize } from "path";


export abstract class AFilesystemNode {
    public readonly relativePath: string;
    
    constructor(relativePath: string) {
        this.relativePath = normalize(`./${relativePath}`);
    }
}