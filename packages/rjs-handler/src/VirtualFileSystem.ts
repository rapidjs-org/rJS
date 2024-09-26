import { existsSync, readFile } from "fs";
import { join, normalize } from "path";
import { Cache } from "./Cache";
import { Config } from "./Config";

import { Build, Filemap, File } from "@rapidjs.org/rjs-build";

export interface IFilestamp {
    data: Buffer | string;
    eTag: string;
}

export class VirtualFileSystem {
    private readonly cache: Cache<string, IFilestamp>;

    private readonly publicRootPath?: string;
    private readonly buildInterface?: Build<null>;

    private privateFiles?: Filemap;

    constructor(
        config: Config,
        dev: boolean,
        publicRootPath?: string,
        pluginsRootPath?: string
    ) {
        this.cache = new Cache(
            !dev ? config.read("performance", "serverCacheMs").number() : 0
        );

        this.publicRootPath = publicRootPath ? publicRootPath : null;

        if (!pluginsRootPath || !existsSync(pluginsRootPath)) return;

        this.buildInterface = new Build(pluginsRootPath);

        !dev &&
            this.buildInterface.retrieveAll().then((privateFiles: Filemap) => {
                this.privateFiles = privateFiles;
            });
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

            const builtFile = (
                this.privateFiles
                    ? this.privateFiles.lookup(relativePath)
                    : this.buildInterface
                      ? await this.buildInterface.retrieve(relativePath)
                      : null
            ) as File;

            if (builtFile) {
                resolve(this.load(relativePath, builtFile.contents));

                return;
            }

            if (!this.publicRootPath) {
                resolve(null);

                return;
            }

            const absolutePath: string = join(
                this.publicRootPath,
                relativePath
            );
            existsSync(absolutePath)
                ? readFile(absolutePath, (err: Error, data: Buffer) => {
                      !err
                          ? resolve(this.load(relativePath, data))
                          : reject(err);
                  })
                : resolve(null);
        });
    }

    public writeVirtual(
        relativePath: string,
        data: Buffer | string
    ): IFilestamp {
        return this.load(relativePath, data);
    }
}
