import { cwd, fs, path } from "@rapidjs.org/adapters";

import _config from "./_config.json" with { type: "json" };

export enum ENodeType {
  PRIVATE,
  PUBLIC
}

abstract class ANode {
  protected readonly rootPath: string;
  protected readonly relativePath: string;

  private virtualRelativePath?: string;
  private lastModified: number = -Infinity;

  constructor(rootPath: string = cwd(), relativePath: string = ".") {
    this.rootPath = rootPath;
    this.relativePath = relativePath;
  }

  private getName(): Promise<string> {
    return path.basename(this.relativePath);
  }

  protected getAbsolutePath(): Promise<string> {
    return path.join(this.rootPath, this.relativePath);
  }

  public async wasModified(): Promise<boolean> {
    const nowLastModified: number = (await fs.stat(this.relativePath)).modTime;
    const wasModified: boolean = nowLastModified > this.lastModified;

    this.lastModified = nowLastModified;

    return wasModified;
  }

  public async getType(): Promise<ENodeType> {
    return ((await this.getName()).slice(0, _config.privateNodePrefix.length) === _config.privateNodePrefix)
        ? ENodeType.PRIVATE
        : ENodeType.PUBLIC;
  }

  public async getPath(): Promise<string> {
    this.virtualRelativePath = this.virtualRelativePath
      ?? await path.normalize(this.relativePath.split(await path.separator(), 2)[1]);

    return this.virtualRelativePath!;
  }
}

export type TNode = ANode;

export type TReadNodes = {
  changed: TNode[];
  deleted: TNode[];
  unchanged: TNode[];
};

export class DirectoryNode extends ANode {
  private readonly nodeCache: Map<string, TNode> = new Map(); // TODO: Remove stale entries?

  public async readNodes(): Promise<TReadNodes> {
    const readNodes: TReadNodes = {
      changed: [],
      deleted: [],
      unchanged: []
    };
    const existingPaths: string[] = [];

    await Promise.all(
      (await fs.readDir(await this.getAbsolutePath()))
        .map(async (dirent: fs.TDirent) => {
          const relativePath: string = await path.join(this.relativePath, dirent.name);

          existingPaths.push(relativePath);

          if(this.nodeCache.has(dirent.name)) {
            const reusedNode: TNode = this.nodeCache.get(dirent.name)!;
            readNodes[
              (await reusedNode.wasModified())
                ? "changed"
                : "unchanged"
            ].push(reusedNode);

            return;
          }

          const absolutePath: string = await path.join(this.rootPath, relativePath);
          readNodes.changed.push(
            (await fs.stat(absolutePath)).isDirectory
              ? new DirectoryNode(this.rootPath, relativePath)
              : new FileNode(this.rootPath, relativePath)
          );
        })
    );

    const deleted: TNode[] = [];
    this.nodeCache
      .forEach((_, path: string) => {
        if(existingPaths.includes(path)) return;

        deleted.push(this.nodeCache.get(path)!);

        this.nodeCache.delete(path);
      });

    return readNodes;
  }

  public async traverse(cb: (readNodes: TReadNodes) => void, recursive: boolean = false) {
    const readNodes: TReadNodes = await this.readNodes();

    await cb(readNodes);

    if(!recursive) return;

    [...readNodes.changed, ...readNodes.unchanged]
      .filter((node: TNode) => node instanceof DirectoryNode)
      .forEach((directory: DirectoryNode) => directory.traverse(cb));
  }

  public get cachedPaths(): string[] {
    return Object.keys(this.nodeCache);
  }
}

export class FileNode extends ANode {
  public async read(): Promise<string> {
    return fs.readFile(await this.getAbsolutePath());
  }
}
