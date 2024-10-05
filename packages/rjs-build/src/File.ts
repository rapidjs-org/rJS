import { basename } from "path";

import { AFilesystemNode } from "./AFilesystemNode";

export class File extends AFilesystemNode {
    public readonly extension: string;

    public readonly contents?: Buffer | string;

    constructor(relativePath: string, contents?: Buffer | string) {
        super(relativePath);

        this.name = basename(relativePath).replace(/\.[^.]+$/, "");
        this.extension = (relativePath.match(/\.([^.]+)$/) ?? [])[1];
        this.contents = contents;
    }
}
