import { normalize, basename } from "path";

export abstract class AFilesystemNode {
    public readonly absolutePath: string;
    public readonly relativePath: string;
    public readonly name: string;
    public readonly extension: string;

    constructor(relativePath: string) {
        this.relativePath = normalize(`./${relativePath}`);
        this.name = basename(relativePath).replace(/\.[^.]+$/, "");
        this.extension = (relativePath.match(/\.([^.]+)$/) ?? [])[1];
    }
}
