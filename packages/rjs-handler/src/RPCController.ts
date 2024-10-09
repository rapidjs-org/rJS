import { Dirent, existsSync, readdirSync } from "fs";
import { join } from "path";

import { TSerializable } from "./.shared/global.types";
import { ModuleDependency } from "./.shared/ModuleDependency";

export type TRpcCallableMember = (...args: unknown[]) => TSerializable;
export type TRpcMember = TRpcCallableMember | TSerializable;
export type TRpcModule = { [member: string]: TRpcMember };

const JS_EXTENSION_REGEX = /\.(js|javascript)$/i; // TODO: TS

export class RPCController {
    private readonly modules: Map<string, TRpcModule> = new Map();
    private readonly rpcFilePath: string;
    private readonly dev: boolean;

    constructor(modulesDirectoryPath: string, dev: boolean = false) {
        this.rpcFilePath = modulesDirectoryPath;
        this.dev = dev;

        // TODO: Debug reload
        this.load();
    }

    private load() {
        if (!existsSync(this.rpcFilePath)) return;

        readdirSync(this.rpcFilePath, {
            recursive: true,
            withFileTypes: true
        })
            .filter((dirent: Dirent) => dirent.isFile())
            .filter((dirent: Dirent) => JS_EXTENSION_REGEX.test(dirent.name))
            .forEach((dirent: Dirent) => {
                const routeModulePath: string = join(
                    dirent.parentPath,
                    dirent.name
                ).replace(JS_EXTENSION_REGEX, "");

                this.importModule(
                    routeModulePath.slice(this.rpcFilePath.length)
                );
            });
    }

    private async importModule(modulePath: string) {
        this.modules.set(
            modulePath,
            await new ModuleDependency<TRpcModule>(
                join(this.rpcFilePath, modulePath)
            ).import()
        );
    }

    public hasEndpoint(modulePath: string, memberName: string): boolean {
        return !!(this.modules.get(modulePath) ?? {})[memberName];
    }

    public async invokeEndpoint(
        modulePath: string,
        memberName: string
    ): Promise<TRpcMember> {
        await (this.dev ? this.importModule(modulePath) : Promise.resolve());

        return this.modules.get(modulePath)[memberName];
    }
}
