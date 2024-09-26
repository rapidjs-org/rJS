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

	constructor(modulesDirectoryPath: string) {
		this.rpcFilePath = modulesDirectoryPath;

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
            .forEach(async (dirent: Dirent) => {
            	const routeModulePath: string = join(
            		dirent.parentPath,
            		dirent.name
            	).replace(JS_EXTENSION_REGEX, "");

            	this.modules.set(
            		routeModulePath.slice(this.rpcFilePath.length),
            		await new ModuleDependency<TRpcModule>(
            			routeModulePath
            		).import()
            	);
            });
	}

	public hasEndpoint(modulePath: string, memberName: string): boolean {
		return !!(this.modules.get(modulePath) ?? {})[memberName];
	}

	public invokeEndpoint(modulePath: string, memberName: string): TRpcMember {
		return this.modules.get(modulePath)[memberName];
	}
}
