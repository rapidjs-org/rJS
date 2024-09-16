import { existsSync, readFile, readFileSync, statSync } from "fs";
import { resolve, join, normalize } from "path";
import { Cache } from "./Cache";

import { Build, File } from "@rapidjs.org/rjs-build";

import _config from "./_config.json";


export interface IFilestamp {
	data: Buffer|string;
	eTag: string;
}

export class VirtualFileSystem {
	private readonly publicRootPath: string;
	private readonly cache: Cache<string, IFilestamp> = new Cache(86400000);	// dev

	private readonly buildInterface?: Build<{}>;

	constructor(publicRootPath: string, privateRootPath?: string) {
		this.publicRootPath = resolve(publicRootPath);
		
		if(!existsSync(this.publicRootPath)) {
			throw new SyntaxError(`Missing virtual file system root ${this.publicRootPath}`);
		}

		if(!privateRootPath
		|| !existsSync(resolve(privateRootPath))) return;
		
		this.buildInterface = new Build(resolve(privateRootPath));
	}

	private getAbsolutePath(relativePath: string): string {
		return join(this.publicRootPath, relativePath);
	}

	private load(relativePath: string, data: Buffer|string): IFilestamp {
		if(/^\.\.\//.test(normalize(relativePath))) {
			throw new RangeError("Attempt to access protected directory superordinate to the VFS root");
		}

		const filestamp = {
			data: data,
			eTag: Date.now().toString()	// Stable across single runtime
		};
		
		this.cache.set(relativePath, filestamp);
		
		return filestamp;
	}
	
	public read(relativePath: string): Promise<IFilestamp> {
		return new Promise(async (resolve, reject) => {
			if(this.cache.has(relativePath)) {
				resolve(this.cache.get(relativePath));

				return;
			}
			
			const absolutePath: string = this.getAbsolutePath(relativePath);
			if(existsSync(absolutePath)) {
				readFile(absolutePath, (err: Error, data: Buffer) => {
					!err
					? resolve(this.load(relativePath, data))
					: reject(err);
				});

				return;
			}
			
			const builtFile = this.buildInterface
			? await this.buildInterface.retrieve(relativePath) as File
			: null;
			
			resolve(
				builtFile
				? this.load(relativePath, builtFile.contents)
				: null
			);	
		});
	}
	
	public writeVirtual(relativePath: string, data: Buffer|string): IFilestamp {
		return this.load(relativePath, data);
	}
}