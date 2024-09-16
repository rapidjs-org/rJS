import { resolve } from "path";

import { AFilesystemNode } from "./AFilesystemNode";


export class Filemap {
    private readonly pathMap: Map<string, AFilesystemNode> = new Map();
    
    public readonly fileNodes: AFilesystemNode[];
    
    constructor(fileNodes: AFilesystemNode[] = []) {
        this.fileNodes = fileNodes;

        fileNodes
        .forEach((fileNode: AFilesystemNode) => {
            this.pathMap.set(this.normalizeRelativePath(fileNode.relativePath), fileNode);
        });
    }
    
    private normalizeRelativePath(relativePath: string): string {
        return resolve(`./${relativePath}`);
    }
    
    public lookup(relativePath: string): AFilesystemNode {
        return this.pathMap.get(this.normalizeRelativePath(relativePath));
    }
}