import { statSync, readFileSync, writeFileSync, rmSync } from "fs";
import { join, normalize } from "path";
import { IFilestamp } from "../interfaces";
import { ASharedMemory } from "./sharedmemory/ASharedMemory";


export class VFS extends ASharedMemory<IFilestamp> {
	private readonly rootPath: string;

	constructor(relativeRootPath: string = "./") {
		super(join(process.cwd(), relativeRootPath));

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

	private getETag(absolutePath: string): string {
		return Math.max(
			statSync(absolutePath).ctime.getDate(),
			statSync(absolutePath).mtime.getDate()
		).toString();
	}

	public read(relativePath: string): IFilestamp {
		const filestamp: IFilestamp = this.readSHM(relativePath);
		
		if(filestamp) return filestamp;

		this.validatePath(relativePath);

		const absolutePath: string = this.getAbsolutePath(relativePath);

		const data: Buffer = readFileSync(absolutePath);
		const eTag: string = this.getETag(relativePath);

		return { data, eTag };
	}

	public write(relativePath: string, data: string|Buffer): IFilestamp {
		this.validatePath(relativePath);
		
		this.writeSHM(relativePath, {
			data: Buffer.isBuffer(data) ? data : Buffer.from(data, "utf-8"),
			eTag: Date.now().toString()
		});

		return this.read(relativePath);
	}

	public writeDisc(relativePath: string, data: string|Buffer): IFilestamp {
		const filestamp: IFilestamp = this.write(relativePath, data);
		
		writeFileSync(this.getAbsolutePath(relativePath), data);

		return filestamp;
	}

	public deleteDisc(relativePath: string) {
		rmSync(this.getAbsolutePath(relativePath));
		
		this.freeSHM(relativePath);
	}
}