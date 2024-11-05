import { resolve, join, dirname } from "path";
import { existsSync, mkdir, rmSync, writeFile } from "fs";

import { Options } from "./.shared/Options";

import { Build, Directory, File } from "@rapidjs.org/rjs-build";

import _config from "./_config.json";

export interface IFileEmitterOptions {
    cwd: string;
    sourceDirPath: string;
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
            sourceDirPath: _config.pluginDirName[0],
            publicDirPath: _config.publicDirName
        }).object;

        const sourceDirPath: string = resolve(
            optionsWithDefaults.sourceDirPath
        );
        if (!existsSync(sourceDirPath)) {
            throw new ReferenceError(
                `Source directory not found ${sourceDirPath}`
            );
        }

        this.build = new Build(sourceDirPath, optionsWithDefaults.dev);
        this.publicRootPath = resolve(
            optionsWithDefaults.cwd,
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
                    err
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
        rmSync(this.publicRootPath, {
            recursive: true,
            force: true
        });

        const publicFiles: Directory = await this.build.retrieveAll();

        for (const node of publicFiles.nodes) {
            await this.renderFileNode(node as Directory | File);
        }

        return publicFiles;
    }
}
