import { AFilesystemNode } from "./AFilesystemNode";
import { Directory } from "./Directory";
import { Filemap } from "./Filemap";


export class Filesystem extends Directory {
    private readonly filemap: Filemap;

    constructor(fileNodes: AFilesystemNode[] = []) {
        super(".", fileNodes);

        this.filemap = new Filemap(fileNodes);
    }
    
    public lookup(relativePath: string): AFilesystemNode {
        return this.filemap.lookup(relativePath);
    }
}