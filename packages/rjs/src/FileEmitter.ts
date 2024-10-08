import { resolve, join, dirname } from "path";
import { existsSync, mkdir, writeFile } from "fs";

import { Options } from "./.shared/Options";

import { Build, Directory, File } from "@rapidjs.org/rjs-build";

import _config from "./_config.json";

export interface IFileEmitterOptions {
    cwd: string;
    pluginDirPath: string;
    publicDirPath: string;

    dev?: boolean;
}

export function createFileEmitter(
    options: Partial<IFileEmitterOptions>
): FileEmitter {
    return new FileEmitter(options);
}

export class FileEmitter {
    private readonly build: Build;
    private readonly publicRootPath: string;

    constructor(options: Partial<IFileEmitterOptions>) {
        const optionsWithDefaults: IFileEmitterOptions = new Options(options, {
            cwd: process.cwd(),
            pluginDirPath: _config.pluginDirName,
            publicDirPath: _config.publicDirName
        }).object;

        const pluginDirPath: string = resolve(
            optionsWithDefaults.pluginDirPath
        );
        if (!existsSync(pluginDirPath)) {
            throw new ReferenceError(
                `Plugins directory not found ${pluginDirPath}`
            );
        }

        this.build = new Build(pluginDirPath, optionsWithDefaults.dev);
        this.publicRootPath = join(
            resolve(optionsWithDefaults.cwd),
            optionsWithDefaults.publicDirPath
        );
    }

    private renderFile(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            mkdir(
                join(this.publicRootPath, dirname(file.relativePath)),
                {
                    recursive: true
                },
                (err: Error & { code: string }) => {
                    err && err.code !== "EEXIST"
                        ? reject(err)
                        : writeFile(
                              join(this.publicRootPath, file.relativePath),
                              file.contents,
                              (err: Error) => {
                                  err ? reject(err) : resolve();
                              }
                          );
                }
            );
        });
    }

    private async renderDirectory(directory: Directory): Promise<void> {
        const nodes: (Directory | File)[] = [];
        directory.traverse((fileNode: Directory | File) => {
            nodes.push(fileNode);
        });

        for (const node of nodes) {
            await this.renderFileNode(node);
        }
    }

    private async renderFileNode(fileNode: Directory | File): Promise<void> {
        return fileNode instanceof Directory
            ? await this.renderDirectory(fileNode)
            : await this.renderFile(fileNode);
    }

    public async emit(): Promise<Directory> {
        const publicFiles: Directory = await this.build.retrieveAll();

        for (const fileNode of publicFiles.nodes) {
            await this.renderFileNode(fileNode as Directory | File);
        }

        return publicFiles;
    }
}
