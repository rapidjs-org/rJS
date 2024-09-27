import { AFilesystemNode } from "./AFilesystemNode";
import { Directory } from "./Directory";
import { Filemap } from "./Filemap";

export class Filesystem extends Directory {
    private readonly filemap: Filemap;

    public readonly rootPath: string;

    constructor(rootPath: string, fileNodes: AFilesystemNode[] = []) {
        super(".", fileNodes);

        this.filemap = new Filemap(fileNodes);
        this.rootPath = rootPath;
    }

    public get(relativePath: string): AFilesystemNode {
        return this.filemap.lookup(relativePath);
    }
}
