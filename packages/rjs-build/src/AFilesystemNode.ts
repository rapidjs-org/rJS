import { normalize } from "path";

export abstract class AFilesystemNode {
    public readonly relativePath: string;

    // TODO: Nesting of dirs via array (simpler manipulation)
    public name: string;

    constructor(relativePath: string) {
        this.relativePath = normalize(`./${relativePath}`);
    }
}
