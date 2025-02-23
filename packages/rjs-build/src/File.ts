import { fs } from "@rapidjs.org/adapters";

abstract class AFile {
    private readonly relativePath: string;
    
    private lastModified: number = -Infinity;

    constructor(relativePath: string) {
        this.relativePath = relativePath;
    }

    public async wasModified() {
        // TODO: Exists?
        const lastModified: number = (await fs.stat(this.relativePath)).modTime;
        const wasModified: boolean = lastModified > this.lastModified;

        this.lastModified = lastModified;

        return wasModified;
    }
}

export class File extends AFile {

}

export class Directory extends AFile {

}