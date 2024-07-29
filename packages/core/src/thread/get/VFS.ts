import { existsSync, readFileSync, statSync } from "fs";
import { resolve, join, normalize } from "path";

import { IFilestamp } from "../../interfaces";
import { Cache } from "../../Cache";


export class VFS {
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
	
	public read(relativePath: string): IFilestamp {
		if(this.cache.has(relativePath)) return this.cache.get(relativePath);

		this.validatePath(relativePath);

		const absolutePath: string = this.getAbsolutePath(relativePath);
		
		const data: string = readFileSync(absolutePath).toString();

		const filestamp = {
			data: data,
			eTag: Date.now().toString()
		};
		
		this.cache.set(relativePath, filestamp);

		return filestamp;
	}
	
	public exists(relativePath: string): boolean {
		this.validatePath(relativePath);
		
		return existsSync(this.getAbsolutePath(relativePath));
	}
	
	public isFile(relativePath: string): boolean {
		return statSync(this.getAbsolutePath(relativePath)).isFile();
	}
}