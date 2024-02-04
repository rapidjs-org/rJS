import { existsSync, readFileSync, writeFileSync, rmSync, statSync } from "fs";
import { join, normalize } from "path";
import { IFilestamp } from "../interfaces";
import { ASharedMemory } from "./sharedmemory/ASharedMemory";
import { Context } from "../common/Context";


export class VFS extends ASharedMemory<IFilestamp> {
	private readonly rootPath: string;

	constructor(relativeRootPath: string = "./") {
		super(relativeRootPath);

		this.validatePath(relativeRootPath);

		this.rootPath = join(process.cwd(), relativeRootPath);
	}

	private validatePath(relativePath: string) {
		if(/^\.\.\//.test(normalize(relativePath))) {
			throw new RangeError("Attempt to access protected directory superordinate to the VFS root");
		}
	}

	private getAbsolutePath(relativePath: string): string {
		return join(this.rootPath, relativePath);
	}
	
	public write(relativePath: string, data: string): IFilestamp {
		this.validatePath(relativePath);

		const filestamp = {
			data: data,
			eTag: Date.now().toString()
		};
		
		this.writeSHM(relativePath, filestamp);

		return filestamp;
	}

	public writeDisc(relativePath: string, data: string): IFilestamp {
		writeFileSync(this.getAbsolutePath(relativePath), data);

		return this.write(relativePath, data);
	}
	
	public read(relativePath: string): IFilestamp {
		const absolutePath: string = this.getAbsolutePath(relativePath);
		const filestamp: IFilestamp = this.readSHM(relativePath);

		if(filestamp) return filestamp;
		if(!this.exists(relativePath)) return null;

		const data: string = readFileSync(absolutePath).toString();

		return this.write(relativePath, data);
	}
	
	public exists(relativePath: string): boolean {
		this.validatePath(relativePath);

		return existsSync(this.getAbsolutePath(relativePath));
	}
	
	public isDirectory(relativePath: string): boolean {
		return this.exists(relativePath)
		&& statSync(this.getAbsolutePath(relativePath)).isDirectory();
	}

	public deleteDisc(relativePath: string) {
		this.freeSHM(relativePath);

		rmSync(this.getAbsolutePath(relativePath));
	}
}