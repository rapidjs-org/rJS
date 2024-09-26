import { AFilesystemNode } from "./AFilesystemNode";

export class File extends AFilesystemNode {
	public readonly contents?: Buffer | string;

	constructor(relativePath: string, contents?: Buffer | string) {
		super(relativePath);

		this.contents = contents;
	}
}
