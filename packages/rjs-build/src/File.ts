import { fs } from "@rapidjs.org/adapters";

abstract class AFile {
  protected readonly relativePath: string;

  private lastModified: number = -Infinity;

  constructor(relativePath: string) {
    this.relativePath = relativePath;
    // TODO: Exists?
  }

  public async wasModified(): Promise<boolean> {
    const nowLastModified: number = (await fs.stat(this.relativePath)).modTime;
    const wasModified: boolean = nowLastModified > this.lastModified;

    this.lastModified = nowLastModified;

    return wasModified;
  }
}

export class File extends AFile {
  public read(): Promise<string> {
    return fs.readFile(this.relativePath);
  }
}

export class Directory extends AFile {
  get entries(): Promise<fs.TDirent[]> {
    return fs.readDir(this.relativePath);
  }
}
