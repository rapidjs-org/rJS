import { basename, normalize, resolve } from "path";

import { AFilesystemNode } from "./AFilesystemNode";

export class Directory extends AFilesystemNode {
    private readonly pathMap: Map<string, AFilesystemNode> = new Map();

    public readonly nodes: AFilesystemNode[];

    constructor(relativePath: string, nodes: AFilesystemNode[] = []) {
        super(relativePath);

        this.name = basename(relativePath);
        this.nodes = nodes;

        nodes.forEach((fileNode: AFilesystemNode) => {
            this.pathMap.set(
                this.normalizePath(fileNode.relativePath),
                fileNode
            );
        });
    }

    private normalizePath(relativePath: string): string {
        return normalize(resolve(`./${relativePath}`));
    }

    public get(relativePath: string): AFilesystemNode {
        const normalizedPath: string = this.normalizePath(relativePath);
        if (normalizedPath === this.normalizePath(".")) return this;
        if (normalizedPath) return this.pathMap.get(normalizedPath);
    }

    public traverse(
        itemCb: (fileNode: AFilesystemNode) => void,
        recursive: boolean = false
    ) {
        this.nodes.forEach((fileNode: AFilesystemNode) => {
            fileNode instanceof Directory
                ? recursive && fileNode.traverse(itemCb, recursive)
                : itemCb(fileNode);
        });
    }
}

export function createDirectory(
    relativePath: string,
    nodes?: AFilesystemNode[]
) {
    return new Directory(relativePath, nodes);
}
