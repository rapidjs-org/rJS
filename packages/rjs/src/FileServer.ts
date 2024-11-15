import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

import { TJSON } from "./.shared/global.types";
import { Options } from "./.shared/Options";

import { IServerEnv, Server, TLSRedirectServer } from "@rapidjs.org/rjs-server";

import _config from "./_config.json";

export function createFileServer(
    options?: Partial<IServerEnv>
): Promise<FileServer> {
    return new Promise((resolve) => {
        const server: FileServer = new FileServer(options);
        server.on("online", () => resolve(server));
    });
}

function readJsonConfig<T extends object>(
    name: string,
    rootPath?: string
): T | null {
    const configFilePath: string = resolve(
        rootPath ?? process.cwd(),
        `${name}.json`
    );

    return existsSync(configFilePath)
        ? (JSON.parse(readFileSync(configFilePath).toString()) as T)
        : null;
}

function mergeEnvWithDefaults(env?: Partial<IServerEnv>): IServerEnv {
    const isSecure: boolean = !!(env.tls ?? {}).cert;
    return new Options<IServerEnv>(env ?? {}, {
        cwd: env.cwd ?? process.cwd(),
        apiDirPath: _config.apiDirName,
        sourceDirPath: _config.pluginDirName,
        publicDirPath: _config.publicDirName,
        port: !env.dev ? (isSecure ? 443 : 80) : 7777
    }).object;
}

export class FileServer extends Server {
    constructor(env?: Partial<IServerEnv>) {
        super(
            (() => {
                const envWithDefaults: IServerEnv = mergeEnvWithDefaults(env);
                const isSecure: boolean = !!(
                    envWithDefaults.tls && envWithDefaults.tls.cert
                );

                isSecure &&
                    envWithDefaults.port === 443 &&
                    new TLSRedirectServer();

                return envWithDefaults;
            })(),
            readJsonConfig<TJSON>(_config.configName, env.cwd),
            (() => {
                const envWithDefaults: IServerEnv = mergeEnvWithDefaults(env);

                return [
                    envWithDefaults.apiDirPath,
                    envWithDefaults.sourceDirPath,
                    envWithDefaults.publicDirPath,
                    _config.configName,
                    _config.deployConfigName
                ].concat(
                    readJsonConfig<string[]>(
                        _config.deployConfigName,
                        env.cwd
                    ) ?? []
                );
            })()
        );
    }
}
