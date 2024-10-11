import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

import { TJSON } from "./.shared/global.types";
import { Options } from "./.shared/Options";

import { IServerEnv, Server } from "@rapidjs.org/rjs-server";

import _config from "./_config.json";

export function createFileServer(
    options: Partial<IServerEnv>
): Promise<FileServer> {
    return new Promise((resolve) => {
        const server: FileServer = new FileServer(options);
        server.on("online", () => resolve(server));
    });
}

export class FileServer extends Server {
    constructor(options?: Partial<IServerEnv>) {
        super(
            new Options<IServerEnv>(options, {
                apiDirPath: _config.apiDirName,
                pluginDirPath: _config.pluginDirName,
                publicDirPath: _config.publicDirName,
                port: !options.dev ? (!options.tls ? 80 : 443) : 7777
            }).object,
            (() => {
                const configFilePath: string = resolve(
                    options.cwd ?? process.cwd(),
                    [_config.configNamePrefix, _config.configNameInfix, "json"]
                        .filter((part: string | null) => !!part)
                        .join(".")
                );

                return existsSync(configFilePath)
                    ? (JSON.parse(
                          readFileSync(configFilePath).toString()
                      ) as TJSON)
                    : {};
            })()
        );
    }
}
