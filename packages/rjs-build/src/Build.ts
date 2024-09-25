import { Dirent, existsSync, readdirSync } from "fs";
import { join, resolve } from "path";

import { AFilesystemNode } from "./AFilesystemNode";
import { Directory } from "./Directory";
import { File } from "./File";
import { Filemap } from "./Filemap";
import { Plugin } from "./Plugin";


export enum EBuildFilter {
    ALL,
    FILE,
    DIRECTORY
}

export class Build<O extends { [ key: string ]: unknown; }> {
    private readonly outpathMap: Map<string, Plugin<O>> = new Map();
    private readonly privateDirectoryPath: string;

    private private: Plugin<O>[] = [];

    constructor(privateDirectoryPath: string) {
        this.privateDirectoryPath = resolve(privateDirectoryPath);
        
        if(!existsSync(this.privateDirectoryPath)) {
            throw new ReferenceError(`Private file directory does not exist ${this.privateDirectoryPath}`);
        }
    }

    private normalizeRelativePath(relativePath: string): string {
        return resolve(`./${relativePath}`);
    }

    private async fetchPlugins() {
        this.private = readdirSync(this.privateDirectoryPath, {
            withFileTypes: true
        })
        .filter((dirent: Dirent) => dirent.isDirectory())
        .reduce((acc: Plugin<O>[], dirent: Dirent) => {
            return Plugin.isPluginDirectory(join(this.privateDirectoryPath, dirent.name))
            ? [
                ...acc,
                new Plugin(join(this.privateDirectoryPath, dirent.name))
            ]
            : acc;
        }, []);
    }

    public async retrieveAll(options?: O, filter: EBuildFilter = EBuildFilter.ALL): Promise<Filemap> {
        this.fetchPlugins();    // TODO: skip already loaded ones in prod?
        
        return new Filemap(
            await this.private
            .reduce(async (acc: Promise<AFilesystemNode[]>, plugin: Plugin<O>) => {
                const fileNodes: AFilesystemNode[] = await plugin.apply(options);
                
                fileNodes
                .forEach((fileNode: AFilesystemNode) => {
                    this.outpathMap
                    .set(this.normalizeRelativePath(fileNode.relativePath), plugin);
                });
                
                return [
                    ...await acc,
                    ...fileNodes
                    .filter((fileNode: AFilesystemNode) => {
                        switch(filter) {
                            case EBuildFilter.DIRECTORY:
                                return (fileNode instanceof Directory);
                            case EBuildFilter.FILE:
                                return (fileNode instanceof File);
                        }
                        return true;
                    })
                ];
            }, Promise.resolve([]))
        );
    }

    public async retrieve(relativePath: string, options?: O): Promise<AFilesystemNode|null> {
        const filterFilesystemNode = (fileNodes: AFilesystemNode[]): AFilesystemNode => {
            return fileNodes
            .filter((fileNode: AFilesystemNode) => {
                return this.normalizeRelativePath(fileNode.relativePath) === this.normalizeRelativePath(relativePath)
            })
            .pop();
        };
        
        if(!this.outpathMap.has(this.normalizeRelativePath(relativePath))) {
            return filterFilesystemNode((await this.retrieveAll()).fileNodes); 
        }
        
        const relatedPlugin: Plugin<O> = await this.outpathMap.get(this.normalizeRelativePath(relativePath));
        return relatedPlugin
        ? filterFilesystemNode(await relatedPlugin.apply(options))
        : null;
    }
}