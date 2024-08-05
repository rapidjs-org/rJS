import { EventEmitter } from "events";

import { Update } from "./Update";


export class Dependency extends EventEmitter {
	packageReference: string;

	constructor(packageReference: string, majorVersion?: number) {
		super();
		
		this.packageReference = packageReference;

		process.on("exit", () => {
			Update.isAvailable(this.packageReference)
			&& new Update(this.packageReference);
		});
	}

	installIfNotPresent(): Promise<this> {
		return new Promise((resolve, reject) => {
			// TODO: Prompt
			
			resolve(this);
		});
	}

	require<T>(): Promise<T> {
		return import(this.packageReference);
	}
}