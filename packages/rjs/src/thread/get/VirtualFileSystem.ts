import { existsSync, readFileSync, statSync } from "fs";
import { resolve, join, normalize } from "path";

import { IFilestamp } from "../../interfaces";
import { Cache } from "../../Cache";


export class VirtualFileSystem {
	private readonly rootPath: string;
	private readonly cache: Cache<string, IFilestamp> = new Cache(86400000);

	constructor(rootPath: string = "./") {
		// TODO: Warn on absolute root path arg?

		this.rootPath = resolve(rootPath);
	}

	private validatePath(relativePath: string) {
		if(/^\.\.\//.test(normalize(relativePath))) {
			throw new RangeError("Attempt to access protected directory superordinate to the VFS root");
		}
	}

	private getAbsolutePath(relativePath: string): string {
		return join(this.rootPath, relativePath);
	}

	private load(relativePath: string, data: Buffer|string): IFilestamp {
		this.validatePath(relativePath);

		const filestamp = {
			data: data,
			eTag: Date.now().toString()	// Stable across single runtime
		};
		
		this.cache.set(relativePath, filestamp);

		return filestamp;
	}
	
	public read(relativePath: string): IFilestamp {
		if(this.cache.has(relativePath)) return this.cache.get(relativePath);

		const absolutePath: string = this.getAbsolutePath(relativePath);
		
		return this.load(relativePath, readFileSync(absolutePath));
	}

	public writeVirtual(relativePath: string, data: Buffer|string): IFilestamp {
		return this.load(relativePath, data);
	} 
	
	public exists(relativePath: string): boolean {
		this.validatePath(relativePath);
		
		return existsSync(this.getAbsolutePath(relativePath));
	}
	
	public isFile(relativePath: string): boolean {
		return statSync(this.getAbsolutePath(relativePath)).isFile();
	}
}