import { resolve } from "path";

import { AFilesystemNode } from "./AFilesystemNode";


export class Filemap {
    private readonly pathMap: Map<string, AFilesystemNode> = new Map();
    
    public readonly fileNodes: AFilesystemNode[];
    
    constructor(fileNodes: AFilesystemNode[] = []) {
        this.fileNodes = fileNodes;

        fileNodes
        .forEach((fileNode: AFilesystemNode) => {
            this.pathMap.set(resolve(fileNode.relativePath), fileNode);
        });
    }
    
    public lookup(relativePath: string): AFilesystemNode {
        return this.pathMap.get(resolve(relativePath));
    }
}