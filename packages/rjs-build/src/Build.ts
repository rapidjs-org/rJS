import { Dirent, readdirSync } from "fs";
import { join, resolve } from "path";

import { Options } from "./.shared/Options";
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
    private readonly pluginsDirectoryPath: string;

    private plugins: Plugin<O>[] = [];

    constructor(pluginsDirectoryPath: string) {
        this.pluginsDirectoryPath = resolve(pluginsDirectoryPath);
        
        this.fetchPlugins();
    }
    
    public async fetchPlugins() {
        this.plugins = readdirSync(this.pluginsDirectoryPath, {
            withFileTypes: true
        })
        .filter((dirent: Dirent) => dirent.isDirectory())
        .reduce((acc: Plugin<O>[], dirent: Dirent) => {
            return Plugin.isPluginDirectory(join(this.pluginsDirectoryPath, dirent.name))
            ? [
                ...acc,
                new Plugin(join(this.pluginsDirectoryPath, dirent.name))
            ]
            : acc;
        }, []);
    }
    
    public async apply(options?: O, filter: EBuildFilter = EBuildFilter.ALL): Promise<Filemap> {
        return new Filemap(
            await this.plugins
            .reduce(async (acc: Promise<AFilesystemNode[]>, plugin: Plugin<O>) => {
                const fileNodes: AFilesystemNode[] = await plugin.apply(options);
                
                fileNodes
                .forEach((fileNode: AFilesystemNode) => {
                    this.outpathMap
                    .set(resolve(fileNode.relativePath), plugin);
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

    public async reapply(relativeOutPath: string, options?: O): Promise<AFilesystemNode|null> {
        !this.outpathMap.has(resolve(relativeOutPath))
        && this.fetchPlugins();
        
        const relatedPlugin: Plugin<O> = await this.outpathMap.get(resolve(relativeOutPath));
        return relatedPlugin
        ? (await relatedPlugin.apply(options))
            .filter((fileNode: AFilesystemNode) => {
                return resolve(fileNode.relativePath) === resolve(relativeOutPath)
            })
            .pop()
        : null;
    }
}