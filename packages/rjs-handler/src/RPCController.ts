import { Dirent, existsSync, readdirSync } from "fs";
import { resolve, join } from "path";

import { TSerializable } from "./.shared/global.types";


export type TRpcMember = (() => TSerializable)|TSerializable;
export type TRpcModule = { [ member: string ]: TRpcMember; };


const JS_EXTENSION_REGEX = /\.(js|javascript)$/i;	// TODO: TS

export class RPCController {
	private readonly modules: Map<string, TRpcModule> = new Map();

    constructor(modulesDirectoryPath: string) {
		const rpcFilePath: string = resolve(modulesDirectoryPath);
		existsSync(rpcFilePath)
		&& readdirSync(rpcFilePath, {
			recursive: true,
			withFileTypes: true
		})
		.filter((dirent: Dirent) => dirent.isFile())
		.filter((dirent: Dirent) => JS_EXTENSION_REGEX.test(dirent.name))
		.forEach((dirent: Dirent) => {
			const routeModulePath: string = join(dirent.parentPath, dirent.name).replace(JS_EXTENSION_REGEX, "");
			
			this.modules.set(routeModulePath.slice(rpcFilePath.length), require(routeModulePath));
		});
    }

	public hasEndpoint(modulePath: string, memberName: string): boolean {
		return !!(this.modules.get(modulePath) ?? {})[memberName];
	}
	
	public invokeEndpoint(modulePath: string, memberName: string): TRpcMember {
			return this.modules.get(modulePath)[memberName];
	}
}