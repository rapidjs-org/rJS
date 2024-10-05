import { basename } from "path";

import { AFilesystemNode } from "./AFilesystemNode";

export class Directory extends AFilesystemNode {
    public readonly fileNodes: AFilesystemNode[];

    constructor(relativePath: string, fileNodes: AFilesystemNode[] = []) {
        super(relativePath);

        this.name = basename(relativePath);
        this.fileNodes = fileNodes;
    }

    public traverse(
        itemCb: (fileNode: AFilesystemNode) => void,
        recursive: boolean = false
    ) {
        this.fileNodes.forEach((fileNode: AFilesystemNode) => {
            fileNode instanceof Directory
                ? recursive && fileNode.traverse(itemCb, recursive)
                : itemCb(fileNode);
        });
    }
}
