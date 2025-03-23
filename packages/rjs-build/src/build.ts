import { fs, path } from "@rapidjs.org/adapters";

import { type TReadNodes, ENodeType, DirectoryNode, FileNode, TNode } from "./Node.js";

import _config from "./_config.json" with { type: "json" };

export type TPathMap = Map<string, TNode>;
export type TBuild = Build;

class Build {
  private rootNode?: DirectoryNode;
  private pubDirPath?: string;

  private getAbsolutePath(relativePath: string): Promise<string> {
    return path.join(this.pubDirPath, relativePath);
  }

  private async handleContextLevel(contextDirNode: DirectoryNode, emitFiles: boolean) {
    // TODO: Return TPathMap
    await contextDirNode
      .traverse((readNodes: TReadNodes) => {
        [ ...readNodes.changed, ...readNodes.unchanged ]
          .forEach(async (existingNode: TNode) => {
            if(await existingNode.getType() === ENodeType.PRIVATE) return;

            if(!emitFiles) return;

            const absolutePath: string = await this.getAbsolutePath(await existingNode.getPath());
            (existingNode instanceof FileNode)
              ? await fs.writeFile(absolutePath, await existingNode.read())
              : await fs.mkdir(absolutePath, {
                recursive: true
              });
          });

        if(!emitFiles) return;

        readNodes.deleted
          .forEach(async (deletedNode: TNode) => {
            if(await deletedNode.getType() === ENodeType.PRIVATE) return;

            await fs.rm(await this.getAbsolutePath(await deletedNode.getPath()), {
              recursive: true
            });
          });
      });
  }

  public async build(emitFiles: boolean = false): Promise<TPathMap> {
    const pathMap: TPathMap = new Map();

    await this.rootNode
      .traverse((readNodes: TReadNodes) => {
        [ ...readNodes.changed, ...readNodes.unchanged ]
          .filter((existingNode: TNode) => existingNode instanceof DirectoryNode)
          .forEach((contextDirNode: DirectoryNode) => this.handleContextLevel(contextDirNode, emitFiles));

        if(!emitFiles) return;

        readNodes.deleted
          .filter((deletedNode: TNode) => deletedNode instanceof DirectoryNode)
          .forEach((deletedNode: DirectoryNode) => {
            deletedNode.cachedPaths
            .forEach(async (cachedPath: string) => {
                await fs.rm(cachedPath, {
                  recursive: true
                })
              })
          });
    }, true);

    return pathMap;
  }

  public async create(srcDirPath?: string, pubDirPath?: string): Promise<this> {
    srcDirPath = await path.resolve(srcDirPath ?? _config.defaultSourcePath);
    pubDirPath = await path.resolve(pubDirPath ?? _config.defaultPublicPath);

    this.rootNode = new DirectoryNode(srcDirPath,  ".");
    this.pubDirPath = pubDirPath;

    return this;
  }

  public async initEmit(): Promise<void> {
    (await fs.exists(this.pubDirPath) && !(await fs.stat(this.pubDirPath)).isDirectory)
      && await fs.rm(this.pubDirPath, {
      recursive: true
    });

    await fs.mkdir(this.pubDirPath, {
      recursive: true
    });
  }
}

export function createBuild(srcDirPath?: string, pubDirPath?: string): Promise<Build> {
  return (new Build())
    .create(srcDirPath, pubDirPath);
}