import {
    Dirent,
    existsSync,
    lstatSync,
    readFileSync,
    readdir,
    readdirSync
} from "fs";
import { join, resolve as resolvePath } from "path";

import { TJSON } from "./.shared/global.types";
import { ModuleDependency } from "./.shared/ModuleDependency";
import { AFilesystemNode } from "./AFilesystemNode";
import { Filesystem } from "./Filesystem";
import { Directory } from "./Directory";
import { File } from "./File";

import _config from "./_config.json";

type TBuildInterfaceCallable = (
    api: {
        Directory: typeof Directory;
        File: typeof File;
        Filesystem: typeof Filesystem;
    },
    filesystem: Filesystem,
    configOptions: TJSON,
    dev: boolean
) => (Directory | File)[];

// TODO: Access to public files (static); e.g. for sitemap plugin?
export class Plugin {
    public static isPluginDirectory(pluginDirectoryPath: string): boolean {
        try {
            require.resolve(join(pluginDirectoryPath, _config.buildModuleName));
        } catch {
            return false;
        }
        return true;
    }

    private readonly dev: boolean;

    private lastApplyTimestamp: number = -Infinity;
    private lastApplyResult: (File | Directory)[];

    public readonly pluginDirectoryPath: string;

    constructor(pluginDirectoryPath: string, dev: boolean) {
        this.dev = dev;
        this.pluginDirectoryPath = pluginDirectoryPath;
    }

    private resolveBuildConfigPath(): string {
        return resolvePath(
            join(this.pluginDirectoryPath, `${_config.buildConfigName}.json`)
        );
    }

    private fetchBuildConfig(): TJSON {
        const buildConfigPath: string = this.resolveBuildConfigPath();
        const buildConfig: TJSON = existsSync(buildConfigPath)
            ? (JSON.parse(readFileSync(buildConfigPath).toString()) as TJSON)
            : {};
        return buildConfig;
    }

    private resolveBuildModulePath(): string {
        const buildConfig: TJSON = this.fetchBuildConfig();
        const buildModuleReferences: string[] = [
            join(this.pluginDirectoryPath, _config.buildModuleName),
            buildConfig[_config.buildModuleReferenceKey] as string
        ];

        let buildModulePath: string;
        while (!buildModulePath && buildModuleReferences.length) {
            const buildModuleReference: string = buildModuleReferences.shift();
            if (!buildModuleReference) continue;
            try {
                buildModulePath = require.resolve(buildModuleReference);
            } catch {}
        }

        if (!buildModulePath || /\.json$/.test(buildModulePath)) return null;

        return buildModulePath;
    }

    private async fetchBuildInterface(): Promise<TBuildInterfaceCallable> {
        const buildModulePath: string = this.resolveBuildModulePath();

        return buildModulePath
            ? await new ModuleDependency<TBuildInterfaceCallable>(
                  buildModulePath
              ).import()
            : () => [];
    }

    private fetchDirectory(relativePath: string = "."): Promise<Directory> {
        return new Promise((resolve, reject) => {
            readdir(
                join(this.pluginDirectoryPath, relativePath),
                {
                    withFileTypes: true
                },
                async (err: Error, dirents: Dirent[]) => {
                    if (err) {
                        reject(err);

                        return;
                    }

                    const fileNodes: AFilesystemNode[] = [];
                    for (const dirent of dirents
                        .filter(
                            (dirent: Dirent) =>
                                dirent.isDirectory() || dirent.isFile()
                        )
                        .filter((dirent: Dirent) => {
                            return (
                                resolvePath(relativePath) !==
                                    resolvePath(".") ||
                                ![
                                    this.resolveBuildConfigPath(),
                                    this.resolveBuildModulePath()
                                ].includes(
                                    resolvePath(
                                        join(
                                            this.pluginDirectoryPath,
                                            relativePath,
                                            dirent.name
                                        )
                                    )
                                )
                            );
                        })) {
                        const relativeChildPath: string = join(
                            relativePath,
                            dirent.name
                        );
                        fileNodes.push(
                            dirent.isDirectory()
                                ? await this.fetchDirectory(relativeChildPath)
                                : new File(
                                      relativeChildPath,
                                      readFileSync(
                                          join(
                                              this.pluginDirectoryPath,
                                              relativeChildPath
                                          )
                                      ).toString()
                                  )
                        );
                    }

                    resolve(new Directory(relativePath, fileNodes));
                }
            );
        });
    }

    private applyResults(): Promise<(File | Directory)[]> {
        return new Promise(async (resolve) => {
            const applicationResults:
                | (File | Directory)[]
                | Promise<(File | Directory)[]> = (
                await this.fetchBuildInterface()
            )(
                {
                    Directory,
                    File,
                    Filesystem
                },
                new Filesystem(
                    this.pluginDirectoryPath,
                    (await this.fetchDirectory()).fileNodes
                ),
                (this.fetchBuildConfig().config ?? {}) as TJSON,
                this.dev
            );

            this.lastApplyTimestamp = Date.now();
            this.lastApplyResult = [
                applicationResults instanceof Promise
                    ? await applicationResults
                    : applicationResults
            ].flat() as (Directory | File)[];

            resolve(this.lastApplyResult);
        });
    }

    public async apply(): Promise<(File | Directory)[]> {
        // TODO: Intermediate /tmp files?
        if (!this.dev && this.lastApplyResult) return this.lastApplyResult;

        for (const filepath of readdirSync(this.pluginDirectoryPath, {
            recursive: true
        })) {
            if (
                this.lastApplyTimestamp >
                lstatSync(join(this.pluginDirectoryPath, filepath.toString()))
                    .mtimeMs
            )
                continue;

            return await this.applyResults();
        }

        return this.lastApplyResult ?? [];
    }
}
