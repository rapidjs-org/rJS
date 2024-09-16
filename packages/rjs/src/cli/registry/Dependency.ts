import { EventEmitter } from "events";
import { execSync } from "child_process";

import { Update } from "../Update";

export class Dependency extends EventEmitter {
	// TODO: Eventually work "lazy" on project level
	packageReference: string;

	constructor(packageReference: string /* , majorVersion?: number */) {
		super();

		this.packageReference = packageReference;

		process.on("exit", () => {
			Update.isAvailable(this.packageReference) && new Update(this.packageReference);
		});
	}

	installIfNotPresent(): Promise<this> {
		return new Promise((resolve, reject) => {
			try {
				execSync(`npm list ${this.packageReference}`, {
					cwd: __dirname
				});

				resolve(this);

				return;
			} catch {}

			try {
				execSync(`npm install ${this.packageReference}@latest`);
			} catch (err) {
				reject(err);
			}

			resolve(this);
		});
	}

	require<T>(): Promise<T> {
		return import(this.packageReference) as Promise<T>;
	}
}
