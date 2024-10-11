import { existsSync, readFile } from "fs";
import { join, normalize } from "path";

import { Cache } from "./Cache";
import { TypeResolver } from "./TypeResolver";

import { Build, Directory, File } from "@rapidjs.org/rjs-build";

export interface IFilestamp {
    data: Buffer | string;
    eTag: string;
}

export class VirtualFileSystem {
    private readonly cache: Cache<string, IFilestamp>;

    private readonly publicRootPath?: string;
    private readonly buildInterface?: Build;
    private readonly preretrieval: Promise<void>;

    private privateFiles?: Directory;

    constructor(
        config: TypeResolver,
        dev: boolean,
        publicRootPath?: string,
        pluginsRootPath?: string
    ) {
        this.cache = new Cache(
            !dev ? config.read("performance", "serverCacheMs").number() : 0
        );

        this.publicRootPath = publicRootPath ? publicRootPath : null;

        if (!pluginsRootPath || !existsSync(pluginsRootPath)) return;

        this.buildInterface = new Build(pluginsRootPath, dev);

        this.preretrieval = !dev
            ? new Promise((resolve) => {
                  this.buildInterface
                      .retrieveAll()
                      .then((privateFiles: Directory) => {
                          this.privateFiles = privateFiles;

                          resolve();
                      });
              })
            : Promise.resolve();
    }

    private load(relativePath: string, data: Buffer | string): IFilestamp {
        if (/^\.\.\//.test(normalize(relativePath))) {
            throw new RangeError(
                "Attempt to access protected directory superordinate to the VFS root"
            );
        }

        const filestamp = {
            data: data,
            eTag: Date.now().toString() // Stable across single runtime
        };

        this.cache.set(relativePath, filestamp);

        return filestamp;
    }

    public read(relativePath: string): Promise<IFilestamp> {
        return new Promise(async (resolve, reject) => {
            if (this.cache.has(relativePath)) {
                resolve(this.cache.get(relativePath));

                return;
            }

            if (this.publicRootPath) {
                const absolutePath: string = join(
                    this.publicRootPath,
                    relativePath
                );
                if (existsSync(absolutePath)) {
                    readFile(absolutePath, (err: Error, data: Buffer) => {
                        !err
                            ? resolve(this.load(relativePath, data))
                            : reject(err);
                    });

                    return;
                }
            }

            await this.preretrieval;

            const builtFile = (
                this.privateFiles
                    ? this.privateFiles.get(relativePath)
                    : this.buildInterface
                      ? await this.buildInterface.retrieve(relativePath)
                      : null
            ) as File; // TODO: Dev: Previously not found cache -> defer next retrieval?

            resolve(
                builtFile ? this.load(relativePath, builtFile.contents) : null
            );
        });
    }

    public writeVirtual(
        relativePath: string,
        data: Buffer | string
    ): IFilestamp {
        return this.load(relativePath, data);
    }
}
