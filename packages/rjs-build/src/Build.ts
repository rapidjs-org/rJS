import { Dirent, readdirSync } from "fs";
import { join, normalize, resolve } from "path";

import { AFilesystemNode } from "./AFilesystemNode";
import { Directory } from "./Directory";
import { File } from "./File";
import { Plugin } from "./Plugin";

export enum EBuildFilter {
    ALL,
    FILE,
    DIRECTORY
}

export class Build {
    private readonly dev: boolean;
    private readonly outpathMap: Map<string, Plugin> = new Map();
    private readonly pluginDirectoryPath: string;
    private readonly plugins: Map<string, Plugin> = new Map();

    constructor(pluginDirectoryPath: string, dev?: boolean) {
        this.dev = !!dev;
        this.pluginDirectoryPath = pluginDirectoryPath;
    }

    private normalizeRelativePath(relativePath: string): string {
        return resolve(`./${relativePath}`);
    }

    private fetchPlugins() {
        const pluginDirectoryPaths: string[] = [];

        readdirSync(this.pluginDirectoryPath, {
            withFileTypes: true
        })
            .filter((dirent: Dirent) => dirent.isDirectory())
            .forEach((dirent: Dirent) => {
                const pluginDirectoryPath: string = normalize(
                    join(this.pluginDirectoryPath, dirent.name)
                );
                if (!Plugin.isPluginDirectory(pluginDirectoryPath)) return;
                pluginDirectoryPaths.push(pluginDirectoryPath);

                if (this.plugins.has(pluginDirectoryPath)) return;

                this.plugins.set(
                    pluginDirectoryPath,
                    new Plugin(
                        join(this.pluginDirectoryPath, dirent.name),
                        this.dev
                    )
                );
            });

        Array.from(this.plugins.keys()).forEach(
            (pluginDirectoryPath: string) => {
                if (pluginDirectoryPaths.includes(pluginDirectoryPath)) return;

                this.plugins.delete(pluginDirectoryPath);
            }
        );
    }

    public async retrieveAll(
        filter: EBuildFilter = EBuildFilter.ALL
    ): Promise<Directory> {
        this.fetchPlugins();

        return new Directory(
            ".",
            await Array.from(this.plugins.values()).reduce(
                async (acc: Promise<File[]>, plugin: Plugin) => {
                    const files: (Directory | File)[] = await plugin.apply();
                    files.forEach((fileNode: File) => {
                        this.outpathMap.set(
                            this.normalizeRelativePath(fileNode.relativePath),
                            plugin
                        );
                    });

                    return [
                        ...(await acc),
                        ...files.filter((file: File) => {
                            switch (filter) {
                                case EBuildFilter.DIRECTORY:
                                    return file instanceof Directory;
                                case EBuildFilter.FILE:
                                    return file instanceof File;
                            }
                            return true;
                        })
                    ];
                },
                Promise.resolve([] as File[])
            )
        );
    }

    public async retrieve(relativePath: string): Promise<File | null> {
        const filterFilesystemNode = (files: AFilesystemNode[]): File => {
            return files
                .filter((fileNode: File) => {
                    return (
                        this.normalizeRelativePath(fileNode.relativePath) ===
                        this.normalizeRelativePath(relativePath)
                    );
                })
                .pop() as File;
        };

        !this.outpathMap.has(this.normalizeRelativePath(relativePath)) &&
            (await this.retrieveAll()); // TODO: Always retrieve all for presuming new file?

        const relatedPlugin: Plugin = this.outpathMap.get(
            this.normalizeRelativePath(relativePath)
        );
        return relatedPlugin
            ? filterFilesystemNode(await relatedPlugin.apply())
            : null;
    }
}
