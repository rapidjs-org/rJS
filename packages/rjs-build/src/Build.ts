import { Dirent, readdirSync } from "fs";
import { join, normalize, resolve } from "path";

import { Directory } from "./Directory";
import { File } from "./File";
import { Filemap } from "./Filemap";
import { Plugin } from "./Plugin";

export enum EBuildFilter {
    ALL,
    FILE,
    DIRECTORY
}

export class Build<O extends { [key: string]: unknown }> {
    private readonly dev: boolean;
    private readonly outpathMap: Map<string, Plugin<O>> = new Map();
    private readonly pluginDirectoryPath: string;
    private readonly plugins: Map<string, Plugin<O>> = new Map();

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
        options?: O,
        filter: EBuildFilter = EBuildFilter.ALL
    ): Promise<Filemap> {
        this.fetchPlugins();

        return new Filemap(
            await Array.from(this.plugins.values()).reduce(
                async (acc: Promise<File[]>, plugin: Plugin<O>) => {
                    const files: File[] = await plugin.apply(options);
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

    public async retrieve(
        relativePath: string,
        options?: O
    ): Promise<File | null> {
        const filterFilesystemNode = (files: File[]): File => {
            return files
                .filter((fileNode: File) => {
                    return (
                        this.normalizeRelativePath(fileNode.relativePath) ===
                        this.normalizeRelativePath(relativePath)
                    );
                })
                .pop();
        };

        !this.outpathMap.has(this.normalizeRelativePath(relativePath)) &&
            (await this.retrieveAll()); // TODO: Always retrieve all for presuming new file?

        const relatedPlugin: Plugin<O> = this.outpathMap.get(
            this.normalizeRelativePath(relativePath)
        );
        return relatedPlugin
            ? filterFilesystemNode(await relatedPlugin.apply(options))
            : null;
    }
}
