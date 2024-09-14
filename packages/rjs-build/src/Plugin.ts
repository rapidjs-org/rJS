import { Dirent, existsSync, readFileSync, readdir } from "fs";
import { join, resolve as resolvePath } from "path";

import { TJSON } from "./.shared/global.types";
import { AFilesystemNode } from "./AFilesystemNode";
import { Filesystem } from "./Filesystem";
import { Directory } from "./Directory";
import { File } from "./File";

import _config from "./_config.json";


type TBuildInterfaceCallable = (api: {
    Directory: typeof Directory;
    File: typeof File;
}, filesystem: Filesystem, configOptions: TJSON, specificOptions: {
    [ key: string ]: unknown;
}) => AFilesystemNode|AFilesystemNode[];

export class Plugin<O extends { [ key: string ]: unknown; }> {
    public static isPluginDirectory(pluginDirectoryPath: string): boolean {
        try {
            require.resolve(join(pluginDirectoryPath, _config.buildModuleName));
        } catch {
            return false;
        }
        return true;
    }
    
    private readonly pluginDirectoryPath: string;

    constructor(pluginDirectoryPath: string) {
        this.pluginDirectoryPath = pluginDirectoryPath;
    }

    private resolveBuildConfigPath(): string {
        return resolvePath(join(this.pluginDirectoryPath, `${_config.buildConfigName}.json`));
    }

    private fetchBuildConfig(): TJSON {
        const buildConfigPath: string = this.resolveBuildConfigPath();
        delete require.cache[buildConfigPath];
        return existsSync(buildConfigPath)
        ? require(buildConfigPath)
        : {};
    }

    private resolveBuildModulePath(): string {
        const buildConfig: TJSON = this.fetchBuildConfig();
        const buildModuleReferences: string[] = [
            join(this.pluginDirectoryPath, _config.buildModuleName),
            buildConfig[_config.buildModuleReferenceKey] as string
        ];
        let buildModulePath: string;
        while(!buildModulePath && buildModuleReferences.length) {
            try {
                buildModulePath = require.resolve(buildModuleReferences.shift());
            } catch {}
        }
        if(!buildModulePath) throw new ReferenceError("Build module not found");

        return buildModulePath;
    }

    private async fetchBuildInterface(): Promise<TBuildInterfaceCallable> {
        const buildModulePath: string = this.resolveBuildModulePath();

        delete require.cache[buildModulePath];

        const buildInterface
        : TBuildInterfaceCallable|Promise<TBuildInterfaceCallable> = require(buildModulePath);  // TODO: ESM
        return await (
            !(buildInterface instanceof Promise)
            ? Promise.resolve(buildInterface)
            : buildInterface
        );
    }

    private fetchFilesystem(relativePath: string = "."): Promise<Directory> {
        return new Promise((resolve, reject) => {
            readdir(join(this.pluginDirectoryPath, relativePath), {
                withFileTypes: true
            }, async (err: Error, dirents: Dirent[]) => {
                if(err) {
                    reject(err);

                    return;
                }

                const fileNodes: AFilesystemNode[] = [];
                for(const dirent of dirents
                    .filter((dirent: Dirent) => dirent.isDirectory() || dirent.isFile())
                    .filter((dirent: Dirent) => {
                        return (resolvePath(relativePath) !== resolvePath("."))
                            || ![
                                this.resolveBuildConfigPath(),
                                this.resolveBuildModulePath()
                            ].includes(
                                resolvePath(join(this.pluginDirectoryPath, relativePath, dirent.name))
                            );
                    })
                ) {
                    const relativeChildPath: string = join(relativePath, dirent.name);
                    fileNodes.push(
                        dirent.isDirectory()
                        ? await this.fetchFilesystem(relativeChildPath)
                        : new File(relativeChildPath, readFileSync(join(this.pluginDirectoryPath, relativeChildPath)).toString())
                    );
                }

                resolve(new Directory(relativePath, fileNodes));
            });
        });
    }

    public async apply(options?: O): Promise<AFilesystemNode[]> {
        return [
            (await this.fetchBuildInterface())(
                {
                    Directory, File
                },
                new Filesystem((await this.fetchFilesystem()).fileNodes),
                (this.fetchBuildConfig().options ?? {}) as TJSON,
                options
            )
        ].flat();
    }
} 